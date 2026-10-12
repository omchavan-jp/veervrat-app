import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { azure, positiveInteger, verifyJob, verifyRun } from './accept-uat.mjs';
import {
  canonicalJson,
  note,
  ownerId,
  receiptDigest,
  repository,
  validateAcceptance,
  validateImages,
  validateProductionTag,
  validateReceipt,
  validateReleaseSelection,
  validateRollback,
} from './release-record.mjs';
import { releaseStore } from './release-store.mjs';

export const controllerPath = '.github/workflows/production-release.yml';
const repoId = 1287947867;
const sha = /^[a-f0-9]{40}$/;
export const digest = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');
function check(value, message) {
  if (!value) throw new Error(message);
}
function exact(value, keys, label) {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === [...keys].sort().join(','),
    `Invalid ${label}`,
  );
}

export function assertControllerRun(run, current, finished = false) {
  check(
    run.id === current.id &&
      run.run_attempt === current.attempt &&
      run.head_sha === current.commit &&
      run.path === controllerPath &&
      run.head_branch === 'main' &&
      run.repository?.id === repoId &&
      run.head_repository?.id === repoId &&
      ['workflow_run', 'workflow_dispatch'].includes(run.event) &&
      (!finished || (run.status === 'completed' && run.conclusion === 'success')),
    'Untrusted production controller run',
  );
  if (run.event === 'workflow_dispatch')
    check(
      run.actor?.id === ownerId && run.triggering_actor?.id === ownerId,
      'Only owner may request production operations',
    );
}

export function assertTagRequest(run, eventRun) {
  check(
    run.id === eventRun.id &&
      run.run_attempt === eventRun.run_attempt &&
      run.head_sha === eventRun.head_sha &&
      run.repository?.id === repoId &&
      run.head_repository?.id === repoId &&
      run.path === '.github/workflows/cd.yml' &&
      run.event === 'push' &&
      run.status === 'completed' &&
      run.actor?.id === ownerId &&
      run.triggering_actor?.id === ownerId &&
      run.head_branch === eventRun.head_branch,
    'Untrusted tag request',
  );
  return validateProductionTag(run.head_branch);
}

export function assertApproval(reviews, context, now = () => new Date().toISOString()) {
  check(Array.isArray(reviews), 'Production approval history unavailable');
  const relevant = reviews.filter((review) =>
    review.environments?.some((env) => env.id === 19964751959 && env.name === 'prod'),
  );
  check(
    context.attempt === 1 &&
      relevant.length === 1 &&
      relevant[0].state === 'approved' &&
      relevant[0].user?.id === ownerId,
    'Unambiguous native owner approval on the first controller attempt required',
  );
  return { actorId: ownerId, runId: context.id, attempt: context.attempt, observedAt: now() };
}

export function assertRollbackPlan(changes) {
  for (const change of changes) {
    if (['no-op', 'read'].includes(change.change.actions.join(','))) continue;
    check(
      change.change.actions.join(',') === 'update' &&
        ['azurerm_container_app', 'azurerm_container_app_job'].includes(change.type),
      'Rollback refuses non-image infrastructure changes',
    );
    function prune(value, unknown, key = '') {
      if (unknown === true) return undefined;
      if (Array.isArray(value))
        return value.map((part, index) => prune(part, unknown?.[index], key));
      if (value && typeof value === 'object') {
        const out = {};
        for (const [name, child] of Object.entries(value)) {
          if (name === 'image' && key === 'container') continue;
          if (name === 'value' && value.name === 'COMMIT_SHA') continue;
          const result = prune(child, unknown?.[name], name);
          if (result !== undefined) out[name] = result;
        }
        return out;
      }
      return value;
    }
    const allowedComputed = new Set([
      'id',
      'latest_revision_name',
      'latest_revision_fqdn',
      'outbound_ip_addresses',
      'custom_domain_verification_id',
    ]);
    function containsUnknown(value) {
      return (
        value === true ||
        (value && typeof value === 'object' && Object.values(value).some(containsUnknown))
      );
    }
    for (const [name, unknown] of Object.entries(change.change.after_unknown ?? {}))
      if (containsUnknown(unknown))
        check(allowedComputed.has(name), 'Rollback refuses unknown configuration');
    check(
      canonicalJson(prune(change.change.before, change.change.after_unknown)) ===
        canonicalJson(prune(change.change.after, change.change.after_unknown)),
      'Rollback refuses configuration/schema changes',
    );
  }
}

