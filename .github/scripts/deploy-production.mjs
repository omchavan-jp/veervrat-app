import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { azure, liveImages, positiveInteger } from './accept-uat.mjs';
import { verifyUatHealth } from './record-uat.mjs';
import { canonicalJson, repository } from './release-record.mjs';
import { digest, validateManifest } from './production-release.mjs';

export function imageVariables(manifest, current, label) {
  validateManifest(manifest);
  if (!/^[a-f0-9]{7,40}$/.test(label))
    throw new Error('Current production commit metadata missing');
  for (const name of ['api', 'web', 'migrate', 'backup']) {
    const repo = name === 'migrate' ? 'api-migrate' : name;
    if (
      !new RegExp(
        `^veervratacr\\.azurecr\\.io/veervrat-${repo}(?:@sha256:[a-f0-9]{64}|:[a-f0-9]{7,40})$`,
      ).test(current[name])
    )
      throw new Error(
        'Unrecognized current production image; read failure is not first deployment',
      );
  }
  return {
    held: {
      image_tag: label,
      deploy_apps: true,
      image_refs: { ...manifest.images, api: current.api, web: current.web },
    },
    final: {
      image_tag: manifest.commit.slice(0, 7),
      deploy_apps: true,
      image_refs: manifest.images,
    },
  };
}

function load() {
  const manifest = validateManifest(JSON.parse(readFileSync(process.env.MANIFEST_FILE, 'utf8')));
  if (
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.GITHUB_REPOSITORY !== repository ||
    digest(manifest) !== process.env.EXPECTED_MANIFEST_DIGEST ||
    manifest.controller.commit !== process.env.GITHUB_SHA ||
    manifest.controller.id !== positiveInteger(process.env.GITHUB_RUN_ID) ||
    manifest.controller.attempt !== positiveInteger(process.env.GITHUB_RUN_ATTEMPT)
  )
    throw new Error('Trusted current production manifest required');
  const approval = JSON.parse(
    readFileSync(join(process.env.RUNNER_TEMP, 'production-approval.json'), 'utf8'),
  );
  if (
    approval.runId !== manifest.controller.id ||
    approval.attempt !== 1 ||
    approval.actorId !== 317451750
  )
    throw new Error('Production authorization missing');
  return manifest;
}

async function main() {
  const manifest = load();
  if (process.argv[2] === 'verify') {
    // Warm scale-to-zero replicas before requiring sole active healthy revisions.
    await verifyUatHealth(fetch, 'prod');
    if (canonicalJson(await liveImages('prod')) !== canonicalJson(manifest.images))
      throw new Error('Production does not serve the approved exact digests');
    await verifyUatHealth(fetch, 'prod');
    return;
  }
  if (process.argv[2] !== 'prepare') throw new Error('Unknown production image command');
  const current = {};
  for (const name of ['api', 'web', 'migrate', 'backup']) {
    current[name] = azure([
      'containerapp',
      ...(['migrate', 'backup'].includes(name) ? ['job'] : []),
      'show',
      '-g',
      'veervrat-prod',
      '-n',
      `veervrat-prod-${name}`,
      '--query',
      'properties.template.containers[0].image',
    ]);
  }
  const labels = azure([
    'containerapp',
    'show',
    '-g',
    'veervrat-prod',
    '-n',
    'veervrat-prod-api',
    '--query',
    "properties.template.containers[0].env[?name=='COMMIT_SHA'].value",
  ]);
  if (!Array.isArray(labels) || labels.length !== 1)
    throw new Error('Production API commit label ambiguous');
  const variables = imageVariables(manifest, current, labels[0]);
  for (const ref of Object.values(manifest.images)) {
    if (
      azure([
        'acr',
        'repository',
        'show',
        '-n',
        'veervratacr',
        '--image',
        ref.split('/')[1],
        '--query',
        'digest',
      ]) !== ref.split('@')[1]
    )
      throw new Error('Accepted digest missing from registry');
  }
  const directory = mkdtempSync(join(process.env.RUNNER_TEMP, 'digest-deployment-'));
  for (const [stage, value] of Object.entries(variables)) {
    const file = join(directory, `${stage}.tfvars.json`);
    writeFileSync(file, canonicalJson(value), { mode: 0o600 });
    appendFileSync(process.env.GITHUB_OUTPUT, `${stage}_vars=${file}\n`);
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `migrate_image=${manifest.images.migrate}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
