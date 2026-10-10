import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReferences, checkWorkflow } from './check-actions-security.mjs';

const sha = 'a'.repeat(40);
const policy = { patterns_allowed: ['actions/checkout@*'] };
const workflow = 'permissions:\n  contents: read\n';

test('accepts reviewed SHA pins and local composite actions', () => {
  assert.deepEqual(
    checkReferences(
      `- uses: actions/checkout@${sha} # v4\n- uses: ./.github/actions/deploy-environment`,
      'fixture',
      policy,
    ),
    [],
  );
  assert.deepEqual(checkReferences(`uses: "actions/checkout@${sha}"`, 'fixture', policy), []);
});
test('rejects moving tags, short hashes, unknown publishers, and dynamic refs', () => {
  for (const reference of [
    'actions/checkout@v4',
    'actions/checkout@abc123',
    `other/action@${sha}`,
    '${{ inputs.action }}',
  ]) {
    assert.ok(checkReferences(`uses: ${reference}`, 'fixture', policy).length, reference);
  }
});
test('rejects unsupported inline YAML rather than skipping the reference', () => {
  assert.ok(checkReferences(`- { uses: actions/checkout@${sha} }`, 'fixture', policy).length);
});
test('requires explicit read permissions and keeps OIDC out of PR checks', () => {
  assert.deepEqual(checkWorkflow(workflow, '.github/workflows/ci.yml'), []);
  assert.ok(checkWorkflow('name: CI', '.github/workflows/ci.yml').length);
  assert.ok(checkWorkflow(`${workflow}  id-token: write\n`, '.github/workflows/cd.yml').length);
  assert.ok(
    checkWorkflow(
      `${workflow}jobs:\n  test:\n    permissions:\n      id-token: write\n`,
      '.github/workflows/ci.yml',
    ).length,
  );
  assert.deepEqual(
    checkWorkflow(
      `${workflow}jobs:\n  deploy:\n    permissions:\n      id-token: write\n`,
      '.github/workflows/cd.yml',
    ),
    [],
  );
  assert.ok(
    checkWorkflow(
      `${workflow}on:\n  pull_request:\njobs:\n  deploy:\n    permissions:\n      id-token: write\n`,
      '.github/workflows/cd.yml',
    ).length,
  );
});
test('rejects privileged triggers on checked-in workflows', () => {
  assert.ok(
    checkWorkflow(`${workflow}on:\n  pull_request_target:\n`, '.github/workflows/ci.yml').length,
  );
  assert.ok(checkWorkflow(`${workflow}on:\n  workflow_run:\n`, '.github/workflows/ci.yml').length);
  assert.ok(
    checkWorkflow(`${workflow}on: [push, pull_request_target]\n`, '.github/workflows/ci.yml')
      .length,
  );
});
test('job overrides cannot widen token access or hide grants inline', () => {
  for (const grant of ['contents: write', 'pull-requests: write', 'deployments: write']) {
    assert.ok(
      checkWorkflow(
        `${workflow}jobs:\n  test:\n    permissions:\n      ${grant}\n`,
        '.github/workflows/ci.yml',
      ).length,
    );
  }
  assert.ok(
    checkWorkflow(
      `${workflow}jobs:\n  test:\n    permissions: { contents: write }\n`,
      '.github/workflows/ci.yml',
    ).length,
  );
  assert.deepEqual(
    checkWorkflow(
      `${workflow}jobs:\n  test:\n    permissions:\n      contents: read\n`,
      '.github/workflows/ci.yml',
    ),
    [],
  );
});