export function client(token, request = fetch) {
  check(token, 'GitHub token missing');
  async function api(path, method = 'GET', body, allowMissing = false) {
    const response = await request(
      `https://api.github.com/repos/${repository}${path ? `/${path}` : ''}`,
      {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (response.status === 404 && allowMissing) return null;
    check(
      response.status >= 200 && response.status < 300,
      `GitHub evidence/write failed: HTTP ${response.status}`,
    );
    return response.status === 204 ? null : response.json();
  }
  return {
    api,
    run: (id, attempt) =>
      api(
        `actions/runs/${positiveInteger(id)}${attempt ? `/attempts/${positiveInteger(attempt)}` : ''}`,
      ),
    async jobs(id, attempt) {
      const all = [];
      for (let page = 1; page <= 100; page++) {
        const body = await api(
          `actions/runs/${positiveInteger(id)}/attempts/${positiveInteger(attempt)}/jobs?per_page=100&page=${page}`,
        );
        check(Array.isArray(body.jobs), 'Malformed job evidence');
        all.push(...body.jobs);
        if (body.jobs.length < 100) return all;
      }
      throw new Error('Unbounded job evidence');
    },
    async tag(tag, optional = false) {
      validateProductionTag(tag);
      const ref = await api(`git/ref/tags/${tag}`, 'GET', undefined, optional);
      if (!ref) return null;
      let object = ref.object;
      for (let depth = 0; depth < 5; depth++) {
        check(sha.test(object.sha), 'Invalid tag object');
        if (object.type === 'commit') return object.sha;
        check(object.type === 'tag', 'Tag must target a commit');
        object = (await api(`git/tags/${object.sha}`)).object;
      }
      throw new Error('Nested tag limit exceeded');
    },
  };
}

export async function verifyBundle(bundle, github) {
  exact(bundle, ['receipt', 'acceptance'], 'accepted bundle');
  const { receipt, acceptance } = bundle;
  validateReceipt(receipt);
  validateAcceptance(receipt, acceptance);
  verifyRun(await github.run(receipt.run.id, receipt.run.attempt), {
    ...receipt.run,
    path: '.github/workflows/cd.yml',
    commit: receipt.commit,
  });
  verifyJob(await github.jobs(receipt.run.id, receipt.run.attempt), 'deploy-uat');
  verifyRun(await github.run(acceptance.run.id, acceptance.run.attempt), {
    ...acceptance.run,
    path: '.github/workflows/cd.yml',
    owner: true,
  });
  verifyJob(await github.jobs(acceptance.run.id, acceptance.run.attempt), 'accept-uat');
  for (const evidence of receipt.checks) {
    const paths = {
      'Lint · Typecheck · Unit · Build': '.github/workflows/ci.yml',
      'API integration (Postgres + Redis)': '.github/workflows/integration.yml',
      'E2E flows (Playwright)': '.github/workflows/e2e.yml',
    };
    verifyRun(await github.run(evidence.run.id, evidence.run.attempt), {
      ...evidence.run,
      path: paths[evidence.name],
      commit: receipt.commit,
    });
    verifyJob(await github.jobs(evidence.run.id, evidence.run.attempt), evidence.name);
  }
  return bundle;
}

export async function acceptedFor(commit, store, github) {
  check(sha.test(commit), 'Invalid commit');
  const keys = await store.list(`accepted/${commit}/`);
  const candidates = [];
  for (const key of keys) {
    const index = await store.read(key);
    exact(index, ['version', 'receiptKey', 'acceptanceKey'], 'acceptance index');
    check(
      index.version === 1 &&
        /^receipts\/uat\/[1-9]\d*\/[1-9]\d*\.json$/.test(index.receiptKey) &&
        /^acceptances\/uat\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*\.json$/.test(
          index.acceptanceKey,
        ),
      'Invalid acceptance index paths',
    );
    const bundle = {
      receipt: await store.read(index.receiptKey),
      acceptance: await store.read(index.acceptanceKey),
    };
    check(
      bundle.receipt.commit === commit &&
        key ===
          `accepted/${commit}/${bundle.acceptance.run.id}/${bundle.acceptance.run.attempt}.json` &&
        index.receiptKey ===
          `receipts/uat/${bundle.receipt.run.id}/${bundle.receipt.run.attempt}.json` &&
        index.acceptanceKey ===
          `acceptances/uat/${bundle.receipt.run.id}/${bundle.receipt.run.attempt}/${bundle.acceptance.run.id}/${bundle.acceptance.run.attempt}.json`,
      'Index/evidence identity mismatch',
    );
    await verifyBundle(bundle, github);
    candidates.push(bundle);
  }
  check(candidates.length, 'Owner UAT acceptance missing; no production preparation');
  return candidates.sort(
    (a, b) => Date.parse(b.acceptance.acceptedAt) - Date.parse(a.acceptance.acceptedAt),
  )[0];
}

export function validateManifest(manifest) {
  exact(
    manifest,
    [
      'version',
      'repository',
      'tag',
      'commit',
      'infrastructureCommit',
      'images',
      'bundle',
      'controller',
      'rollback',
      'baseline',
      'changes',
      'createdAt',
    ],
    'release manifest',
  );
  check(
    manifest.version === 1 &&
      manifest.repository === repository &&
      sha.test(manifest.commit) &&
      sha.test(manifest.infrastructureCommit),
    'Invalid manifest identity',
  );
  validateReleaseSelection(manifest.bundle.receipt, manifest.bundle.acceptance, {
    tag: manifest.tag,
    commit: manifest.commit,
    onMain: true,
  });
  validateImages(manifest.images);
  check(
    canonicalJson(manifest.images) === canonicalJson(manifest.bundle.receipt.images),
    'Manifest differs from accepted images',
  );
  exact(manifest.controller, ['id', 'attempt', 'commit'], 'controller identity');
  positiveInteger(manifest.controller.id);
  positiveInteger(manifest.controller.attempt);
  check(sha.test(manifest.controller.commit), 'Invalid controller SHA');
  check(
    typeof manifest.createdAt === 'string' && Number.isFinite(Date.parse(manifest.createdAt)),
    'Invalid manifest timestamp',
  );
  check(
    Array.isArray(manifest.changes) && manifest.changes.length <= 5000,
    'Invalid change evidence',
  );
  check(
    manifest.baseline === null || /^[a-f0-9]{64}$/.test(manifest.baseline),
    'Invalid manifest baseline',
  );
  for (const change of manifest.changes) {
    exact(change, ['sha', 'subject', 'pullRequest'], 'change record');
    check(
      sha.test(change.sha) &&
        typeof change.subject === 'string' &&
        change.subject.length <= 1000 &&
        !/[\u0000-\u001f\u007f]/.test(change.subject),
      'Invalid change content',
    );
    check(
      change.pullRequest === null ||
        (Number.isSafeInteger(change.pullRequest) && change.pullRequest > 0),
      'Invalid PR reference',
    );
  }
  if (manifest.rollback) {
    exact(
      manifest.rollback,
      ['targetTag', 'requestRun', 'schemaNote', 'baselineDigest'],
      'rollback decision',
    );
    exact(manifest.rollback.requestRun, ['id', 'attempt'], 'rollback request run');
    validateProductionTag(manifest.rollback.targetTag);
    note(manifest.rollback.schemaNote);
    positiveInteger(manifest.rollback.requestRun.id);
    positiveInteger(manifest.rollback.requestRun.attempt);
    check(
      /^[a-f0-9]{64}$/.test(manifest.rollback.baselineDigest) &&
        manifest.rollback.baselineDigest === manifest.baseline,
      'Invalid rollback baseline',
    );
  } else {
    check(
      manifest.rollback === null && manifest.infrastructureCommit === manifest.commit,
      'Ordinary release infrastructure must match accepted commit',
    );
  }
  return manifest;
}

export async function outcomes(store, github, tag) {
  const results = [];
  for (const key of await store.list(
    tag ? `outcomes/${validateProductionTag(tag)}/` : 'outcomes/',
  )) {
    const value = await store.read(key);
    exact(
      value,
      [
        'version',
        'manifest',
        'manifestDigest',
        'approval',
        'status',
        'health',
        'completedAt',
        'failureStage',
      ],
      'production outcome',
    );
    check(
      value.version === 1 &&
        ['success', 'failure'].includes(value.status) &&
        value.manifestDigest === digest(validateManifest(value.manifest)),
      'Invalid outcome evidence',
    );
    const current = value.manifest.controller;
    exact(value.approval, ['actorId', 'runId', 'attempt', 'observedAt'], 'approval evidence');
    exact(value.health, ['ready', 'wiring'], 'production health');
    check(
      value.approval.actorId === ownerId &&
        value.approval.runId === current.id &&
        value.approval.attempt === 1 &&
        current.attempt === 1 &&
        Number.isFinite(Date.parse(value.approval.observedAt)) &&
        Number.isFinite(Date.parse(value.completedAt)),
      'Invalid outcome timing/approval',
    );
    check(
      typeof value.health.ready === 'boolean' &&
        typeof value.health.wiring === 'boolean' &&
        (value.status === 'success'
          ? value.failureStage === null
          : ['deploy', 'audit'].includes(value.failureStage)),
      'Invalid outcome stage',
    );
    check(
      key === `outcomes/${value.manifest.tag}/${current.id}/${current.attempt}.json`,
      'Outcome key mismatch',
    );
    check(
      canonicalJson(
        await store.read(`manifests/${value.manifest.tag}/${current.id}/${current.attempt}.json`),
      ) === canonicalJson(value.manifest),
      'Outcome differs from durable authorized manifest',
    );
    const run = await github.run(current.id, current.attempt);
    assertControllerRun(run, current, value.status === 'success');
    check(run.status === 'completed', 'Production outcome run has not completed');
    assertApproval(await github.api(`actions/runs/${current.id}/approvals`), current);
    if (value.status === 'success') {
      verifyJob(await github.jobs(current.id, current.attempt), 'deploy');
      check(
        value.health?.ready === true &&
          value.health?.wiring === true &&
          value.approval?.actorId === ownerId,
        'Production success lacks health/approval',
      );
    }
    results.push(value);
  }
  return results.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}

export async function assertClosedClaims(history, previous) {
  for (const key of await history.list('claims/')) {
    const claim = await history.read(key);
    exact(claim, ['version', 'identity', 'runId'], 'release claim');
    check(claim.version === 1 && /^[a-f0-9]{64}$/.test(claim.identity), 'Invalid release claim');
    positiveInteger(claim.runId);
    const tag = key.slice('claims/'.length, -'.json'.length);
    validateProductionTag(tag);
    check(
      previous.some(
        (outcome) =>
          outcome.manifest.tag === tag &&
          outcome.manifest.controller.id === claim.runId &&
          releaseIdentity(outcome.manifest) === claim.identity,
      ),
      'Unfinished production attempt requires operator reconciliation before another release',
    );
  }
}

export function releaseIdentity(manifest) {
  return digest({
    tag: manifest.tag,
    commit: manifest.commit,
    infrastructureCommit: manifest.infrastructureCommit,
    images: manifest.images,
    acceptance: receiptDigest(manifest.bundle.receipt),
    rollback: manifest.rollback?.targetTag ?? null,
  });
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000,
    maxBuffer: 4194304,
  }).trim();
}
function onMain(commit) {
  check(sha.test(commit), 'Invalid main commit');
  try {
    git(['merge-base', '--is-ancestor', commit, 'refs/remotes/origin/main']);
    return true;
  } catch {
    return false;
  }
}
function gh(args) {
  try {
    return execFileSync('gh', [...args, '--repo', repository], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    });
  } catch {
    throw new Error('GitHub release/artifact operation failed; no fallback or tag mutation');
  }
}
function current() {
  return {
    id: positiveInteger(process.env.GITHUB_RUN_ID),
    attempt: positiveInteger(process.env.GITHUB_RUN_ATTEMPT),
    commit: process.env.GITHUB_SHA,
  };
}

