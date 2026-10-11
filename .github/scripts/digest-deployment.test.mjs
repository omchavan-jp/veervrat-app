import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildImageRecord, selectImageSet } from './deploy-image-set.mjs';
import { assertUatWiring, collectChecks, recordUat, verifyUatHealth } from './record-uat.mjs';
import { assertServingRevision } from './accept-uat.mjs';
import { imageNames, requiredChecks, validateImages } from './release-record.mjs';

const context = {
  repository: 'omchavan-jp/veervrat-app',
  commit: 'a'.repeat(40),
  id: 123,
  attempt: 1,
};
const records = () =>
  imageNames.map((name, index) =>
    buildImageRecord(name, `sha256:${String(index).repeat(64)}`, context),
  );
const old = {
  api: 'veervratacr.azurecr.io/veervrat-api:abc1234',
  web: 'veervratacr.azurecr.io/veervrat-web:abc1234',
};

test('migration ordering holds exact old apps and moves jobs before apps', () => {
  const { desired, held } = selectImageSet(records(), old, context, true);
  validateImages(desired);
  assert.equal(held.api, old.api);
  assert.equal(held.web, old.web);
  assert.equal(held.migrate, desired.migrate);
  assert.equal(held.backup, desired.backup);
  assert.notEqual(desired.api, old.api);
});

test('docs-only deploy preserves all components except web', () => {
  const current = selectImageSet(records(), old, context, true).desired;
  const web = buildImageRecord('web', `sha256:${'f'.repeat(64)}`, context);
  const { desired } = selectImageSet([web], current, context, false);
  for (const name of ['api', 'migrate', 'backup']) assert.equal(desired[name], current[name]);
  assert.equal(desired.web, web.ref);
  assert.throws(() => selectImageSet([web], old, context, false));
});

test('build record spoofing, different attempts, duplicate/missing images and mutable references fail', () => {
  for (const mutate of [
    (r) => r.pop(),
    (r) => r.push(r[0]),
    (r) => (r[1].image = r[0].image),
    (r) => r[0].attempt++,
    (r) => r[0].id++,
    (r) => (r[0].commit = 'b'.repeat(40)),
    (r) => (r[0].repository = 'attacker/repo'),
    (r) => (r[0].ref = old.api),
    (r) => (r[0].ref = r[1].ref),
    (r) => (r[0].extra = true),
  ]) {
    const r = records();
    mutate(r);
    assert.throws(() => selectImageSet(r, old, context, true));
  }
  assert.throws(() => buildImageRecord('api', 'sha256:short', context));
});

function receiptFixture() {
  const images = selectImageSet(records(), old, context, true).desired;
  const base = {
    run_attempt: 1,
    repository: { id: 1287947867 },
    head_repository: { id: 1287947867 },
    head_sha: context.commit,
    head_branch: 'main',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };
  const runs = ['ci', 'integration', 'e2e'].map((name, index) => ({
    ...base,
    id: 200 + index,
    path: `.github/workflows/${name}.yml`,
  }));
  const writes = [];
  const github = {
    run: async () => ({
      ...base,
      id: context.id,
      path: '.github/workflows/cd.yml',
      status: 'in_progress',
      conclusion: null,
    }),
    workflowRuns: async (name) => [runs[['ci.yml', 'integration.yml', 'e2e.yml'].indexOf(name)]],
    jobs: async (id) => [
      { name: requiredChecks[id - 200], status: 'completed', conclusion: 'success' },
    ],
  };
  const options = {
    github,
    store: { create: async (key, value) => writes.push({ key, value }) },
    run: { id: context.id, attempt: 1 },
    commit: context.commit,
    desired: images,
    readImages: async () => images,
    health: { ready: true, wiring: true },
    now: () => '2026-10-11T12:00:00.000Z',
  };
  return { runs, writes, options };
}

test('receipt captures exact images/checks and durable run/attempt identity', async () => {
  const { options, writes } = receiptFixture();
  const result = await recordUat(options);
  assert.equal(result.key, 'receipts/uat/123/1.json');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.checks.length, 3);
});

