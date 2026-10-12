import { createHash } from 'node:crypto';

export const repository = 'omchavan-jp/veervrat-app';
export const ownerId = 317451750;
export const imageNames = ['api', 'migrate', 'web', 'backup'];
export const requiredChecks = [
  'Lint · Typecheck · Unit · Build',
  'API integration (Postgres + Redis)',
  'E2E flows (Playwright)',
];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value, keys, label) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), label);
  requireValue(
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)),
    `${label}: unexpected or missing fields`,
  );
}

function timestamp(value) {
  requireValue(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    'Invalid UTC timestamp',
  );
  return Date.parse(value);
}

function run(value) {
  object(value, ['id', 'attempt'], 'Workflow run');
  requireValue(Number.isSafeInteger(value.id) && value.id > 0, 'Invalid run ID');
  requireValue(Number.isSafeInteger(value.attempt) && value.attempt > 0, 'Invalid run attempt');
}

export function note(value) {
  requireValue(
    typeof value === 'string' &&
      value.trim() === value &&
      value.length >= 30 &&
      value.length <= 4000 &&
      value.split(/\s+/).length >= 6 &&
      !/[\u0000-\u001f\u007f]/.test(value),
    'Supply a concrete verification/recovery note (30–4000 characters, at least six words)',
  );
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  requireValue(
    value !== undefined && (typeof value !== 'number' || Number.isFinite(value)),
    'Non-JSON value',
  );
  const encoded = JSON.stringify(value);
  requireValue(typeof encoded === 'string', 'Non-JSON value');
  return encoded;
}

export function validateImages(images) {
  object(images, imageNames, 'Image set');
  for (const name of imageNames) {
    const repo = name === 'migrate' ? 'api-migrate' : name;
    requireValue(
      typeof images[name] === 'string' &&
        new RegExp(`^veervratacr\\.azurecr\\.io/veervrat-${repo}@sha256:[a-f0-9]{64}$`).test(
          images[name],
        ),
      `Digest-pinned ${name} image required`,
    );
  }
  return images;
}

export function validateReceipt(receipt) {
  object(
    receipt,
    ['version', 'repository', 'commit', 'run', 'completedAt', 'images', 'checks', 'health'],
    'UAT receipt',
  );
  requireValue(
    receipt.version === 1 && receipt.repository === repository,
    'Wrong version/repository',
  );
  requireValue(
    typeof receipt.commit === 'string' && /^[a-f0-9]{40}$/.test(receipt.commit),
    'Full commit SHA required',
  );
  run(receipt.run);
  timestamp(receipt.completedAt);
  validateImages(receipt.images);
  requireValue(
    Array.isArray(receipt.checks) && receipt.checks.length === requiredChecks.length,
    'Exact required checks needed',
  );
  const names = new Set();
  for (const check of receipt.checks) {
    object(check, ['name', 'run', 'commit', 'conclusion'], 'Check');
    requireValue(
      requiredChecks.includes(check.name) && !names.has(check.name),
      'Unknown/duplicate check',
    );
    names.add(check.name);
    run(check.run);
    requireValue(
      check.commit === receipt.commit && check.conclusion === 'success',
      'Check failed or SHA mismatch',
    );
  }
  object(receipt.health, ['ready', 'wiring'], 'Health');
  requireValue(
    receipt.health.ready === true && receipt.health.wiring === true,
    'UAT health/wiring must pass',
  );
  return receipt;
}

export function receiptDigest(receipt) {
  validateReceipt(receipt);
  return createHash('sha256').update(canonicalJson(receipt)).digest('hex');
}

export function createAcceptance(receipt, decision, actorId) {
  requireValue(actorId === ownerId, 'Only the maintainer may accept UAT');
  object(decision, ['run', 'acceptedAt', 'note'], 'Acceptance decision');
  run(decision.run);
  note(decision.note);
  requireValue(
    timestamp(decision.acceptedAt) >= timestamp(receipt.completedAt),
    'Acceptance predates deployment',
  );
  return {
    version: 1,
    receiptDigest: receiptDigest(receipt),
    actorId,
    run: structuredClone(decision.run),
    acceptedAt: decision.acceptedAt,
    note: decision.note,
  };
}

export function validateAcceptance(receipt, acceptance) {
  object(
    acceptance,
    ['version', 'receiptDigest', 'actorId', 'run', 'acceptedAt', 'note'],
    'Acceptance',
  );
  requireValue(
    acceptance.version === 1 && acceptance.actorId === ownerId,
    'Unauthorized acceptance',
  );
  requireValue(
    acceptance.receiptDigest === receiptDigest(receipt),
    'Acceptance does not match deployment',
  );
  run(acceptance.run);
  note(acceptance.note);
  requireValue(
    timestamp(acceptance.acceptedAt) >= timestamp(receipt.completedAt),
    'Acceptance predates deployment',
  );
  return acceptance;
}

export function validateReleaseSelection(receipt, acceptance, selection) {
  validateAcceptance(receipt, acceptance);
  object(selection, ['tag', 'commit', 'onMain'], 'Release selection');
  validateProductionTag(selection.tag);
  requireValue(
    selection.commit === receipt.commit && selection.onMain === true,
    'Tagged commit must match accepted main history',
  );
  return structuredClone(receipt.images);
}

export function validateProductionTag(value) {
  const match =
    typeof value === 'string' && value.match(/^prod-(\d{4}-\d{2}-\d{2})(?:-([2-9]|[1-9]\d+))?$/);
  requireValue(match, 'Invalid production tag');
  timestamp(`${match[1]}T00:00:00.000Z`);
  return value;
}

export function validateRollback(previous, schemaReview, actorId) {
  requireValue(actorId === ownerId, 'Only the maintainer may authorize rollback');
  object(previous, ['receipt', 'acceptance', 'productionOutcome'], 'Previous release');
  validateAcceptance(previous.receipt, previous.acceptance);
  requireValue(
    previous.productionOutcome === 'success',
    'Rollback needs a previously successful release',
  );
  object(schemaReview, ['compatible', 'note'], 'Schema compatibility review');
  note(schemaReview.note);
  requireValue(
    schemaReview.compatible === true,
    'Schema incompatible: use corrective migration/forward fix',
  );
  return { images: structuredClone(previous.receipt.images), runMigrations: false };
}
