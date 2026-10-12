import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acceptedFor,
  assertApproval,
  assertClosedClaims,
  assertControllerRun,
  assertRollbackPlan,
  assertTagRequest,
  begin,
  controllerPath,
  digest,
  finish,
  outcomes,
  prepare,
  releaseIdentity,
  validateManifest,
  verifyBundle,
} from './production-release.mjs';
import {
  canonicalJson,
  createAcceptance,
  imageNames,
  ownerId,
  repository,
  requiredChecks,
} from './release-record.mjs';
import { imageVariables } from './deploy-production.mjs';
import { releaseStore } from './release-store.mjs';
import { assertUatWiring, verifyUatHealth } from './record-uat.mjs';
import { checkWorkflow } from './check-actions-security.mjs';

const commit = 'a'.repeat(40),
  controllerCommit = 'b'.repeat(40);
const current = { id: 400, attempt: 1, commit: controllerCommit };
const time = '2026-10-12T04:00:00.000Z';
const reviews = () => [
  {
    environments: [{ id: 19964751959, name: 'prod' }],
    state: 'approved',
    user: { id: ownerId },
    comment: '',
  },
];
function fixture() {
  const receipt = {
    version: 1,
    repository,
    commit,
    run: { id: 100, attempt: 1 },
    completedAt: time,
    images: Object.fromEntries(
      imageNames.map((name) => [
        name,
        `veervratacr.azurecr.io/veervrat-${name === 'migrate' ? 'api-migrate' : name}@sha256:${'a'.repeat(64)}`,
      ]),
    ),
    checks: requiredChecks.map((name, index) => ({
      name,
      run: { id: 200 + index, attempt: 1 },
      commit,
      conclusion: 'success',
    })),
    health: { ready: true, wiring: true },
  };
  const acceptance = createAcceptance(
    receipt,
    {
      run: { id: 300, attempt: 1 },
      acceptedAt: time,
      note: 'Exercised login, journey creation and mentor messaging on this UAT deployment.',
    },
    ownerId,
  );
  const manifest = {
    version: 1,
    repository,
    tag: 'prod-2026-10-12',
    commit,
    infrastructureCommit: commit,
    images: receipt.images,
    bundle: { receipt, acceptance },
    controller: current,
    rollback: null,
    baseline: null,
    changes: [{ sha: commit, subject: 'feat: reviewed change (#123)', pullRequest: 123 }],
    createdAt: time,
  };
  const base = {
    run_attempt: 1,
    repository: { id: 1287947867 },
    head_repository: { id: 1287947867 },
    head_sha: commit,
    head_branch: 'main',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };
  const runs = new Map([
    [100, { ...base, id: 100, path: '.github/workflows/cd.yml' }],
    ...['ci', 'integration', 'e2e'].map((name, i) => [
      200 + i,
      { ...base, id: 200 + i, path: `.github/workflows/${name}.yml` },
    ]),
    [
      300,
      {
        ...base,
        id: 300,
        path: '.github/workflows/cd.yml',
        event: 'workflow_dispatch',
        actor: { id: ownerId },
        triggering_actor: { id: ownerId },
      },
    ],
    [
      400,
      {
        ...base,
        id: 400,
        path: controllerPath,
        head_sha: controllerCommit,
        event: 'workflow_dispatch',
        actor: { id: ownerId },
        triggering_actor: { id: ownerId },
      },
    ],
  ]);
  const jobs = new Map([
    [100, ['deploy-uat']],
    [300, ['accept-uat']],
    [400, ['prepare', 'deploy']],
    ...requiredChecks.map((name, i) => [200 + i, [name]]),
  ]);
  const approvalRule = {
    type: 'required_reviewers',
    prevent_self_review: false,
    reviewers: [{ type: 'User', reviewer: { id: ownerId } }],
  };
  const github = {
    run: async (id, attempt) => {
      const run = runs.get(id);
      assert.equal(attempt, run.run_attempt);
      return run;
    },
    jobs: async (id) =>
      jobs.get(id).map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    tag: async (_tag, optional) => (optional ? null : commit),
    api: async (path) => {
      if (path === 'environments/prod')
        return {
          id: 19964751959,
          deployment_branch_policy: { custom_branch_policies: true, protected_branches: false },
          can_admins_bypass: false,
          protection_rules: [approvalRule],
        };
      if (path === 'environments/prod/deployment-branch-policies')
        return { branch_policies: [{ name: 'main', type: 'branch' }] };
      if (path.endsWith('/approvals')) return reviews();
      if (path.startsWith('releases/tags/'))
        return {
          id: 1,
          draft: false,
          tag_name: manifest.tag,
          body: 'Prepared',
          assets: [{ name: 'manifest-400-1.json', digest: `sha256:${digest(manifest)}` }],
        };
      if (path === 'releases/1') return {};
      throw new Error(`Unexpected evidence: ${path}`);
    },
  };
  const records = new Map([
    ['receipts/uat/100/1.json', receipt],
    ['acceptances/uat/100/1/300/1.json', acceptance],
    [
      `accepted/${commit}/300/1.json`,
      {
        version: 1,
        receiptKey: 'receipts/uat/100/1.json',
        acceptanceKey: 'acceptances/uat/100/1/300/1.json',
      },
    ],
  ]);
  const memory = (records) => ({
    read: async (key) => {
      assert.ok(records.has(key), `missing ${key}`);
      return structuredClone(records.get(key));
    },
    readOptional: async (key) => (records.has(key) ? structuredClone(records.get(key)) : null),
    list: async (prefix) => [...records.keys()].filter((key) => key.startsWith(prefix)),
    create: async (key, value) => {
      assert.ok(!records.has(key), 'conditional create');
      records.set(key, structuredClone(value));
    },
  });
  const historyRecords = new Map();
  return {
    receipt,
    acceptance,
    manifest,
    runs,
    jobs,
    github,
    records,
    store: memory(records),
    historyRecords,
    history: memory(historyRecords),
    approvalRule,
  };
}

