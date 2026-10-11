import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  azure,
  checkPaths,
  githubClient,
  liveImages,
  positiveInteger,
  verifyJob,
  verifyRun,
} from './accept-uat.mjs';
import { canonicalJson, repository, requiredChecks, validateReceipt } from './release-record.mjs';
import { releaseStore } from './release-store.mjs';

export async function collectChecks(github, commit) {
  const checks = [];
  for (const name of requiredChecks) {
    const runs = await github.workflowRuns(checkPaths[name].split('/').at(-1), commit);
    const latest = runs.sort((a, b) => b.id - a.id)[0];
    if (!latest || latest.status !== 'completed') throw new Error('CHECKS_PENDING');
    const run = { id: latest.id, attempt: latest.run_attempt };
    verifyRun(latest, { ...run, path: checkPaths[name], commit });
    verifyJob(await github.jobs(run.id, run.attempt), name);
    checks.push({ name, run, commit, conclusion: 'success' });
  }
  return checks;
}

export async function recordUat({ github, store, run, commit, desired, readImages, health, now }) {
  verifyRun(await github.run(run.id), {
    ...run,
    path: '.github/workflows/cd.yml',
    commit,
    finished: false,
  });
  const images = await readImages();
  if (canonicalJson(images) !== canonicalJson(desired))
    throw new Error('Deployed image set does not match exact build digests');
  const receipt = validateReceipt({
    version: 1,
    repository,
    commit,
    run,
    completedAt: now(),
    images,
    checks: await collectChecks(github, commit),
    health,
  });
  const key = `receipts/uat/${run.id}/${run.attempt}.json`;
  await store.create(key, receipt);
  if (canonicalJson(await readImages()) !== canonicalJson(images))
    throw new Error('UAT changed while recording; run must not authorize acceptance');
  return { key, images, commit };
}

async function main() {
  if (process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_REPOSITORY !== repository)
    throw new Error('UAT receipt is main-only');
  const github = githubClient(process.env.GH_TOKEN);
  const run = {
    id: positiveInteger(process.env.GITHUB_RUN_ID),
    attempt: positiveInteger(process.env.GITHUB_RUN_ATTEMPT),
  };
  const desired = JSON.parse(readFileSync(process.env.DEPLOYMENT_VARS, 'utf8')).image_refs;
  const store = releaseStore(
    azure(['account', 'get-access-token', '--resource', 'https://storage.azure.com/']).accessToken,
  );
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const result = await recordUat({
        github,
        store,
        run,
        commit: process.env.GITHUB_SHA,
        desired,
        readImages: liveImages,
        health: {
          ready: process.env.READY_VERIFIED === 'true',
          wiring: process.env.WIRING_VERIFIED === 'true',
        },
        now: () => new Date().toISOString(),
      });
      console.log(JSON.stringify(result));
      return;
    } catch (error) {
      if (error.message !== 'CHECKS_PENDING') throw error;
      console.log('Waiting for exact-main-commit required checks before recording UAT');
      await new Promise((resolveWait) => setTimeout(resolveWait, 30000));
    }
  }
  throw new Error('Required checks not ready; no receipt created');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