async function guard(github) {
  check(
    process.env.GITHUB_REF === 'refs/heads/main' &&
      process.env.GITHUB_REPOSITORY === repository &&
      process.env.GITHUB_WORKFLOW_REF === `${repository}/${controllerPath}@refs/heads/main`,
    'Protected main controller context required',
  );
  const own = await github.run(current().id, current().attempt);
  assertControllerRun(own, current());
  check(
    current().attempt === 1,
    'Controller reruns cannot reuse production authorization; use a new release request after failure assessment',
  );
  const meta = await github.api('');
  check(
    meta.id === repoId && meta.owner?.id === ownerId && meta.default_branch === 'main',
    'Repository ownership/default branch changed',
  );
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (own.event === 'workflow_run') {
    check(event.workflow_run, 'Missing request run');
    const parent = await github.run(event.workflow_run.id, event.workflow_run.run_attempt);
    return {
      operation: 'release',
      tag: assertTagRequest(parent, event.workflow_run),
      requestedCommit: parent.head_sha,
    };
  }
  const operation = event.inputs?.operation;
  check(
    ['release', 'verify-receipt', 'register-rollback'].includes(operation),
    'Unknown controller operation',
  );
  return { ...event.inputs, operation, tag: event.inputs.release_tag };
}

async function validateBoundary(github) {
  const env = await github.api('environments/prod');
  const policies = await github.api('environments/prod/deployment-branch-policies');
  const review = env.protection_rules?.find((rule) => rule.type === 'required_reviewers');
  check(
    env.id === 19964751959 &&
      env.deployment_branch_policy?.custom_branch_policies === true &&
      env.deployment_branch_policy?.protected_branches === false &&
      env.can_admins_bypass === false &&
      review?.prevent_self_review === false &&
      review.reviewers?.length === 1 &&
      review.reviewers[0].type === 'User' &&
      review.reviewers[0].reviewer.id === ownerId &&
      policies.branch_policies?.length === 1 &&
      policies.branch_policies[0].name === 'main' &&
      policies.branch_policies[0].type === 'branch',
    'Production main/owner approval boundary not active',
  );
}

