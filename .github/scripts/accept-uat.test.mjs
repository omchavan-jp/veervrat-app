import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { acceptUat, githubClient, positiveInteger, verifyRun } from './accept-uat.mjs';
import { releaseStore } from './release-store.mjs';
import { imageNames, requiredChecks } from './release-record.mjs';

test('acceptance workflow is manual, main-only, owner-only and non-deploying', () => {
  const text = readFileSync('.github/workflows/cd.yml', 'utf8');
  const job = text.split('\n  accept-uat:\n')[1].split('\n  verify-build:\n')[0];
  assert.ok(job.includes("github.event_name == 'workflow_dispatch'"));
  assert.ok(job.includes("github.ref == 'refs/heads/main'"));
  assert.ok(job.includes("github.actor_id == '317451750'"));
  assert.ok(job.includes("github.triggering_actor == 'omchavan-jp'"));
  assert.ok(job.includes('environment: uat'));
  assert.ok(job.includes('actions: read'));
  assert.ok(job.includes('run: node .github/scripts/accept-uat.mjs'));
  assert.ok(!job.includes('deploy-environment'));
  assert.ok(!job.includes('terraform'));
  assert.ok(!job.includes('run: ${{'));
});

function fixture() {
  const receipt = {
    version: 1,
    repository: 'omchavan-jp/veervrat-app',
    commit: 'a'.repeat(40),
    run: { id: 100, attempt: 1 },
    completedAt: '2026-10-11T11:00:00.000Z',
    images: Object.fromEntries(
      imageNames.map((name) => [
        name,
        `veervratacr.azurecr.io/veervrat-${name === 'migrate' ? 'api-migrate' : name}@sha256:${'a'.repeat(64)}`,
      ]),
    ),
    checks: requiredChecks.map((name, index) => ({
      name,
      run: { id: 200 + index, attempt: 1 },
      commit: 'a'.repeat(40),
      conclusion: 'success',
    })),
    health: { ready: true, wiring: true },
  };
  const base = {
    run_attempt: 1,
    repository: { id: 1287947867 },
    head_repository: { id: 1287947867 },
    head_branch: 'main',
    head_sha: receipt.commit,
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };
  const runs = new Map([
    [
      300,
      {
        ...base,
        id: 300,
        path: '.github/workflows/cd.yml',
        event: 'workflow_dispatch',
        actor: { id: 317451750 },
        triggering_actor: { id: 317451750 },
        status: 'in_progress',
        conclusion: null,
      },
    ],
    [100, { ...base, id: 100, path: '.github/workflows/cd.yml' }],
    ...['ci', 'integration', 'e2e'].map((name, index) => [
      200 + index,
      { ...base, id: 200 + index, path: `.github/workflows/${name}.yml` },
    ]),
  ]);
  const jobs = new Map([
    [100, [{ name: 'deploy-uat', status: 'completed', conclusion: 'success' }]],
    ...requiredChecks.map((name, index) => [
      200 + index,
      [{ name, status: 'completed', conclusion: 'success' }],
    ]),
  ]);
  const writes = [];
  const options = {
    current: { id: 300, attempt: 1 },
    deployment: { id: 100, attempt: 1 },
    note: 'Exercised credential login, journey creation and mentor messaging on UAT.',
    github: { run: async (id) => runs.get(id), jobs: async (id) => jobs.get(id) },
    store: { read: async () => receipt, create: async (key, value) => writes.push({ key, value }) },
    readImages: async () => receipt.images,
    onMain: async () => true,
    now: () => '2026-10-11T12:00:00.000Z',
  };
  return { receipt, runs, jobs, writes, options };
}

test('owner acceptance revalidates trusted runs/jobs, checks, history and live digests', async () => {
  const { options, writes } = fixture();
  const result = await acceptUat(options);
  assert.equal(result.acceptanceKey, 'acceptances/uat/100/1/300/1.json');
  assert.equal(writes.length, 2);
  assert.equal(writes[0].value.actorId, 317451750);
});