async function runtime(work) {
  const directory = mkdtempSync(join(tmpdir(), 'veervrat-controller-test-'));
  const saved = { ...process.env };
  Object.assign(process.env, {
    RUNNER_TEMP: directory,
    GITHUB_RUN_ID: '400',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_SHA: controllerCommit,
    GITHUB_OUTPUT: join(directory, 'output'),
    GITHUB_STEP_SUMMARY: join(directory, 'summary'),
  });
  try {
    await work(directory);
  } finally {
    process.env = saved;
    rmSync(directory, { recursive: true, force: true });
  }
}

test('controller and tag proof rejects fork/PR sources, spoofed owners, commits and attempts', () => {
  const f = fixture(),
    run = f.runs.get(400);
  assertControllerRun(run, current, true);
  for (const mutate of [
    (r) => (r.head_branch = 'feature'),
    (r) => (r.path = '.github/workflows/cd.yml'),
    (r) => (r.head_sha = commit),
    (r) => (r.head_repository.id = 1),
    (r) => (r.actor.id = 1),
    (r) => (r.triggering_actor.id = 1),
    (r) => (r.event = 'pull_request'),
    (r) => (r.run_attempt = 2),
  ]) {
    const bad = structuredClone(run);
    mutate(bad);
    assert.throws(() => assertControllerRun(bad, current, true));
  }
  const parent = {
    ...structuredClone(f.runs.get(100)),
    head_branch: 'prod-2026-10-12',
    actor: { id: ownerId },
    triggering_actor: { id: ownerId },
  };
  assert.equal(assertTagRequest(parent, parent), parent.head_branch);
  assert.throws(() => assertTagRequest(parent, { ...parent, head_sha: controllerCommit }));
  assert.throws(() => assertTagRequest({ ...parent, event: 'pull_request' }, parent));
});

test('native approval is exact-run owner proof without invented timestamps or ambiguous rerun approvals', () => {
  assert.deepEqual(
    assertApproval(reviews(), current, () => time),
    { actorId: ownerId, runId: 400, attempt: 1, observedAt: time },
  );
  for (const list of [
    [],
    [...reviews(), ...reviews()],
    [{ ...reviews()[0], state: 'rejected' }],
    [{ ...reviews()[0], user: { id: 1 } }],
  ])
    assert.throws(() => assertApproval(list, current));
  assert.throws(() => assertApproval(reviews(), { ...current, attempt: 2 }));
});

test('accepted index resolves exact archived run attempts and rejects missing/stale/spoofed evidence', async () => {
  const f = fixture();
  assert.deepEqual(await acceptedFor(commit, f.store, f.github), f.manifest.bundle);
  for (const mutate of [
    (f) => f.records.clear(),
    (f) => (f.runs.get(200).conclusion = 'failure'),
    (f) => (f.runs.get(300).triggering_actor.id = 1),
    (f) => (f.runs.get(100).head_sha = controllerCommit),
    (f) => f.jobs.set(100, ['prepare']),
    (f) =>
      (f.records.get(`accepted/${commit}/300/1.json`).receiptKey = '../tfstate-prod/prod.tfstate'),
  ]) {
    const g = fixture();
    mutate(g);
    await assert.rejects(acceptedFor(commit, g.store, g.github));
  }
  await assert.rejects(verifyBundle({ ...f.manifest.bundle, extra: true }, f.github));
});

