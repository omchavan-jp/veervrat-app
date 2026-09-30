#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findReferences, loadRegistry, productDesignDir, registryPath, validStatuses, walk } from './governance.mjs';

const schemaPath = path.join(productDesignDir, '00-governance', 'decision-registry.schema.json');
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
  const homes = new Map();
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
      if (homes.has(homeReal)) fail(`${record.id}: canonical home is already assigned to ${homes.get(homeReal)}.`);
      else homes.set(homeReal, record.id);
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

function validateLinks(mdxFiles) {
  for (const file of mdxFiles) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1].trim();
      const [rawPath, ...fragmentParts] = link.split(/[?#]/);
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(rawPath)) continue;
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