export async function prepare(
  github,
  store,
  history,
  request,
  { isOnMain = onMain, log = git, publish = gh } = {},
) {
  if (request.operation === 'verify-receipt') {
    await validateBoundary(github);
    const id = positiveInteger(request.uat_run_id),
      attempt = positiveInteger(request.uat_run_attempt);
    const receipt = validateReceipt(await store.read(`receipts/uat/${id}/${attempt}.json`));
    verifyRun(await github.run(id, attempt), {
      id,
      attempt,
      path: '.github/workflows/cd.yml',
      commit: receipt.commit,
    });
    verifyJob(await github.jobs(id, attempt), 'deploy-uat');
    check(isOnMain(receipt.commit), 'Receipt commit not on main');
    for (const evidence of receipt.checks) {
      const paths = {
        'Lint · Typecheck · Unit · Build': '.github/workflows/ci.yml',
        'API integration (Postgres + Redis)': '.github/workflows/integration.yml',
        'E2E flows (Playwright)': '.github/workflows/e2e.yml',
      };
      verifyRun(await github.run(evidence.run.id, evidence.run.attempt), {
        ...evidence.run,
        path: paths[evidence.name],
        commit: receipt.commit,
      });
      verifyJob(await github.jobs(evidence.run.id, evidence.run.attempt), evidence.name);
    }
    const productionOutcomes = await history.list('outcomes/');
    const productionClaims = await history.list('claims/');
    console.log(
      JSON.stringify({
        receiptVerified: true,
        commit: receipt.commit,
        images: receipt.images,
        productionAuthorized: false,
        productionHistoryReadable: true,
        productionOutcomeCount: productionOutcomes.length,
        productionClaimCount: productionClaims.length,
      }),
    );
    return;
  }
  const tag = validateProductionTag(request.tag);
  const recorded = await outcomes(history, github);
  await assertClosedClaims(history, recorded);
  check(
    !recorded.some((item) => item.manifest.tag === tag),
    'A recorded release tag cannot be deployed again; use a new tag',
  );
  const previous = recorded[0] ?? null;
  if (request.operation === 'register-rollback') {
    check(
      (await github.tag(tag, true)) === null,
      'Rollback request must precede creation of its new tag',
    );
    const targetTag = validateProductionTag(request.rollback_tag);
    const target = (await outcomes(history, github, targetTag)).find(
      (item) => item.status === 'success',
    );
    check(
      target && previous,
      'No verified production rollback target/current history; operator assessment required',
    );
    note(request.schema_note);
    check(request.schema_compatible === 'true', 'Explicit schema compatibility review required');
    validateRollback(
      { ...target.manifest.bundle, productionOutcome: 'success' },
      { compatible: true, note: request.schema_note },
      ownerId,
    );
    await store.create(`rollback-requests/${tag}.json`, {
      version: 1,
      tag,
      targetTag,
      targetDigest: digest(target),
      baselineDigest: digest(previous),
      schemaNote: request.schema_note,
      actorId: ownerId,
      run: current(),
      createdAt: new Date().toISOString(),
    });
    console.log(
      JSON.stringify({
        rollbackRequestRecorded: true,
        tag,
        targetCommit: target.manifest.commit,
        productionAuthorized: false,
      }),
    );
    return;
  }
  await validateBoundary(github);
  const commit = await github.tag(tag);
  check(isOnMain(commit), 'Release tag must target main history');
  if (request.requestedCommit)
    check(
      commit === request.requestedCommit,
      'Tag differs from the actual triggering request commit',
    );
  const rollbackRequest = await store.readOptional(`rollback-requests/${tag}.json`);
  let bundle,
    rollback = null,
    infrastructureCommit = commit;
  if (rollbackRequest) {
    exact(
      rollbackRequest,
      [
        'version',
        'tag',
        'targetTag',
        'targetDigest',
        'baselineDigest',
        'schemaNote',
        'actorId',
        'run',
        'createdAt',
      ],
      'rollback request',
    );
    check(
      rollbackRequest.version === 1 &&
        rollbackRequest.tag === tag &&
        rollbackRequest.actorId === ownerId &&
        previous &&
        rollbackRequest.baselineDigest === digest(previous),
      'Rollback baseline changed or unauthorized',
    );
    const registered = await github.run(rollbackRequest.run.id, rollbackRequest.run.attempt);
    assertControllerRun(registered, rollbackRequest.run, true);
    verifyJob(await github.jobs(rollbackRequest.run.id, rollbackRequest.run.attempt), 'prepare');
    const target = (await outcomes(history, github, rollbackRequest.targetTag)).find(
      (item) => item.status === 'success' && digest(item) === rollbackRequest.targetDigest,
    );
    check(target && target.manifest.commit === commit, 'Rollback target does not match new tag');
    bundle = await verifyBundle(target.manifest.bundle, github);
    validateRollback(
      { ...bundle, productionOutcome: 'success' },
      { compatible: true, note: rollbackRequest.schemaNote },
      ownerId,
    );
    infrastructureCommit = previous.manifest.infrastructureCommit;
    rollback = {
      targetTag: rollbackRequest.targetTag,
      requestRun: { id: rollbackRequest.run.id, attempt: rollbackRequest.run.attempt },
      schemaNote: rollbackRequest.schemaNote,
      baselineDigest: digest(previous),
    };
  } else bundle = await acceptedFor(commit, store, github);
  check(isOnMain(infrastructureCommit), 'Infrastructure source not on main');
  const range = previous
    ? rollback
      ? `${commit}..${previous.manifest.commit}`
      : `${previous.manifest.commit}..${commit}`
    : commit;
  const changes = log(['log', '--format=%H %s', range])
    .split('\n')
    .filter(Boolean)
    .map((line) => ({
      sha: line.slice(0, 40),
      subject: line.slice(41),
      pullRequest: Number(line.match(/\(#(\d+)\)$/)?.[1]) || null,
    }));
  const manifest = validateManifest({
    version: 1,
    repository,
    tag,
    commit,
    infrastructureCommit,
    images: bundle.receipt.images,
    bundle,
    controller: current(),
    rollback,
    baseline: previous ? digest(previous) : null,
    changes,
    createdAt: new Date().toISOString(),
  });
  const assetName = `manifest-${current().id}-${current().attempt}.json`;
  const directory = mkdtempSync(join(process.env.RUNNER_TEMP, 'release-manifest-'));
  const file = join(directory, assetName);
  writeFileSync(file, canonicalJson(manifest), { mode: 0o600 });
  const title = `${tag}${rollback ? ` — rollback to ${rollback.targetTag}` : ''}`;
  const body = `Prepared, not yet deployed.\n\nCommit: ${commit}\nController: ${current().commit}\nUAT verification: ${bundle.acceptance.note}\n\n${Object.entries(
    manifest.images,
  )
    .map(([name, ref]) => `${name}: ${ref}`)
    .join('\n')}\n\n${changes.map((item) => `- ${item.sha} ${item.subject}`).join('\n')}`;
  const existing = await github.api(`releases/tags/${tag}`, 'GET', undefined, true);
  if (existing)
    check(
      existing.draft === false && existing.tag_name === tag,
      'Prerequisite release must be public and match the requested tag',
    );
  if (!existing)
    publish(['release', 'create', tag, '--verify-tag', '--title', title, '--notes', body]);
  publish(['release', 'upload', tag, file]);
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `deploy=true\nmanifest=${file}\nmanifest_digest=${digest(manifest)}\nrelease_url=https://github.com/${repository}/releases/tag/${tag}\n`,
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## ${title}\n\n${body}\n\nRequired production approval authorizes these exact digests. No build is performed.\n`,
  );
}

export async function begin(
  github,
  acceptanceStore,
  history,
  manifest,
  { isOnMain = onMain } = {},
) {
  validateManifest(manifest);
  check(
    digest(manifest) === process.env.EXPECTED_MANIFEST_DIGEST &&
      canonicalJson(manifest.controller) === canonicalJson(current()),
    'Manifest handoff/source attempt mismatch',
  );
  await validateBoundary(github);
  check(
    (await github.tag(manifest.tag)) === manifest.commit &&
      isOnMain(manifest.commit) &&
      isOnMain(manifest.infrastructureCommit),
    'Release tag changed or not on main',
  );
  await verifyBundle(manifest.bundle, github);
  const key = `acceptances/uat/${manifest.bundle.receipt.run.id}/${manifest.bundle.receipt.run.attempt}/${manifest.bundle.acceptance.run.id}/${manifest.bundle.acceptance.run.attempt}.json`;
  check(
    canonicalJson(await acceptanceStore.read(key)) === canonicalJson(manifest.bundle.acceptance),
    'Acceptance changed since preparation',
  );
  const approval = assertApproval(
    await github.api(`actions/runs/${current().id}/approvals`),
    current(),
  );
  const recorded = await outcomes(history, github);
  await assertClosedClaims(history, recorded);
  check(
    !recorded.some((item) => item.manifest.tag === manifest.tag),
    'Release tag already deployed',
  );
  const latest = recorded[0] ?? null;
  check(
    (latest ? digest(latest) : null) === manifest.baseline,
    'Production baseline changed since preparation',
  );
  if (manifest.rollback) {
    const request = await acceptanceStore.read(`rollback-requests/${manifest.tag}.json`);
    check(
      request.actorId === ownerId &&
        request.tag === manifest.tag &&
        request.targetTag === manifest.rollback.targetTag &&
        request.baselineDigest === manifest.baseline &&
        request.schemaNote === manifest.rollback.schemaNote &&
        request.run.id === manifest.rollback.requestRun.id &&
        request.run.attempt === manifest.rollback.requestRun.attempt,
      'Rollback authorization changed since preparation',
    );
    const target = recorded.find(
      (item) =>
        item.status === 'success' &&
        item.manifest.tag === request.targetTag &&
        digest(item) === request.targetDigest,
    );
    check(
      target &&
        canonicalJson(target.manifest.bundle) === canonicalJson(manifest.bundle) &&
        manifest.infrastructureCommit === latest.manifest.infrastructureCommit,
      'Rollback target/infrastructure changed',
    );
    assertControllerRun(await github.run(request.run.id, request.run.attempt), request.run, true);
    verifyJob(await github.jobs(request.run.id, request.run.attempt), 'prepare');
    validateRollback(
      { ...manifest.bundle, productionOutcome: 'success' },
      { compatible: true, note: request.schemaNote },
      ownerId,
    );
  }
  const published = await github.api(`releases/tags/${manifest.tag}`);
  check(
    published.draft === false && published.tag_name === manifest.tag,
    'Published release is draft or mismatched',
  );
  check(
    published.assets?.some(
      (asset) =>
        asset.name === `manifest-${current().id}-${current().attempt}.json` &&
        asset.digest === `sha256:${digest(manifest)}`,
    ),
    'Prerequisite GitHub Release manifest missing or changed',
  );
  const identity = releaseIdentity(manifest);
  const claim = await history.readOptional(`claims/${manifest.tag}.json`);
  if (claim) throw new Error('Release tag already reserved; operator reconciliation required');
  await history.create(
    `manifests/${manifest.tag}/${current().id}/${current().attempt}.json`,
    manifest,
  );
  await history.create(`claims/${manifest.tag}.json`, {
    version: 1,
    identity,
    runId: current().id,
  });
  writeFileSync(
    join(process.env.RUNNER_TEMP, 'production-approval.json'),
    canonicalJson(approval),
    { mode: 0o600 },
  );
  appendFileSync(process.env.GITHUB_OUTPUT, 'authorized=true\n');
}

export async function finish(github, history, manifest, { publish = gh } = {}) {
  validateManifest(manifest);
  check(
    digest(manifest) === process.env.EXPECTED_MANIFEST_DIGEST &&
      canonicalJson(manifest.controller) === canonicalJson(current()),
    'Outcome manifest mismatch',
  );
  const approval = JSON.parse(
    readFileSync(join(process.env.RUNNER_TEMP, 'production-approval.json'), 'utf8'),
  );
  const success = process.env.DEPLOYMENT_OUTCOME === 'success';
  const outcome = {
    version: 1,
    manifest,
    manifestDigest: digest(manifest),
    approval,
    status: success ? 'success' : 'failure',
    health: { ready: success, wiring: success },
    completedAt: new Date().toISOString(),
    failureStage: success ? null : 'deploy',
  };
  const file = join(process.env.RUNNER_TEMP, `outcome-${current().id}-${current().attempt}.json`);
  writeFileSync(file, canonicalJson(outcome), { mode: 0o600 });
  try {
    publish(['release', 'upload', manifest.tag, file]);
    const release = await github.api(`releases/tags/${manifest.tag}`);
    await github.api(`releases/${release.id}`, 'PATCH', {
      body: `${release.body ?? ''}\n\nAttempt ${current().id}/${current().attempt}: observed deployment ${outcome.status}. Native owner approval observed at ${approval.observedAt}. Ready/wiring: ${success}. Durable audit completion additionally requires the final job/run to succeed.\nhttps://github.com/${repository}/actions/runs/${current().id}`,
    });
  } catch (error) {
    await history.create(`outcomes/${manifest.tag}/${current().id}/${current().attempt}.json`, {
      ...outcome,
      status: 'failure',
      failureStage: 'audit',
    });
    throw error;
  }
  await history.create(
    `outcomes/${manifest.tag}/${current().id}/${current().attempt}.json`,
    outcome,
  );
  console.log(
    JSON.stringify({ tag: manifest.tag, outcome: outcome.status, productionAuditRecorded: true }),
  );
}

async function main() {
  const github = client(process.env.GH_TOKEN);
  const request = await guard(github);
  const command = process.argv[2];
  if (command === 'guard') return;
  if (command === 'source') {
    const manifest = validateManifest(JSON.parse(readFileSync(process.env.MANIFEST_FILE, 'utf8')));
    check(
      digest(manifest) === process.env.EXPECTED_MANIFEST_DIGEST &&
        canonicalJson(manifest.controller) === canonicalJson(current()) &&
        onMain(manifest.infrastructureCommit),
      'Infrastructure source handoff invalid',
    );
    const approval = JSON.parse(
      readFileSync(join(process.env.RUNNER_TEMP, 'production-approval.json'), 'utf8'),
    );
    check(
      approval.runId === current().id && approval.attempt === 1 && approval.actorId === ownerId,
      'Native authorization required before source selection',
    );
    const directory = join(
      mkdtempSync(join(process.env.RUNNER_TEMP, 'production-source-')),
      'checkout',
    );
    git(['worktree', 'add', '--detach', directory, manifest.infrastructureCommit]);
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `directory=${directory}\nimage_tag=${manifest.commit.slice(0, 7)}\nrollback=${Boolean(manifest.rollback)}\n`,
    );
    return;
  }
  const token = azure([
    'account',
    'get-access-token',
    '--resource',
    'https://storage.azure.com/',
  ]).accessToken;
  const store = releaseStore(token);
  const history = releaseStore(token, fetch, 'production');
  if (command === 'prepare') return prepare(github, store, history, request);
  const manifest = JSON.parse(readFileSync(process.env.MANIFEST_FILE, 'utf8'));
  if (command === 'begin') return begin(github, store, history, manifest);
  if (command === 'finish') return finish(github, history, manifest);
  throw new Error('Unknown production command');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