test('spoofed origin, non-owner rerun, failed/skipped job and SHA/attempt mismatch never write', async () => {
  for (const mutate of [
    (f) => (f.runs.get(300).actor.id = 1),
    (f) => (f.runs.get(300).triggering_actor.id = 1),
    (f) => (f.runs.get(300).head_repository.id = 1),
    (f) => (f.runs.get(300).head_branch = 'feature'),
    (f) => (f.runs.get(100).conclusion = 'failure'),
    (f) => (f.runs.get(100).event = 'pull_request'),
    (f) => (f.runs.get(100).run_attempt = 2),
    (f) => (f.runs.get(100).path = '.github/workflows/fake.yml'),
    (f) => (f.jobs.get(100)[0].conclusion = 'skipped'),
    (f) => f.jobs.get(100).push(f.jobs.get(100)[0]),
    (f) => (f.runs.get(200).head_sha = 'b'.repeat(40)),
    (f) => (f.runs.get(200).path = '.github/workflows/fake.yml'),
    (f) => (f.options.onMain = async () => false),
    (f) => (f.options.readImages = async () => ({ ...f.receipt.images, web: 'mutable:tag' })),
    (f) =>
      (f.options.store.read = async () => {
        throw new Error('missing receipt');
      }),
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(acceptUat(f.options));
    assert.equal(f.writes.length, 0);
  }
});

test('changes after write fail the acceptance workflow; storage failure is not success', async () => {
  const f = fixture();
  let count = 0;
  f.options.readImages = async () => (++count === 1 ? f.receipt.images : {});
  await assert.rejects(acceptUat(f.options), /changed during/);
  const g = fixture();
  g.options.store.create = async () => {
    throw new Error('storage denied');
  };
  await assert.rejects(acceptUat(g.options), /storage denied/);
});

test('run IDs reject path/shell injection and unsafe integer values', () => {
  for (const value of ['../1', '1;echo', '01', '0', '-1', '9007199254740992', undefined])
    assert.throws(() => positiveInteger(value));
  assert.equal(positiveInteger('123'), 123);
  assert.throws(() => verifyRun({}, { id: 1, attempt: 1, path: 'ignored' }));
});

test('GitHub jobs pagination includes later pages rather than trusting the first', async () => {
  const urls = [];
  const client = githubClient('synthetic', async (url) => {
    urls.push(url);
    return {
      status: 200,
      json: async () => ({
        jobs: urls.length === 1 ? Array.from({ length: 100 }, () => ({})) : [{ name: 'last' }],
      }),
    };
  });
  const jobs = await client.jobs(1, 2);
  assert.equal(jobs.length, 101);
  assert.equal(jobs[100].name, 'last');
  assert.ok(urls[1].endsWith('page=2'));
});

test('storage uses fixed private origin, OAuth and conditional create with read-back', async () => {
  const calls = [];
  let saved;
  const store = releaseStore('synthetic', async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'PUT') {
      if (saved)
        return new Response('', { status: 412, headers: { 'x-ms-error-code': 'ConditionNotMet' } });
      saved = options.body;
      return new Response('', { status: 201 });
    }
    return new Response(saved, { status: 200 });
  });
  await store.verifyCreateOnly('probes/1/1.json', { note: 'परीक्षण' });
  assert.equal(calls.length, 4);
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, 'https://veervrattfstate.blob.core.windows.net');
    assert.equal(options.headers.Authorization, 'Bearer synthetic');
    assert.equal(options.redirect, 'error');
    if (options.method === 'PUT') assert.equal(options.headers['If-None-Match'], '*');
  }
  await assert.rejects(store.read('../tfstate-prod/prod.tfstate'));
});

test('storage missing, auth, network, malformed, oversized and read-back mismatch fail closed', async () => {
  for (const status of [403, 404, 500]) {
    const store = releaseStore('synthetic', async () => new Response('', { status }));
    await assert.rejects(store.read('probes/1/1.json'));
    await assert.rejects(store.create('probes/1/1.json', {}));
  }
  const network = releaseStore('synthetic', async () => {
    throw new Error('network');
  });
  await assert.rejects(network.read('probes/1/1.json'));
  for (const body of ['not json', ' '.repeat(131073)]) {
    await assert.rejects(
      releaseStore('synthetic', async () => new Response(body)).read('probes/1/1.json'),
    );
  }
  const mismatch = releaseStore(
    'synthetic',
    async (_url, options) =>
      new Response(options.method === 'PUT' ? '' : '{}', {
        status: options.method === 'PUT' ? 201 : 200,
      }),
  );
  await assert.rejects(mismatch.create('probes/1/1.json', { expected: true }), /mismatch/);
});

test('probe does not mistake access failure for overwrite protection', async () => {
  let puts = 0;
  const store = releaseStore('synthetic', async (_url, options) => {
    if (options.method === 'PUT') return new Response('', { status: ++puts === 1 ? 201 : 403 });
    return new Response('{"version":1}');
  });
  await assert.rejects(store.verifyCreateOnly('probes/1/1.json', { version: 1 }), /not proven/);
});