test('manifest binds accepted digests, source, controller, baseline and exact change records', () => {
  const f = fixture();
  validateManifest(f.manifest);
  for (const mutate of [
    (m) => (m.images.web = 'mutable:tag'),
    (m) => (m.infrastructureCommit = controllerCommit),
    (m) => (m.commit = controllerCommit),
    (m) => (m.controller.attempt = 0),
    (m) => (m.baseline = 'invalid'),
    (m) => (m.changes[0].pullRequest = -1),
    (m) => (m.extra = true),
    (m) => (m.rollback = false),
  ]) {
    const m = structuredClone(f.manifest);
    mutate(m);
    assert.throws(() => validateManifest(m));
  }
});

test('production preparation publishes release before deploy output; upload failure emits no authorization', async () =>
  runtime(async (directory) => {
    const f = fixture(),
      calls = [];
    f.github.api = new Proxy(f.github.api, {
      apply: async (target, thisArg, args) =>
        args[0].startsWith('releases/tags/') ? null : target.apply(thisArg, args),
    });
    await prepare(
      f.github,
      f.store,
      f.history,
      { operation: 'release', tag: f.manifest.tag },
      {
        isOnMain: () => true,
        log: () => `${commit} feat: reviewed change (#123)`,
        publish: (args) => calls.push(args),
      },
    );
    assert.deepEqual(
      calls.map((a) => a.slice(0, 2)),
      [
        ['release', 'create'],
        ['release', 'upload'],
      ],
    );
    const file = calls[1][3];
    assert.ok(file.endsWith('/manifest-400-1.json'));
    assert.ok(!file.includes('#'));
    validateManifest(JSON.parse(readFileSync(file, 'utf8')));
    assert.match(readFileSync(process.env.GITHUB_OUTPUT, 'utf8'), /deploy=true/);
    process.env.GITHUB_OUTPUT = join(directory, 'failed-output');
    await assert.rejects(
      prepare(
        f.github,
        f.store,
        f.history,
        { operation: 'release', tag: f.manifest.tag },
        {
          isOnMain: () => true,
          log: () => '',
          publish: () => {
            throw new Error('asset upload denied');
          },
        },
      ),
      /denied/,
    );
    assert.throws(() => readFileSync(process.env.GITHUB_OUTPUT));
  }));

test('begin revalidates exact manifest digest, native gate, accepted evidence, tag and published asset', async () =>
  runtime(async () => {
    const f = fixture();
    process.env.EXPECTED_MANIFEST_DIGEST = digest(f.manifest);
    await begin(f.github, f.store, f.history, f.manifest, { isOnMain: () => true });
    assert.equal(
      f.historyRecords.get(`claims/${f.manifest.tag}.json`).identity,
      releaseIdentity(f.manifest),
    );
    assert.match(readFileSync(process.env.GITHUB_OUTPUT, 'utf8'), /authorized=true/);
    for (const mutate of [
      (g) => (g.github.tag = async () => controllerCommit),
      (g) => (g.approvalRule.prevent_self_review = true),
      (g) =>
        (g.records.get('acceptances/uat/100/1/300/1.json').note =
          'Changed owner note with enough words to otherwise remain schema valid.'),
      (g) => {
        const original = g.github.api;
        g.github.api = async (path) =>
          path.startsWith('releases/tags/')
            ? {
                draft: false,
                tag_name: g.manifest.tag,
                assets: [{ name: 'manifest-400-1.json', digest: 'sha256:wrong' }],
              }
            : original(path);
      },
    ]) {
      const g = fixture();
      mutate(g);
      await assert.rejects(
        begin(g.github, g.store, g.history, g.manifest, { isOnMain: () => true }),
      );
      assert.equal(g.historyRecords.size, 0);
    }
    process.env.EXPECTED_MANIFEST_DIGEST = 'wrong';
    await assert.rejects(begin(f.github, f.store, f.history, f.manifest, { isOnMain: () => true }));
  }));

test('unresolved claim blocks subsequent releases; malformed claim cannot pass as history', async () => {
  const f = fixture();
  f.historyRecords.set(`claims/${f.manifest.tag}.json`, {
    version: 1,
    identity: releaseIdentity(f.manifest),
    runId: 400,
  });
  await assert.rejects(assertClosedClaims(f.history, []), /reconciliation/);
  await assertClosedClaims(f.history, [{ manifest: f.manifest }]);
  f.historyRecords.get(`claims/${f.manifest.tag}.json`).identity = 'f'.repeat(64);
  await assert.rejects(assertClosedClaims(f.history, [{ manifest: f.manifest }]));
});

