import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { azure, positiveInteger } from './accept-uat.mjs';
import { imageNames, repository, validateImages } from './release-record.mjs';

export function buildImageRecord(image, digest, context) {
  if (
    !imageNames.includes(image) ||
    !/^sha256:[a-f0-9]{64}$/.test(digest) ||
    !/^[a-f0-9]{40}$/.test(context.commit) ||
    context.repository !== repository
  )
    throw new Error('Invalid build image identity');
  positiveInteger(context.id);
  positiveInteger(context.attempt);
  const repo = image === 'migrate' ? 'api-migrate' : image;
  return { image, ref: `veervratacr.azurecr.io/veervrat-${repo}@${digest}`, ...context };
}

export function selectImageSet(records, current, context, deployApps) {
  const expected = deployApps ? imageNames : ['web'];
  if (records.length !== expected.length) throw new Error('Missing/extra build records');
  const desired = deployApps ? {} : { ...validateImages(current) };
  const seen = new Set();
  for (const record of records) {
    if (
      Object.keys(record).sort().join(',') !==
        ['image', 'ref', 'commit', 'repository', 'id', 'attempt'].sort().join(',') ||
      !expected.includes(record.image) ||
      seen.has(record.image) ||
      record.commit !== context.commit ||
      record.repository !== repository ||
      record.id !== context.id ||
      record.attempt !== context.attempt
    )
      throw new Error('Untrusted or ambiguous build record');
    seen.add(record.image);
    desired[record.image] = record.ref;
  }
  validateImages(desired);
  return {
    desired,
    held: deployApps ? { ...desired, api: current.api, web: current.web } : desired,
  };
}

function context() {
  return {
    repository: process.env.GITHUB_REPOSITORY,
    commit: process.env.GITHUB_SHA,
    id: positiveInteger(process.env.GITHUB_RUN_ID),
    attempt: positiveInteger(process.env.GITHUB_RUN_ATTEMPT),
  };
}

function main() {
  const ctx = context();
  if (process.argv[2] === 'build') {
    const repo = process.env.BUILD_IMAGE;
    const image = repo === 'veervrat-api-migrate' ? 'migrate' : repo?.replace(/^veervrat-/, '');
    const record = buildImageRecord(image, process.env.BUILD_DIGEST, ctx);
    writeFileSync(join(process.env.RUNNER_TEMP, 'image.json'), JSON.stringify(record), {
      mode: 0o600,
    });
    return;
  }
  if (
    process.env.DEPLOY_ENVIRONMENT !== 'uat' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    ctx.repository !== repository
  )
    throw new Error('Digest deployment preparation is UAT/main only');
  if (
    !/^[a-f0-9]{7,40}$/.test(process.env.IMAGE_TAG) ||
    !ctx.commit.startsWith(process.env.IMAGE_TAG)
  )
    throw new Error('Image label does not match checkout');
  if (!['true', 'false'].includes(process.env.DEPLOY_APPS))
    throw new Error('Invalid deployment mode');
  const deployApps = process.env.DEPLOY_APPS === 'true';
  const directory = mkdtempSync(join(process.env.RUNNER_TEMP, 'digest-deployment-'));
  const records = [];
  for (const name of deployApps ? imageNames : ['web']) {
    const repo = name === 'migrate' ? 'api-migrate' : name;
    const target = join(directory, name);
    execFileSync(
      'gh',
      [
        'run',
        'download',
        String(ctx.id),
        '--repo',
        repository,
        '--name',
        `image-${ctx.attempt}-veervrat-${repo}`,
        '--dir',
        target,
      ],
      { stdio: 'inherit', timeout: 60000 },
    );
    records.push(JSON.parse(readFileSync(join(target, 'image.json'), 'utf8')));
  }
  const current = {};
  for (const [name, job] of [
    ['api', false],
    ['web', false],
    ['migrate', true],
    ['backup', true],
  ]) {
    current[name] = azure([
      'containerapp',
      ...(job ? ['job'] : []),
      'show',
      '-g',
      'veervrat-uat',
      '-n',
      `veervrat-uat-${name}`,
      '--query',
      'properties.template.containers[0].image',
    ]);
    const repo = name === 'migrate' ? 'api-migrate' : name;
    if (
      typeof current[name] !== 'string' ||
      !new RegExp(
        `^veervratacr\\.azurecr\\.io/veervrat-${repo}(@sha256:[a-f0-9]{64}|:[a-f0-9]{7,40})$`,
      ).test(current[name])
    )
      throw new Error('Unexpected current image; never assume a first deployment on read failure');
  }
  const { desired, held } = selectImageSet(records, current, ctx, deployApps);
  for (const ref of Object.values(desired)) {
    const digest = ref.split('@')[1];
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
      ]) !== digest
    )
      throw new Error('Registry digest could not be verified');
  }
  let label = process.env.IMAGE_TAG;
  if (!deployApps) {
    const labels = azure([
      'containerapp',
      'show',
      '-g',
      'veervrat-uat',
      '-n',
      'veervrat-uat-api',
      '--query',
      "properties.template.containers[0].env[?name=='COMMIT_SHA'].value",
    ]);
    if (!Array.isArray(labels) || labels.length !== 1 || !/^[a-f0-9]{7,40}$/.test(labels[0]))
      throw new Error('Current API commit metadata missing');
    label = labels[0];
  }
  for (const [stage, images] of [
    ['held', held],
    ['final', desired],
  ]) {
    const file = join(directory, `${stage}.tfvars.json`);
    writeFileSync(
      file,
      JSON.stringify({ image_tag: label, deploy_apps: true, image_refs: images }),
      { mode: 0o600 },
    );
    appendFileSync(process.env.GITHUB_OUTPUT, `${stage}_vars=${file}\n`);
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `migrate_image=${desired.migrate}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