test('latest failed/running check cannot be replaced with older success', async () => {
  const { runs, options } = receiptFixture();
  const oldRun = { ...runs[0], id: 1 };
  runs[0].conclusion = 'failure';
  options.github.workflowRuns = async () => [oldRun, runs[0]];
  await assert.rejects(collectChecks(options.github, context.commit));
  runs[0].status = 'in_progress';
  await assert.rejects(collectChecks(options.github, context.commit), /CHECKS_PENDING/);
});

test('failed health, digest drift, untrusted run and unavailable checks never persist receipts', async () => {
  for (const mutate of [
    (f) => (f.options.health.ready = false),
    (f) => (f.options.health.wiring = false),
    (f) => (f.options.readImages = async () => ({ ...f.options.desired, api: old.api })),
    (f) => (f.runs[0].head_sha = 'b'.repeat(40)),
    (f) => (f.options.github.workflowRuns = async () => []),
    (f) => (f.options.github.run = async () => ({})),
  ]) {
    const f = receiptFixture();
    mutate(f);
    await assert.rejects(recordUat(f.options));
    assert.equal(f.writes.length, 0);
  }
});

test('every app/maintenance/backup image uses the explicit set; both wrappers forward it', () => {
  const module = 'infra/terraform/modules/environment/';
  for (const file of [
    'migration-job',
    'seed-job',
    'grant-admin-job',
    'publish-policies-job',
    'wipe-users-job',
    'cleanup-expired-job',
  ])
    assert.match(readFileSync(`${module}${file}.tf`, 'utf8'), /image\s*= local\.migrate_image_ref/);
  assert.match(readFileSync(`${module}backup-job.tf`, 'utf8'), /image\s*= local\.backup_image_ref/);
  for (const env of ['uat', 'prod'])
    assert.match(
      readFileSync(`infra/terraform/envs/${env}/main.tf`, 'utf8'),
      /image_refs\s*= var\.image_refs/,
    );
  const workflow = readFileSync('.github/workflows/cd.yml', 'utf8');
  const uat = workflow.split('\n  deploy-uat:\n')[1].split('\n  deploy-prod:\n')[0];
  assert.ok(uat.includes("digest_images: 'true'"));
  assert.ok(uat.includes('record-uat.mjs'));
  const prod = workflow.split('\n  deploy-prod:\n')[1].split('\n  accept-uat:\n')[0];
  assert.ok(!prod.includes('record-uat.mjs'));
  assert.ok(!prod.includes("digest_images: 'true'"));
});

test('plan guard rejects deletion/replacement and accepts ordinary update/create', () => {
  const text = readFileSync('.github/scripts/apply-image-stage.sh', 'utf8');
  const filter = text.split("jq -e '")[1].split("' > /dev/null")[0];
  for (const actions of [['delete'], ['create', 'delete'], ['delete', 'create']])
    assert.throws(() =>
      execFileSync('jq', ['-e', filter], {
        input: JSON.stringify({
          format_version: '1.2',
          resource_changes: [{ change: { actions } }],
        }),
        stdio: ['pipe', 'ignore', 'ignore'],
      }),
    );
  for (const actions of [['no-op'], ['update'], ['create']])
    execFileSync('jq', ['-e', filter], {
      input: JSON.stringify({ format_version: '1.2', resource_changes: [{ change: { actions } }] }),
      stdio: ['pipe', 'ignore', 'ignore'],
    });
});

test('migration proof is execution-scoped and observability failure cannot allow rollout', () => {
  const action = readFileSync('.github/actions/deploy-environment/action.yml', 'utf8');
  assert.ok(action.includes("ContainerGroupName_s startswith '$EXEC'"));
  assert.ok(action.includes('migration NOT verified; stopping deployment'));
  assert.ok(!action.includes('::warning::could not read job logs'));
  assert.ok(action.includes('.data.checks.database == "up"'));
  assert.ok(action.includes('.data.checks.redis == "up"'));
});

