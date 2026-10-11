import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertPlanChanges,
  permissionAllowsAction,
  validateProbeUrl,
  validateToken,
  verifyIdentity,
} from './verify-azure-identity.mjs';

const ids = {
  clientId: '00000000-0000-4000-8000-000000000001',
  principalId: '00000000-0000-4000-8000-000000000002',
  tenantId: '00000000-0000-4000-8000-000000000003',
  subscriptionId: '00000000-0000-4000-8000-000000000004',
};

test('API-specific v2 GUID audiences remain strict about resource, client, principal and tenant', () => {
  const mappings = [
    ['https://management.azure.com/', '797f4846-ba00-4fd7-ba43-dac1f8f63013'],
    ['https://storage.azure.com/', 'e406a681-f3d4-42a8-90b6-c2b029497af1'],
    ['https://vault.azure.net', 'cfa8b339-82a2-471a-a3c9-0fc0be7a4093'],
  ];
  const token = (aud) =>
    `header.${Buffer.from(JSON.stringify({ aud, azp: ids.clientId, oid: ids.principalId, tid: ids.tenantId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  for (const [uri, app] of mappings) {
    assert.doesNotThrow(() => validateToken(token(app), uri, ids));
    assert.throws(
      () => validateToken(token(ids.clientId), uri, ids),
      /Unexpected Azure token audience/,
    );
    assert.throws(
      () => validateToken(token(app), uri, { ...ids, principalId: ids.clientId }),
      /candidate principal/,
    );
  }
  assert.throws(
    () => validateToken(token(mappings[1][1]), mappings[0][0], ids),
    /Unexpected Azure token audience/,
  );
});
function fixture(context, override = () => undefined) {
  const methods = [];
  const tokenFor = (audience) =>
    `header.${Buffer.from(
      JSON.stringify({
        aud: audience,
        appid: ids.clientId,
        oid: ids.principalId,
        tid: ids.tenantId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url')}.signature`;
  const request = async (url, options) => {
    const parsed = new URL(url);
    validateProbeUrl(url, options.method);
    methods.push(options.method);
    const changed = override(url, options);
    if (changed) return changed;
    if (parsed.hostname === 'veervrattfstate.blob.core.windows.net') {
      const own = context !== 'build' && parsed.pathname.split('/')[1] === `tfstate-${context}`;
      return own
        ? { status: 200, requestId: 'storage-service-request' }
        : { status: 403, storageError: 'AuthorizationPermissionMismatch' };
    }
    if (
      parsed.hostname === 'veervrat-uat-kv.vault.azure.net' ||
      parsed.hostname === 'veervrat-prod-kv.vault.azure.net'
    ) {
      const own =
        context !== 'build' && parsed.hostname === `veervrat-${context}-kv.vault.azure.net`;
      return own
        ? { status: 200, body: { value: [] } }
        : {
            status: 403,
            body: { error: { code: 'Forbidden', innererror: { code: 'ForbiddenByRbac' } } },
          };
    }
    if (url.includes('/permissions?'))
      return {
        status: 200,
        body: {
          value: [
            {
              actions: ['*'],
              notActions: ['Microsoft.Authorization/*/write', 'Microsoft.Authorization/*/delete'],
            },
          ],
        },
      };
    const own = context !== 'build' && url.includes(`/resourceGroups/veervrat-${context}?`);
    if (own || url.includes('/registries/veervratacr?'))
      return { status: 200, body: { id: new URL(url).pathname } };
    return { status: 403, body: { error: { code: 'AuthorizationFailed' } } };
  };
  return { options: { context, ...ids, tokenFor, request }, methods };
}

for (const context of ['build', 'uat', 'prod']) {
  test(`${context} permission verification issues only GET/HEAD, with positive and negative controls`, async () => {
    const { options, methods } = fixture(context);
    const result = await verifyIdentity(options);
    assert.ok(result.results.length >= 12);
    assert.ok(methods.every((method) => method === 'GET' || method === 'HEAD'));
  });
}
test('rejects another principal before probing APIs', async () => {
  const { options, methods } = fixture('uat');
  await assert.rejects(
    verifyIdentity({ ...options, principalId: ids.clientId }),
    /candidate principal/,
  );
  assert.equal(methods.length, 0);
});
test('unexpected cross-scope success is not a denial', async () => {
  const { options } = fixture('uat', (url) =>
    url.includes('/tfstate-prod/') ? { status: 200, requestId: 'wrongly-authorized' } : undefined,
  );
  await assert.rejects(verifyIdentity(options), /not explicitly denied/);
});
test('authentication and network-policy failures are not permission denials', async () => {
  for (const storageError of ['AuthenticationFailed', 'AuthorizationFailure']) {
    const { options } = fixture('build', (url) =>
      new URL(url).hostname === 'veervrattfstate.blob.core.windows.net'
        ? { status: 403, storageError }
        : undefined,
    );
    await assert.rejects(verifyIdentity(options), /explicit permission denial/);
  }
  const { options } = fixture('uat', (url) =>
    url.includes('veervrat-prod-kv')
      ? { status: 403, body: { error: { innererror: { code: 'ForbiddenByFirewall' } } } }
      : undefined,
  );
  await assert.rejects(verifyIdentity(options), /not an RBAC denial/);
});
test('rejects effective role-management authority', async () => {
  const { options } = fixture('prod', (url) =>
    url.includes('/permissions?')
      ? { status: 200, body: { value: [{ actions: ['*'] }] } }
      : undefined,
  );
  await assert.rejects(verifyIdentity(options), /role-management authority/);
});
test('permission union respects exclusions per grant and case-insensitive wildcards', () => {
  const contributor = { actions: ['*'], notActions: ['Microsoft.Authorization/*/Write'] };
  const action = 'Microsoft.Authorization/roleAssignments/write';
  assert.equal(permissionAllowsAction([contributor], action), false);
  assert.equal(permissionAllowsAction([contributor, { actions: [action] }], action), true);
  assert.equal(permissionAllowsAction([{ actions: ['*/read'] }], action), false);
});

test('probe origins reject substring spoofing, redirects and credential-bearing URLs', () => {
  for (const url of [
    'https://attacker.invalid/?target=blob.core.windows.net',
    'https://veervrattfstate.blob.core.windows.net.attacker.invalid/tfstate-prod/prod.tfstate',
    'https://attacker.invalid/.vault.azure.net',
    'http://management.azure.com/resource',
    'https://user:password@management.azure.com/resource',
  ])
    assert.throws(() => validateProbeUrl(url, 'HEAD'), /Unexpected probe/);
  assert.throws(
    () =>
      validateProbeUrl(
        'https://veervrattfstate.blob.core.windows.net/tfstate-prod/prod.tfstate',
        'GET',
      ),
    /never fetch contents/,
  );
  assert.throws(
    () =>
      validateProbeUrl('https://veervrat-prod-kv.vault.azure.net/secrets/session-secret', 'GET'),
    /not fetch secret values/,
  );
  assert.throws(
    () => validateProbeUrl('https://management.azure.com/resource', 'PUT'),
    /never issue writes/,
  );
});
test('missing effective-permission evidence fails closed', async () => {
  const { options } = fixture('build', (url) =>
    url.includes('/permissions?') ? { status: 200, body: { value: [] } } : undefined,
  );
  await assert.rejects(verifyIdentity(options), /Missing effective-permission evidence/);
});

test('paginated permissions cannot hide an unchecked privilege grant', async () => {
  const { options } = fixture('build', (url) =>
    url.includes('/permissions?')
      ? {
          status: 200,
          body: {
            value: [{ actions: ['*/read'] }],
            nextLink: 'https://management.azure.com/unchecked-next-page',
          },
        }
      : undefined,
  );
  await assert.rejects(verifyIdentity(options), /Incomplete paginated/);
});
test('plan guard allows no UAT changes and only known production update debt', () => {
  const change = (address, actions) => ({ mode: 'managed', address, change: { actions } });
  assert.deepEqual(assertPlanChanges('uat', []), []);
  const api = change('module.environment.azurerm_container_app.api[0]', ['update']);
  assert.equal(assertPlanChanges('prod', [api]).length, 1);
  for (const context of ['uat', 'prod']) {
    assert.throws(
      () => assertPlanChanges(context, [change(api.address, ['delete', 'create'])]),
      /Unexpected/,
    );
    assert.throws(
      () =>
        assertPlanChanges(context, [
          change('module.environment.azurerm_role_assignment.example', ['create']),
        ]),
      /Unexpected/,
    );
  }
  assert.throws(() => assertPlanChanges('uat', [api]), /Unexpected/);
});

test('verification jobs are main-only manual operations and cannot trigger deployment preparation', () => {
  const workflow = readFileSync('.github/workflows/cd.yml', 'utf8');
  assert.match(
    workflow,
    /prepare:\n\s+if: github.event_name != 'workflow_dispatch' \|\| inputs.operation == 'deploy'/,
  );
  for (const context of ['build', 'uat', 'prod']) {
    assert.ok(
      workflow.includes(
        `verify-${context}:\n    if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.operation == 'verify-${context}'`,
      ),
    );
  }
  const action = readFileSync('.github/actions/verify-azure-identity/action.yml', 'utf8');
  const executable = action
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(
    executable,
    /terraform apply|az role assignment (create|delete)|az containerapp (update|create|delete)/,
  );
  assert.match(action, /terraform plan -input=false -lock-timeout=30s/);
  assert.doesNotMatch(executable, /upload-artifact/);
});
