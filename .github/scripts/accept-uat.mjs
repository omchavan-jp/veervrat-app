import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  canonicalJson,
  createAcceptance,
  ownerId,
  repository,
  validateReceipt,
} from './release-record.mjs';
import { releaseStore } from './release-store.mjs';

const repoId = 1287947867;
const checkPaths = {
  'Lint · Typecheck · Unit · Build': '.github/workflows/ci.yml',
  'API integration (Postgres + Redis)': '.github/workflows/integration.yml',
  'E2E flows (Playwright)': '.github/workflows/e2e.yml',
};

export function positiveInteger(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw new Error('Positive integer required');
  return Number(value);
}

export function verifyRun(value, { id, attempt, path, commit, owner = false, finished = true }) {
  if (
    value.id !== id ||
    value.run_attempt !== attempt ||
    value.path !== path ||
    value.repository?.id !== repoId ||
    value.head_repository?.id !== repoId ||
    value.head_branch !== 'main' ||
    !['push', 'workflow_dispatch'].includes(value.event) ||
    (commit && value.head_sha !== commit) ||
    (finished && (value.status !== 'completed' || value.conclusion !== 'success')) ||
    (owner &&
      (value.event !== 'workflow_dispatch' ||
        value.actor?.id !== ownerId ||
        value.triggering_actor?.id !== ownerId))
  )
    throw new Error('Untrusted, unauthorized or unsuccessful workflow run');
}

export function verifyJob(jobs, name) {
  const matches = jobs.filter((job) => job.name === name);
  if (
    matches.length !== 1 ||
    matches[0].status !== 'completed' ||
    matches[0].conclusion !== 'success'
  )
    throw new Error(`Successful ${name} job required`);
}

export function githubClient(token, request = fetch) {
  if (!token) throw new Error('GitHub token missing');
  async function get(path) {
    const response = await request(`https://api.github.com/repos/${repository}/${path}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (response.status !== 200)
      throw new Error(`GitHub evidence unavailable: HTTP ${response.status}`);
    return response.json();
  }
  return {
    run(id) {
      return get(`actions/runs/${positiveInteger(id)}`);
    },
    async jobs(id, attempt) {
      const all = [];
      for (let page = 1; page <= 100; page++) {
        const body = await get(
          `actions/runs/${positiveInteger(id)}/attempts/${positiveInteger(attempt)}/jobs?per_page=100&page=${page}`,
        );
        if (!Array.isArray(body.jobs)) throw new Error('Malformed jobs response');
        all.push(...body.jobs);
        if (body.jobs.length < 100) return all;
      }
      throw new Error('Unbounded jobs response');
    },
  };
}

export async function acceptUat({
  store,
  github,
  current,
  deployment,
  note,
  readImages,
  onMain,
  now,
}) {
  const caller = await github.run(current.id);
  verifyRun(caller, { ...current, path: '.github/workflows/cd.yml', owner: true, finished: false });
  const receiptKey = `receipts/uat/${deployment.id}/${deployment.attempt}.json`;
  const receipt = validateReceipt(await store.read(receiptKey));
  if (receipt.run.id !== deployment.id || receipt.run.attempt !== deployment.attempt)
    throw new Error('Receipt belongs to another deployment');
  const deployed = await github.run(deployment.id);
  verifyRun(deployed, { ...deployment, path: '.github/workflows/cd.yml', commit: receipt.commit });
  verifyJob(await github.jobs(deployment.id, deployment.attempt), 'deploy-uat');
  if (!(await onMain(receipt.commit))) throw new Error('Deployment commit not on main');
  for (const check of receipt.checks) {
    verifyRun(await github.run(check.run.id), {
      ...check.run,
      path: checkPaths[check.name],
      commit: receipt.commit,
    });
    verifyJob(await github.jobs(check.run.id, check.run.attempt), check.name);
  }
  if (canonicalJson(await readImages()) !== canonicalJson(receipt.images))
    throw new Error('UAT no longer serves the recorded digest-pinned image set');
  const acceptance = createAcceptance(
    receipt,
    { run: current, acceptedAt: now(), note },
    caller.actor.id,
  );
  const key = `acceptances/uat/${deployment.id}/${deployment.attempt}/${current.id}/${current.attempt}.json`;
  await store.create(key, acceptance);
  if (canonicalJson(await readImages()) !== canonicalJson(receipt.images))
    throw new Error(
      'UAT changed during acceptance; this acceptance run must not authorize release',
    );
  return { receiptKey, acceptanceKey: key, receiptDigest: acceptance.receiptDigest };
}

function azure(args) {
  try {
    return JSON.parse(
      execFileSync('az', [...args, '--only-show-errors', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000,
        maxBuffer: 1048576,
      }),
    );
  } catch {
    throw new Error(
      'Azure read/authentication command failed; see platform access, not missing-artifact assumptions',
    );
  }
}

function liveImages() {
  const images = {};
  for (const [name, kind, resource] of [
    ['api', 'app', 'api'],
    ['web', 'app', 'web'],
    ['migrate', 'job', 'migrate'],
    ['backup', 'job', 'backup'],
  ]) {
    const value = azure([
      'containerapp',
      ...(kind === 'job' ? ['job'] : []),
      'show',
      '-g',
      'veervrat-uat',
      '-n',
      `veervrat-uat-${resource}`,
      '--query',
      kind === 'job'
        ? '{image:properties.template.containers[0].image}'
        : '{image:properties.template.containers[0].image,ready:properties.latestReadyRevisionName,latest:properties.latestRevisionName,state:properties.provisioningState}',
    ]);
    if (
      kind === 'app' &&
      (!value.ready || value.ready !== value.latest || value.state !== 'Succeeded')
    )
      throw new Error('UAT revision not ready');
    images[name] = value.image;
  }
  return images;
}

async function main() {
  const current = {
    id: positiveInteger(process.env.GITHUB_RUN_ID),
    attempt: positiveInteger(process.env.GITHUB_RUN_ATTEMPT),
  };
  if (process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_REPOSITORY !== repository)
    throw new Error('Main-only repository operation');
  const github = githubClient(process.env.GH_TOKEN);
  const caller = await github.run(current.id);
  verifyRun(caller, { ...current, path: '.github/workflows/cd.yml', owner: true, finished: false });
  const store = releaseStore(
    azure(['account', 'get-access-token', '--resource', 'https://storage.azure.com/']).accessToken,
  );
  if (process.env.RELEASE_OPERATION === 'verify-release-storage') {
    await store.verifyCreateOnly(`probes/${current.id}/${current.attempt}.json`, {
      version: 1,
      purpose: 'storage-verification-not-release-acceptance',
      run: current,
    });
    console.log(
      'Release storage conditional create, read-back and overwrite denial verified; no UAT acceptance created',
    );
    return;
  }
  if (process.env.RELEASE_OPERATION !== 'accept-uat') throw new Error('Unknown release operation');
  const result = await acceptUat({
    store,
    github,
    current,
    deployment: {
      id: positiveInteger(process.env.UAT_RUN_ID),
      attempt: positiveInteger(process.env.UAT_RUN_ATTEMPT),
    },
    note: process.env.UAT_VERIFICATION_NOTE,
    readImages: liveImages,
    onMain: async (commit) => {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', commit, 'refs/remotes/origin/main'], {
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    },
    now: () => new Date().toISOString(),
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