test('read-only verification accepts real digest sets and legacy SHA tags without treating digest as commit', () => {
  const action = readFileSync('.github/actions/verify-azure-identity/action.yml', 'utf8');
  const loop = action.slice(action.indexOf('for entry in API'), action.indexOf('API_COMMIT='));
  const refs = selectImageSet(records(), old, context, true).desired;
  const env = {
    ...process.env,
    API_IMAGE: refs.api,
    WEB_IMAGE: refs.web,
    JOB_IMAGE: refs.migrate,
    BACKUP_IMAGE: refs.backup,
  };
  execFileSync('bash', ['-ec', loop], { env });
  const legacy = {
    ...env,
    API_IMAGE: old.api,
    WEB_IMAGE: old.web,
    JOB_IMAGE: 'veervratacr.azurecr.io/veervrat-api-migrate:abc1234',
    BACKUP_IMAGE: 'veervratacr.azurecr.io/veervrat-backup:def5678',
  };
  execFileSync('bash', ['-ec', loop], { env: legacy });
  for (const image of [
    'attacker.invalid/api:abc1234',
    'veervratacr.azurecr.io/veervrat-api:latest',
    'veervratacr.azurecr.io/veervrat-api@sha256:short',
  ])
    assert.throws(() =>
      execFileSync('bash', ['-ec', loop], { env: { ...env, API_IMAGE: image }, stdio: 'ignore' }),
    );
  assert.ok(action.includes('-var="image_tag=$API_COMMIT"'));
  assert.ok(action.includes('-var="image_refs=$IMAGE_REFS"'));
});

test('serving proof needs one latest healthy active revision on the exact configured image', () => {
  const value = { state: 'Succeeded', mode: 'Single', latest: 'app-new', image: 'digest-new' };
  const revisions = [{ name: 'app-new', health: 'Healthy', image: 'digest-new' }];
  assertServingRevision(value, revisions, 'api');
  for (const bad of [
    [],
    [...revisions, revisions[0]],
    [{ ...revisions[0], name: 'app-old' }],
    [{ ...revisions[0], health: 'Unhealthy' }],
    [{ ...revisions[0], image: 'digest-old' }],
  ])
    assert.throws(() => assertServingRevision(value, bad, 'api'), /UAT_REVISION_PENDING/);
  assert.throws(() => assertServingRevision({ ...value, mode: 'Multiple' }, revisions, 'web'));
  assert.throws(() => assertServingRevision({ ...value, state: 'Updating' }, revisions, 'web'));
});

test('fresh post-revision probes require HTTP success, DB/Redis up and the UAT API URL', async () => {
  const html = (url) =>
    `<script>self.__next_f.push(${JSON.stringify([1, JSON.stringify({ apiBaseUrl: url })])})</script>`;
  const good = { data: { status: 'ok', checks: { database: 'up', redis: 'up' } } };
  const request = async (url) =>
    new Response(
      url.endsWith('/ready')
        ? JSON.stringify(good)
        : html('https://api.uat.veervrat.jnanaprabodhini.org/api/v1'),
    );
  assert.deepEqual(await verifyUatHealth(request), { ready: true, wiring: true });
  await assert.rejects(verifyUatHealth(async () => new Response('', { status: 500 })));
  await assert.rejects(verifyUatHealth(async () => new Response('{}')));
  await assert.rejects(
    verifyUatHealth(
      async (url) =>
        new Response(
          url.endsWith('/ready')
            ? JSON.stringify(good)
            : html('https://api.veervrat.jnanaprabodhini.org/api/v1'),
        ),
    ),
  );
  for (const bad of [
    'https://attacker.invalid/?url=https://api.uat.veervrat.jnanaprabodhini.org/api/v1',
    'https://api.uat.veervrat.jnanaprabodhini.org.attacker.invalid/api/v1',
    'https://user:password@api.uat.veervrat.jnanaprabodhini.org/api/v1',
    'https://api.uat.veervrat.jnanaprabodhini.org/api/v1?bad=1',
  ])
    assert.throws(() => assertUatWiring(html(bad)));
  assert.throws(() =>
    assertUatWiring('<!-- https://api.uat.veervrat.jnanaprabodhini.org/api/v1 -->'),
  );
});