test('outcome publication failure records audit failure; verified success requires real successful controller job', async () =>
  runtime(async (directory) => {
    const f = fixture();
    process.env.EXPECTED_MANIFEST_DIGEST = digest(f.manifest);
    process.env.DEPLOYMENT_OUTCOME = 'success';
    f.historyRecords.set(`manifests/${f.manifest.tag}/400/1.json`, f.manifest);
    writeFileSync(
      join(directory, 'production-approval.json'),
      canonicalJson(assertApproval(reviews(), current, () => time)),
    );
    await finish(f.github, f.history, f.manifest, { publish: () => {} });
    assert.equal((await outcomes(f.history, f.github))[0].status, 'success');
    f.jobs.set(400, ['prepare']);
    await assert.rejects(outcomes(f.history, f.github));
    const g = fixture();
    g.historyRecords.set(`manifests/${g.manifest.tag}/400/1.json`, g.manifest);
    await assert.rejects(
      finish(g.github, g.history, g.manifest, {
        publish: () => {
          throw new Error('release asset denied');
        },
      }),
    );
    const failed = (await outcomes(g.history, g.github))[0];
    assert.equal(failed.status, 'failure');
    assert.equal(failed.failureStage, 'audit');
    assert.equal(failed.health.ready, true);
  }));

test('rollback Terraform guard allows exact image/commit changes only, never unknown config or destructive actions', () => {
  const before = {
    id: 'id',
    template: [
      { container: [{ image: 'old', env: [{ name: 'COMMIT_SHA', value: 'old' }], cpu: 0.25 }] },
    ],
  };
  const after = structuredClone(before);
  after.template[0].container[0].image = 'new';
  after.template[0].container[0].env[0].value = 'new';
  const change = {
    type: 'azurerm_container_app',
    change: { actions: ['update'], before, after, after_unknown: {} },
  };
  assertRollbackPlan([change]);
  for (const mutate of [
    (c) => (c.change.actions = ['delete', 'create']),
    (c) => (c.type = 'azurerm_postgresql_flexible_server'),
    (c) => (c.change.after.template[0].container[0].cpu = 0.5),
    (c) => (c.change.after_unknown.template = [{ container: [{ cpu: true }] }]),
  ]) {
    const c = structuredClone(change);
    mutate(c);
    assert.throws(() => assertRollbackPlan([c]));
  }
});

test('held production stage preserves old app digests and commit metadata; final stage uses only accepted digests', () => {
  const f = fixture(),
    old = Object.fromEntries(
      imageNames.map((name) => [name, f.receipt.images[name].replace(/@sha256:.*/, ':abc1234')]),
    );
  const variables = imageVariables(f.manifest, old, 'abc1234');
  assert.equal(variables.held.image_tag, 'abc1234');
  assert.equal(variables.held.image_refs.api, old.api);
  assert.equal(variables.held.image_refs.migrate, f.receipt.images.migrate);
  assert.deepEqual(variables.final.image_refs, f.receipt.images);
  assert.throws(() => imageVariables(f.manifest, { ...old, api: 'attacker:latest' }, 'abc1234'));
});

test('rollback request needs successful production history, absent new tag, and explicit schema decision', async () =>
  runtime(async () => {
    const setup = () => {
      const f = fixture();
      const previous = {
        ...structuredClone(f.manifest),
        tag: 'prod-2026-10-11',
        controller: { ...current, id: 401 },
      };
      f.runs.set(401, { ...f.runs.get(400), id: 401 });
      f.jobs.set(401, ['prepare', 'deploy']);
      const outcome = {
        version: 1,
        manifest: previous,
        manifestDigest: digest(previous),
        approval: { actorId: ownerId, runId: 401, attempt: 1, observedAt: time },
        status: 'success',
        health: { ready: true, wiring: true },
        completedAt: time,
        failureStage: null,
      };
      f.historyRecords.set('manifests/prod-2026-10-11/401/1.json', previous);
      f.historyRecords.set('outcomes/prod-2026-10-11/401/1.json', outcome);
      return f;
    };
    const request = {
      operation: 'register-rollback',
      tag: 'prod-2026-10-12',
      rollback_tag: 'prod-2026-10-11',
      schema_compatible: 'true',
      schema_note:
        'Reviewed intervening migrations; old app supports the current additive schema and recovery remains forward-only.',
    };
    const f = setup();
    await prepare(f.github, f.store, f.history, request);
    const decision = f.records.get('rollback-requests/prod-2026-10-12.json');
    assert.equal(decision.actorId, ownerId);
    assert.equal(decision.targetTag, request.rollback_tag);
    for (const mutate of [
      (g) => g.historyRecords.clear(),
      (g) => (g.github.tag = async () => commit),
      (g) => (g.runs.get(401).conclusion = 'failure'),
    ]) {
      const g = setup();
      mutate(g);
      await assert.rejects(prepare(g.github, g.store, g.history, request));
      assert.ok(!g.records.has('rollback-requests/prod-2026-10-12.json'));
    }
    await assert.rejects(
      prepare(setup().github, setup().store, setup().history, {
        ...request,
        schema_compatible: 'false',
      }),
    );
  }));

