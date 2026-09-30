#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findReferences, loadRegistry, productDesignDir, registryPath, toolingDir, validStatuses, walk } from './governance.mjs';

const schemaPath = path.join(productDesignDir, '00-governance', 'decision-registry.schema.json');
const deferredPath = path.join(productDesignDir, '00-governance', 'deferred-topics.json');
const deferredSchemaPath = path.join(productDesignDir, '00-governance', 'deferred-topics.schema.json');
const roadmapPath = path.join(productDesignDir, '00-governance', 'design-roadmap.mdx');
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
let d2Status = 'not run';

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validateRegistry() {
  const registry = loadRegistry();
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  if (registry.$schema !== './decision-registry.schema.json' || registry.version !== 1 || !Array.isArray(registry.decisions)) {
    fail('Registry must have the expected schema pointer, version 1, and decisions array.');
    return new Map();
  }
  const schemaStatuses = schema.$defs?.decision?.properties?.status?.enum;
  if (!Array.isArray(schemaStatuses) || schemaStatuses.join('|') !== validStatuses.join('|')) {
    fail(`Registry schema must declare statuses in this order: ${validStatuses.join(', ')}.`);
  }
  const ids = new Map();
  const allowedKeys = new Set(['id', 'title', 'status', 'canonical_home', 'summary', 'superseded_by', 'rationale', 'sources']);
  for (const record of registry.decisions) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) { fail('Registry contains a non-object decision.'); continue; }
    for (const key of Object.keys(record)) if (!allowedKeys.has(key)) fail(`${record.id ?? '(missing ID)'}: unexpected field '${key}'.`);
    if (!/^PD-\d{3,}$/.test(record.id ?? '')) fail(`Invalid decision ID: ${record.id ?? '(missing)'}`);
    if (ids.has(record.id)) fail(`Duplicate decision ID: ${record.id}`);
    else ids.set(record.id, record);
    if (!validStatuses.includes(record.status)) fail(`${record.id}: invalid status '${record.status}'.`);
    for (const field of ['title', 'summary', 'canonical_home']) if (typeof record[field] !== 'string' || !record[field].trim()) fail(`${record.id}: missing or invalid ${field}.`);
    if (record.rationale !== undefined && typeof record.rationale !== 'string') fail(`${record.id}: rationale must be a string.`);
    if (record.sources !== undefined && (!Array.isArray(record.sources) || record.sources.some((value) => typeof value !== 'string' || !value.trim()))) fail(`${record.id}: sources must be an array of non-empty strings.`);
    if (record.status === 'superseded' && !record.superseded_by) fail(`${record.id}: superseded decision requires superseded_by.`);
    if (record.status !== 'superseded' && record.superseded_by) fail(`${record.id}: superseded_by is only valid for superseded decisions.`);
    if (record.superseded_by !== undefined && !/^PD-\d{3,}$/.test(record.superseded_by)) fail(`${record.id}: invalid superseded_by ID '${record.superseded_by}'.`);

    const homePath = path.resolve(path.dirname(registryPath), record.canonical_home ?? '');
    try {
      const homeReal = realpathSync(homePath);
      const rootReal = realpathSync(productDesignDir);
      if (!isInside(rootReal, homeReal) || !statSync(homeReal).isFile() || !homeReal.endsWith('.mdx')) {
        fail(`${record.id}: canonical_home must be an existing MDX file inside product-design.`);
      }
      const canonicalReferences = findReferences(homeReal);
      if (!canonicalReferences.some((reference) => reference.id === record.id)) {
        fail(`${record.id}: canonical_home must contain its decision ID.`);
      }
    } catch {
      fail(`${record.id}: canonical_home '${record.canonical_home}' does not resolve to an existing MDX file inside product-design.`);
    }
  }

  for (const record of ids.values()) {
    if (record.superseded_by && !ids.has(record.superseded_by)) fail(`${record.id}: superseded_by points to unknown ${record.superseded_by}.`);
    if (record.superseded_by === record.id) fail(`${record.id}: cannot supersede itself.`);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id, trail = []) {
    if (visiting.has(id)) {
      const cycleStart = trail.indexOf(id);
      fail(`Supersession cycle: ${[...trail.slice(cycleStart), id].join(' -> ')}.`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const next = ids.get(id)?.superseded_by;
    if (next && ids.has(next)) visit(next, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids.keys()) visit(id);
  validateHistoricalIds(ids);
  return ids;
}

function validateHistoricalIds(ids) {
  const registryRepoPath = 'product-design/00-governance/decision-registry.json';
  let commits;
  try {
    commits = execFileSync('git', ['log', '--all', '--format=%H', '--', '00-governance/decision-registry.json'], { cwd: productDesignDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    warnings.push('Immutable-ID history check skipped: Git history is unavailable.');
    return;
  }
  if (commits.length === 0) {
    warnings.push('Immutable-ID history check not active yet: the registry has no committed history. It activates after the first registry commit.');
    return;
  }
  const previouslyUsed = new Set();
  for (const commit of commits) {
    try {
      const oldRegistry = JSON.parse(execFileSync('git', ['show', `${commit}:${registryRepoPath}`], { cwd: productDesignDir, encoding: 'utf8' }));
      for (const record of oldRegistry.decisions ?? []) if (typeof record.id === 'string') previouslyUsed.add(record.id);
    } catch (error) {
      fail(`Could not read decision registry at Git revision ${commit}: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }
  for (const historicalId of previouslyUsed) {
    if (!ids.has(historicalId)) fail(`Decision ID ${historicalId} exists in committed registry history and cannot be deleted or reused.`);
  }
}

function loadRoadmapPhases() {
  const text = readFileSync(roadmapPath, 'utf8');
  const phases = new Map();
  const reconciliations = new Map();
  const statuses = new Set(['completed', 'current', 'planned']);
  for (const [index, line] of text.split('\n').entries()) {
    if (!/^\| `PH-/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, ''));
    if (cells.length !== 4) continue;
    const [id, name, purpose, status] = cells;
    if (!/^PH-\d{3,}$/.test(id)) fail(`design-roadmap.mdx:${index + 1}: invalid phase ID '${id}'.`);
    if (phases.has(id)) fail(`Duplicate roadmap phase ID: ${id}.`);
    else phases.set(id, { name, purpose, status });
    if (!name || !purpose) fail(`${id}: phase name and purpose are required.`);
    if (!statuses.has(status)) fail(`${id}: invalid phase status '${status}'.`);
  }
  for (const [index, line] of text.split('\n').entries()) {
    if (!/^\| `PH-/.test(line) || !line.includes(' | ') || !/(complete|pending)/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, ''));
    if (cells.length !== 3 || !/^PH-\d{3,}$/.test(cells[0]) || !['complete', 'pending'].includes(cells[1].split(/\s+[—-]/)[0]) || !['complete', 'pending'].includes(cells[2].split(/\s+[—-]/)[0])) continue;
    if (reconciliations.has(cells[0])) fail(`Duplicate reconciliation row for ${cells[0]} at design-roadmap.mdx:${index + 1}.`);
    reconciliations.set(cells[0], { start: cells[1].startsWith('complete'), end: cells[2].startsWith('complete') });
  }
  if (phases.size === 0) fail('Design roadmap has no machine-readable phase rows.');
  const current = [...phases.values()].filter((phase) => phase.status === 'current');
  if (current.length !== 1) fail(`Design roadmap must have exactly one current phase; found ${current.length}.`);
  for (const id of phases.keys()) if (!reconciliations.has(id)) fail(`${id}: roadmap requires a deferred-topic reconciliation row.`);
  for (const [id, phase] of phases) {
    const reconciliation = reconciliations.get(id);
    if (!reconciliation) continue;
    if (phase.status === 'current' && !reconciliation.start) fail(`${id}: complete its deferred-topic start review before work proceeds.`);
    if (phase.status === 'completed' && (!reconciliation.start || !reconciliation.end)) fail(`${id}: completed phases require complete start and end deferred-topic reviews.`);
    if (phase.status === 'planned' && (reconciliation.start || reconciliation.end)) fail(`${id}: planned phases cannot have completed reconciliation reviews.`);
  }
  validateHistoricalPhaseIds(phases);
  return phases;
}

function validateHistoricalPhaseIds(phases) {
  const roadmapRepoPath = 'product-design/00-governance/design-roadmap.mdx';
  let commits;
  try {
    commits = execFileSync('git', ['log', '--all', '--format=%H', '--', '00-governance/design-roadmap.mdx'], { cwd: productDesignDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    warnings.push('Roadmap phase-ID history check skipped: Git history is unavailable.');
    return;
  }
  if (commits.length === 0) {
    warnings.push('Roadmap phase-ID history check not active yet: the roadmap has no committed history. It activates after the first roadmap commit.');
    return;
  }
  const previouslyUsed = new Set();
  for (const commit of commits) {
    try {
      const text = execFileSync('git', ['show', `${commit}:${roadmapRepoPath}`], { cwd: productDesignDir, encoding: 'utf8' });
      for (const match of text.matchAll(/^\| `(PH-\d{3,})` \|/gm)) previouslyUsed.add(match[1]);
    } catch (error) {
      fail(`Could not read design roadmap at Git revision ${commit}: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }
  for (const historicalId of previouslyUsed) {
    if (!phases.has(historicalId)) fail(`Roadmap phase ID ${historicalId} exists in committed history and cannot be deleted or reused.`);
  }
}

function validateDeferredHistory(ids) {
  const registryRepoPath = 'product-design/00-governance/deferred-topics.json';
  let commits;
  try {
    commits = execFileSync('git', ['log', '--all', '--format=%H', '--', '00-governance/deferred-topics.json'], { cwd: productDesignDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    warnings.push('Deferred-topic immutable-ID history check skipped: Git history is unavailable.');
    return;
  }
  if (commits.length === 0) {
    warnings.push('Deferred-topic immutable-ID history check not active yet: the register has no committed history. It activates after the first register commit.');
    return;
  }
  const previouslyUsed = new Set();
  for (const commit of commits) {
    try {
      const previous = JSON.parse(execFileSync('git', ['show', `${commit}:${registryRepoPath}`], { cwd: productDesignDir, encoding: 'utf8' }));
      for (const topic of previous.topics ?? []) if (typeof topic.id === 'string') previouslyUsed.add(topic.id);
    } catch (error) {
      fail(`Could not read deferred-topic register at Git revision ${commit}: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }
  for (const historicalId of previouslyUsed) {
    if (!ids.has(historicalId)) fail(`Deferred-topic ID ${historicalId} exists in committed register history and cannot be deleted or reused.`);
  }
}

function validateDeferredTopics(decisions) {
  const roadmap = loadRoadmapPhases();
  const register = JSON.parse(readFileSync(deferredPath, 'utf8'));
  const schema = JSON.parse(readFileSync(deferredSchemaPath, 'utf8'));
  const allowedStatuses = ['open', 'resolved', 'dropped'];
  if (register.$schema !== './deferred-topics.schema.json' || register.version !== 1 || !Array.isArray(register.topics)) {
    fail('Deferred-topic register must have its schema pointer, version 1, and topics array.');
    return;
  }
  const schemaStatuses = schema.$defs?.topic?.properties?.status?.enum;
  if (!Array.isArray(schemaStatuses) || schemaStatuses.join('|') !== allowedStatuses.join('|')) {
    fail(`Deferred-topic schema must declare statuses in this order: ${allowedStatuses.join(', ')}.`);
  }
  const allowedKeys = new Set(['id', 'title', 'status', 'reason', 'target_phase', 'notes', 'depends_on', 'moves', 'drop_reason', 'resolution_artifact']);
  const ids = new Map();
  for (const topic of register.topics) {
    if (!topic || typeof topic !== 'object' || Array.isArray(topic)) { fail('Deferred-topic register contains a non-object entry.'); continue; }
    for (const key of Object.keys(topic)) if (!allowedKeys.has(key)) fail(`${topic.id ?? '(missing ID)'}: unexpected deferred-topic field '${key}'.`);
    if (!/^DT-\d{3,}$/.test(topic.id ?? '')) fail(`Invalid deferred-topic ID: ${topic.id ?? '(missing)'}.`);
    if (ids.has(topic.id)) fail(`Duplicate deferred-topic ID: ${topic.id}.`);
    else ids.set(topic.id, topic);
    for (const field of ['title', 'reason']) if (typeof topic[field] !== 'string' || !topic[field].trim()) fail(`${topic.id}: missing or invalid ${field}.`);
    if (!allowedStatuses.includes(topic.status)) fail(`${topic.id}: invalid status '${topic.status}'.`);
    if (typeof topic.target_phase !== 'string' || !roadmap.has(topic.target_phase)) fail(`${topic.id}: target_phase '${topic.target_phase ?? ''}' is not a phase in design-roadmap.mdx.`);
    if (topic.notes !== undefined && (typeof topic.notes !== 'string' || !topic.notes.trim())) fail(`${topic.id}: notes must be a non-empty string when present.`);
    if (topic.depends_on !== undefined) {
      if (!Array.isArray(topic.depends_on)) fail(`${topic.id}: depends_on must be an array.`);
      else for (const id of topic.depends_on) {
        if (!/^PD-\d{3,}$/.test(id) || !decisions.has(id)) fail(`${topic.id}: depends_on contains unknown or invalid decision ID '${id}'.`);
      }
    }
    if (topic.moves !== undefined) {
      if (!Array.isArray(topic.moves)) fail(`${topic.id}: moves must be an array.`);
      else {
        let previousTarget;
        for (const [index, move] of topic.moves.entries()) {
          const prefix = `${topic.id}: move ${index + 1}`;
          if (!move || typeof move !== 'object' || Array.isArray(move)) { fail(`${prefix} must be an object.`); continue; }
          for (const key of Object.keys(move)) if (!['from_phase', 'to_phase', 'reason'].includes(key)) fail(`${prefix}: unexpected field '${key}'.`);
          for (const field of ['from_phase', 'to_phase', 'reason']) if (typeof move[field] !== 'string' || !move[field].trim()) fail(`${prefix}: ${field} must be a non-empty string.`);
          if (typeof move.from_phase === 'string' && !roadmap.has(move.from_phase)) fail(`${prefix}: unknown from_phase '${move.from_phase}'.`);
          if (typeof move.to_phase === 'string' && !roadmap.has(move.to_phase)) fail(`${prefix}: unknown to_phase '${move.to_phase}'.`);
          if (move.from_phase === move.to_phase) fail(`${prefix}: from_phase and to_phase must differ.`);
          if (previousTarget !== undefined && move.from_phase !== previousTarget) fail(`${prefix}: move history is discontinuous; expected from_phase '${previousTarget}'.`);
          previousTarget = move.to_phase;
        }
        if (topic.moves.length > 0 && topic.moves.at(-1)?.to_phase !== topic.target_phase) fail(`${topic.id}: the final move to_phase must match current target_phase '${topic.target_phase}'.`);
      }
    }
    if (topic.status === 'dropped') {
      if (typeof topic.drop_reason !== 'string' || !topic.drop_reason.trim()) fail(`${topic.id}: dropped item requires a non-empty drop_reason.`);
    } else if (topic.drop_reason !== undefined) fail(`${topic.id}: drop_reason is only valid when status is dropped.`);
    if (topic.status === 'resolved') {
      if (typeof topic.resolution_artifact !== 'string' || !topic.resolution_artifact.trim()) fail(`${topic.id}: resolved item requires resolution_artifact.`);
      else if (/^PD-\d{3,}$/.test(topic.resolution_artifact)) {
        if (!decisions.has(topic.resolution_artifact)) fail(`${topic.id}: resolution_artifact references unknown ${topic.resolution_artifact}.`);
      } else {
        const artifactPath = path.resolve(path.dirname(deferredPath), topic.resolution_artifact);
        try {
          const root = realpathSync(productDesignDir);
          const target = realpathSync(artifactPath);
          if (!isInside(root, target) || !statSync(target).isFile()) fail(`${topic.id}: resolution_artifact must point to an existing file inside product-design or a known PD-* decision.`);
        } catch { fail(`${topic.id}: resolution_artifact '${topic.resolution_artifact}' does not exist inside product-design.`); }
      }
    } else if (topic.resolution_artifact !== undefined) fail(`${topic.id}: resolution_artifact is only valid when status is resolved.`);
  }
  validateDeferredHistory(ids);
}

function validateLinks(mdxFiles) {
  for (const file of mdxFiles) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1].trim();
      const [rawPath, ...fragmentParts] = link.split(/[?#]/);
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(rawPath)) continue;
      if (rawPath.startsWith('/')) {
        const appRoot = path.join(toolingDir, 'app');
        const routePath = path.resolve(appRoot, `.${rawPath}`, 'route.ts');
        if (isInside(appRoot, routePath) && existsSync(routePath)) continue;
        const publicPath = path.resolve(toolingDir, 'public', `.${rawPath}`);
        if (isInside(path.join(toolingDir, 'public'), publicPath) && existsSync(publicPath)) continue;
      }
      const target = rawPath ? path.resolve(path.dirname(file), decodeURIComponent(rawPath)) : file;
      let realTarget;
      try { realTarget = realpathSync(target); }
      catch { fail(`${path.relative(productDesignDir, file)}: broken internal link '${link}'.`); continue; }
      const rootReal = realpathSync(productDesignDir);
      if (realTarget !== rootReal && !isInside(rootReal, realTarget)) {
        fail(`${path.relative(productDesignDir, file)}: internal link escapes product-design: '${link}'.`);
        continue;
      }
      const fragment = decodeURIComponent(fragmentParts.join('')).replace(/^#/, '');
      if (fragment && realTarget.endsWith('.mdx')) {
        const targetText = readFileSync(realTarget, 'utf8');
        const slug = (heading) => heading.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
        const headings = [...targetText.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) => slug(heading[1]));
        if (!headings.includes(slug(fragment))) fail(`${path.relative(productDesignDir, file)}: broken heading link '${link}'.`);
      }
    }
  }
}

function validateReferences(decisions, files) {
  for (const file of files) {
    for (const reference of findReferences(file)) {
      const label = `${path.relative(productDesignDir, file)}:${reference.line}`;
      if (!/^PD-\d{3,}$/.test(reference.id)) fail(`${label}: invalid decision ID '${reference.id}'.`);
      else if (!decisions.has(reference.id)) fail(`${label}: unknown decision reference ${reference.id}.`);
      else if (reference.kind === 'LIVE' && decisions.get(reference.id).status === 'superseded') {
        fail(`${label}: live reference to superseded ${reference.id}; revisit this artifact or mark the mention '${reference.id} (historical)' if it is only historical.`);
      }
    }
  }
}

function validateD2(d2Files) {
  if (d2Files.length === 0) { d2Status = 'no D2 inputs present'; return; }
  const probe = spawnSync('d2', ['version'], { encoding: 'utf8' });
  if (probe.error?.code === 'ENOENT') {
    warnings.push(`D2 check skipped: found ${d2Files.length} .d2 file(s), but the 'd2' CLI is not installed.`);
    d2Status = 'skipped; d2 CLI not installed';
    return;
  }
  if (probe.status !== 0) { fail(`Unable to run D2 CLI: ${(probe.stderr || probe.error?.message || '').trim()}`); d2Status = 'failed'; return; }
  d2Status = `passed (${d2Files.length} file(s) parsed and rendered)`;
  const outputDir = mkdtempSync(path.join(os.tmpdir(), 'veervrat-d2-'));
  try {
    for (const file of d2Files) {
      const output = path.join(outputDir, `${path.basename(file)}.svg`);
      const result = spawnSync('d2', [file, output], { encoding: 'utf8' });
      if (result.status !== 0 || !existsSync(output)) {
        fail(`${path.relative(productDesignDir, file)}: D2 parse/render failed: ${(result.stderr || result.error?.message || '').trim()}`);
        d2Status = 'failed';
      }
    }
  } finally { rmSync(outputDir, { recursive: true, force: true }); }
}

try {
  const decisions = validateRegistry();
  validateDeferredTopics(decisions);
  const mdxFiles = walk(productDesignDir, (file) => file.endsWith('.mdx'));
  const d2Files = walk(productDesignDir, (file) => file.endsWith('.d2'));
  validateLinks(mdxFiles);
  validateReferences(decisions, [...mdxFiles, ...d2Files]);
  validateD2(d2Files);
} catch (error) {
  fail(`Validator could not complete: ${error instanceof Error ? error.message : String(error)}`);
}

for (const warning of warnings) console.warn(`SKIP: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`Validation passed: registry, ${walk(productDesignDir, (file) => file.endsWith('.mdx')).length} MDX file(s), MDX links, and decision references.`);
  console.log(`D2 check: ${d2Status}.`);
}
