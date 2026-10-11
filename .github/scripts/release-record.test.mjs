import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ownerId,
  imageNames,
  requiredChecks,
  validateReceipt,
  receiptDigest,
  createAcceptance,
  validateAcceptance,
  validateReleaseSelection,
  validateRollback,
} from './release-record.mjs';

function fixture() {
  const receipt = {
    version: 1,
    repository: 'omchavan-jp/veervrat-app',
    commit: 'a'.repeat(40),
    run: { id: 123, attempt: 2 },
    completedAt: '2026-10-11T11:00:00.000Z',
    images: Object.fromEntries(
      imageNames.map((name, index) => [
        name,
        `veervratacr.azurecr.io/veervrat-${name === 'migrate' ? 'api-migrate' : name}@sha256:${String(index).repeat(64)}`,
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
  const decision = {
    run: { id: 300, attempt: 1 },
    acceptedAt: '2026-10-11T12:00:00.000Z',
    note: 'Exercised credential login, journey creation and mentor messaging on UAT.',
  };
  return { receipt, decision, acceptance: createAcceptance(receipt, decision, ownerId) };
}

test('accepts an exact deployed set, including mixed component digests', () => {
  const { receipt, acceptance } = fixture();
  assert.equal(validateReceipt(receipt), receipt);
  assert.equal(validateAcceptance(receipt, acceptance), acceptance);
  assert.deepEqual(
    validateReleaseSelection(receipt, acceptance, {
      tag: 'prod-2026-10-11-2',
      commit: receipt.commit,
      onMain: true,
    }),
    receipt.images,
  );
});

test('every required image is digest-pinned to its exact repository', () => {
  for (const name of imageNames)
    for (const bad of [
      'latest',
      'veervratacr.azurecr.io/veervrat-api:abc1234',
      'attacker.invalid/image@sha256:' + '0'.repeat(64),
      undefined,
    ]) {
      const { receipt } = fixture();
      receipt.images[name] = bad;
      assert.throws(() => validateReceipt(receipt));
    }
  const { receipt } = fixture();
  receipt.images.api = receipt.images.web;
  assert.throws(() => validateReceipt(receipt));
});

test('missing, skipped, failed, duplicate and different-SHA checks fail closed', () => {
  for (const mutate of [
    (r) => r.checks.pop(),
    (r) => (r.checks[0].conclusion = 'skipped'),
    (r) => (r.checks[0].conclusion = 'failure'),
    (r) => (r.checks[0].commit = 'b'.repeat(40)),
    (r) => (r.checks[1].name = r.checks[0].name),
    (r) => (r.health.ready = false),
    (r) => (r.health.wiring = false),
    (r) => (r.commit = 'abc1234'),
    (r) => (r.repository = 'attacker/repo'),
    (r) => (r.run.attempt = 0),
    (r) => (r.completedAt = '2026-02-30T11:00:00.000Z'),
    (r) => (r.extra = 'unexpected'),
  ]) {
    const { receipt } = fixture();
    mutate(receipt);
    assert.throws(() => validateReceipt(receipt));
  }
});

test('acceptance binds all evidence, including run attempt, not just SHA', () => {
  for (const mutate of [
    (r) => (r.images.web = r.images.web.replace(/2/g, 'f')),
    (r) => r.run.attempt++,
    (r) => r.checks[0].run.id++,
    (r) => (r.completedAt = '2026-10-11T11:30:00.000Z'),
  ]) {
    const { receipt, acceptance } = fixture();
    mutate(receipt);
    assert.throws(() => validateAcceptance(receipt, acceptance));
  }
});

test('canonical hashing ignores object insertion order but preserves evidence changes', () => {
  const { receipt } = fixture();
  const reordered = Object.fromEntries(Object.entries(receipt).reverse());
  reordered.images = Object.fromEntries(Object.entries(receipt.images).reverse());
  assert.equal(receiptDigest(receipt), receiptDigest(reordered));
});

test('only owner with a concrete note and valid chronology can accept', () => {
  const { receipt, decision, acceptance } = fixture();
  assert.throws(() => createAcceptance(receipt, decision, 1));
  assert.throws(() => createAcceptance(receipt, decision, String(ownerId)));
  for (const note of ['', 'approved', '   ', 'six words but not long enough', 'x'.repeat(4001)]) {
    assert.throws(() => createAcceptance(receipt, { ...decision, note }, ownerId));
  }
  assert.throws(() =>
    createAcceptance(receipt, { ...decision, acceptedAt: '2026-10-11T10:00:00.000Z' }, ownerId),
  );
  assert.throws(() => validateAcceptance(receipt, { ...acceptance, actorId: 1 }));
});

test('release selection rejects moved SHA, non-main history and invalid tags', () => {
  const { receipt, acceptance } = fixture();
  for (const tag of [
    'prod-2026-02-30',
    'prod-2026-10-11-1',
    'prod-2026-10-11-02',
    'v1',
    'prod-2026-10-11\n',
  ]) {
    assert.throws(() =>
      validateReleaseSelection(receipt, acceptance, { tag, commit: receipt.commit, onMain: true }),
    );
  }
  for (const selection of [
    { tag: 'prod-2026-10-11', commit: 'b'.repeat(40), onMain: true },
    { tag: 'prod-2026-10-11', commit: receipt.commit, onMain: false },
  ])
    assert.throws(() => validateReleaseSelection(receipt, acceptance, selection));
});

test('rollback requires successful target and schema review, and never runs migrations', () => {
  const { receipt, acceptance } = fixture();
  const previous = { receipt, acceptance, productionOutcome: 'success' };
  const review = {
    compatible: true,
    note: 'Reviewed current schema against previous application; additive columns remain compatible.',
  };
  const selected = validateRollback(previous, review, ownerId);
  assert.deepEqual(selected, { images: receipt.images, runMigrations: false });
  selected.images.web = 'changed';
  assert.notEqual(previous.receipt.images.web, 'changed');
  assert.throws(() => validateRollback(previous, review, 1));
  assert.throws(() =>
    validateRollback({ ...previous, productionOutcome: 'failure' }, review, ownerId),
  );
  assert.throws(() => validateRollback(previous, { ...review, compatible: false }, ownerId));
  assert.throws(() => validateRollback(previous, { ...review, note: '' }, ownerId));
});