test('storage listing is fixed-origin, paginated, area-restricted and rejects malformed/missing/access errors', async () => {
  const calls = [];
  const store = releaseStore(
    'synthetic',
    async (url) => {
      calls.push(url);
      return new Response(
        `<EnumerationResults><Blobs><Blob><Name>claims/prod-2026-10-12.json</Name></Blob></Blobs><NextMarker>${calls.length === 1 ? 'next' : ''}</NextMarker></EnumerationResults>`,
      );
    },
    'production',
  );
  assert.equal((await store.list('claims/')).length, 2);
  assert.equal(new URL(calls[1]).searchParams.get('marker'), 'next');
  assert.ok(
    calls.every((url) =>
      url.startsWith('https://veervrattfstate.blob.core.windows.net/production-release-records?'),
    ),
  );
  await assert.rejects(store.list('../tfstate-prod/'));
  await assert.rejects(
    releaseStore(
      'synthetic',
      async () => new Response('<EnumerationResults><Name>../evil</Name></EnumerationResults>'),
      'production',
    ).list('claims/'),
  );
  assert.equal(
    await releaseStore(
      'synthetic',
      async () => new Response('', { status: 404, headers: { 'x-ms-error-code': 'BlobNotFound' } }),
    ).readOptional('probes/1/1.json'),
    null,
  );
  for (const status of [403, 404, 500])
    await assert.rejects(
      releaseStore('synthetic', async () => new Response('', { status })).readOptional(
        'probes/1/1.json',
      ),
    );
});

test('production health parses actual runtime API URL and rejects UAT wiring', async () => {
  const html = (url) =>
    `<script>self.__next_f.push(${JSON.stringify([1, JSON.stringify({ apiBaseUrl: url })])})</script>`;
  assertUatWiring(html('https://api.veervrat.jnanaprabodhini.org/api/v1'), 'prod');
  assert.throws(() =>
    assertUatWiring(html('https://api.uat.veervrat.jnanaprabodhini.org/api/v1'), 'prod'),
  );
  const visited = [];
  assert.deepEqual(
    await verifyUatHealth(async (url) => {
      visited.push(url);
      return new Response(
        url.endsWith('/ready')
          ? JSON.stringify({ data: { status: 'ok', checks: { database: 'up', redis: 'up' } } })
          : html('https://api.veervrat.jnanaprabodhini.org/api/v1'),
      );
    }, 'prod'),
    { ready: true, wiring: true },
  );
  assert.ok(visited.every((url) => !url.includes('.uat.')));
});

test('reviewed controller exception stays narrow; tag workflow has no cloud login/build/deploy', () => {
  const text = readFileSync(controllerPath, 'utf8');
  assert.deepEqual(checkWorkflow(text, controllerPath), []);
  for (const mutated of [
    text.replace('workflows: [CD]', 'workflows: [CI]'),
    text.replace('ref: ${{ github.sha }}', 'ref: ${{ github.event.workflow_run.head_sha }}'),
    text.replace('  workflow_run:', '  pull_request:'),
    text.replace('  prepare:', '  extra:'),
  ])
    assert.ok(checkWorkflow(mutated, controllerPath).length);
  assert.ok(checkWorkflow(text, '.github/workflows/unreviewed.yml').length);
  const cd = readFileSync('.github/workflows/cd.yml', 'utf8');
  const request = cd.split('\n  request-production:\n')[1].split('\n  accept-uat:\n')[0];
  for (const forbidden of ['azure/login', 'id-token', 'deploy-environment', 'terraform', 'docker/'])
    assert.ok(!request.includes(forbidden));
  const action = readFileSync('.github/actions/deploy-environment/action.yml', 'utf8');
  const migration = action.split('- name: Run migrations')[1].split('- name: Deploy apps')[0];
  assert.ok(migration.includes("inputs.rollback != 'true'"));
  assert.ok(
    text.includes('concurrency:\n  group: production-release\n  cancel-in-progress: false'),
  );
});
