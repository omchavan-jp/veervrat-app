import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const contexts = ['build', 'uat', 'prod'];
const guid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const audiences = {
  arm: 'https://management.azure.com/',
  storage: 'https://storage.azure.com/',
  vault: 'https://vault.azure.net',
};

export function permissionAllowsAction(permissions, action) {
  const matches = (pattern) =>
    new RegExp(
      `^${pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
      'i',
    ).test(action);
  return permissions.some(
    (permission) =>
      permission.actions.some(matches) && !(permission.notActions ?? []).some(matches),
  );
}

export function assertPlanChanges(context, changes) {
  assert.ok(['uat', 'prod'].includes(context), 'Plan context must be UAT or production');
  const actual = changes.filter(
    (change) => change.mode === 'managed' && change.change.actions.join(',') !== 'no-op',
  );
  // Production has known pre-existing app configuration debt, not a cutover delta.
  const baseline = new Set([
    'module.environment.azurerm_container_app.api[0]',
    'module.environment.azurerm_container_app.web[0]',
  ]);
  assert.ok(
    actual.every(
      (change) =>
        context === 'prod' &&
        baseline.has(change.address) &&
        change.change.actions.join(',') === 'update',
    ),
    'Unexpected managed plan changes; do not apply or silently broaden permissions',
  );
  return actual.map((change) => ({ address: change.address, actions: change.change.actions }));
}

export function validateToken(token, audience, expected) {
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  const normalize = (value) =>
    String(value ?? '')
      .replace(/\/$/, '')
      .toLowerCase();
  const allowedAudiences = [audience];
  if (audience === audiences.arm) allowedAudiences.push('https://management.core.windows.net/');
  assert.ok(
    allowedAudiences.some((allowed) => normalize(allowed) === normalize(claims.aud)),
    'Unexpected Azure token audience',
  );
  assert.equal(
    normalize(claims.appid ?? claims.azp),
    normalize(expected.clientId),
    'Token is not from the candidate client',
  );
  assert.equal(
    normalize(claims.oid),
    normalize(expected.principalId),
    'Token is not from the candidate principal',
  );
  assert.equal(normalize(claims.tid), normalize(expected.tenantId), 'Unexpected Azure tenant');
  assert.ok(claims.exp > Date.now() / 1000, 'Expired Azure token');
}

export function validateProbeUrl(url, method) {
  const parsed = new URL(url);
  const hosts = new Set([
    'management.azure.com',
    'veervrattfstate.blob.core.windows.net',
    'veervrat-uat-kv.vault.azure.net',
    'veervrat-prod-kv.vault.azure.net',
  ]);
  assert.ok(parsed.protocol === 'https:' && hosts.has(parsed.hostname), 'Unexpected probe origin');
  assert.ok(!parsed.username && !parsed.password && !parsed.port, 'Unexpected probe URL authority');
  assert.ok(['GET', 'HEAD'].includes(method), 'Verification must never issue writes');
  if (parsed.hostname === 'veervrattfstate.blob.core.windows.net') {
    assert.equal(method, 'HEAD', 'State verification must never fetch contents');
  }
  if (
    parsed.hostname === 'veervrat-uat-kv.vault.azure.net' ||
    parsed.hostname === 'veervrat-prod-kv.vault.azure.net'
  ) {
    assert.equal(parsed.pathname, '/secrets', 'Vault verification must not fetch secret values');
  }
}

async function azureRequest(url, options) {
  validateProbeUrl(url, options.method);
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  return {
    status: response.status,
    requestId: response.headers.get('x-ms-request-id'),
    storageError: response.headers.get('x-ms-error-code'),
    body: options.method === 'HEAD' ? undefined : await response.json(),
  };
}

function cliToken(audience) {
  // Capture credentials privately; never print subprocess output or token-bearing errors.
  try {
    return execFileSync(
      'az',
      [
        'account',
        'get-access-token',
        '--resource',
        audience,
        '--query',
        'accessToken',
        '-o',
        'tsv',
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim();
  } catch {
    throw new Error('Azure token acquisition failed; no credentials or raw output were logged');
  }
}

export async function verifyIdentity({
  context,
  clientId,
  principalId,
  tenantId,
  subscriptionId,
  tokenFor = cliToken,
  request = azureRequest,
}) {
  assert.ok(contexts.includes(context), 'Unsupported identity context');
  for (const value of [clientId, principalId, tenantId, subscriptionId])
    assert.match(value ?? '', guid, 'Missing/invalid identity identifier');
  const expected = { clientId, principalId, tenantId };
  const tokens = {};
  for (const [kind, audience] of Object.entries(audiences)) {
    tokens[kind] = await tokenFor(audience);
    validateToken(tokens[kind], audience, expected);
  }
  const results = [];
  const probe = async (label, url, kind, method, validate) => {
    assert.ok(['GET', 'HEAD'].includes(method), 'Verification must never issue writes');
    const response = await request(url, {
      method,
      headers: {
        Authorization: `Bearer ${tokens[kind]}`,
        'x-ms-version': '2023-11-03',
        'x-ms-date': new Date().toUTCString(),
      },
    });
    validate(response);
    results.push({ check: label, status: 'passed' });
  };
  const subscription = `/subscriptions/${subscriptionId}`;
  const registry = `${subscription}/resourceGroups/veervrat-shared/providers/Microsoft.ContainerRegistry/registries/veervratacr`;
  const armUrl = (id) => `https://management.azure.com${id}?api-version=2022-09-01`;
  const allowResource = (id) => (response) => {
    assert.equal(response.status, 200, 'Required ARM read failed');
    assert.equal(
      response.body?.id?.toLowerCase(),
      id.toLowerCase(),
      'ARM response does not identify the expected resource',
    );
  };
  const denyResource = (response) => {
    assert.equal(response.status, 403, 'Cross-scope ARM read was not explicitly denied');
    assert.equal(
      response.body?.error?.code,
      'AuthorizationFailed',
      'ARM failure is not an RBAC denial',
    );
  };
  await probe(
    'registry metadata allowed',
    `https://management.azure.com${registry}?api-version=2023-07-01`,
    'arm',
    'GET',
    allowResource(registry),
  );
  for (const target of ['uat', 'prod']) {
    const group = `${subscription}/resourceGroups/veervrat-${target}`;
    await probe(
      `${target} resource group ${context === target ? 'allowed' : 'denied'}`,
      armUrl(group),
      'arm',
      'GET',
      context === target ? allowResource(group) : denyResource,
    );
  }
  const identity = `${subscription}/resourceGroups/veervrat-shared/providers/Microsoft.ManagedIdentity/userAssignedIdentities/veervrat-github-${context}`;
  await probe(
    'GitHub identity management read denied',
    `https://management.azure.com${identity}?api-version=2023-01-31`,
    'arm',
    'GET',
    denyResource,
  );
  const scopes =
    context === 'build'
      ? [registry]
      : [registry, `${subscription}/resourceGroups/veervrat-${context}`];
  for (const scope of scopes) {
    await probe(
      'role-management writes absent from effective permissions',
      `https://management.azure.com${scope}/providers/Microsoft.Authorization/permissions?api-version=2022-04-01`,
      'arm',
      'GET',
      (response) => {
        assert.equal(response.status, 200, 'Could not inspect effective ARM permissions');
        assert.ok(!response.body?.nextLink, 'Incomplete paginated effective-permission evidence');
        assert.ok(
          Array.isArray(response.body?.value) && response.body.value.length > 0,
          'Missing effective-permission evidence',
        );
        for (const action of [
          'Microsoft.Authorization/roleAssignments/write',
          'Microsoft.Authorization/roleAssignments/delete',
          'Microsoft.Authorization/roleDefinitions/write',
        ]) {
          assert.equal(
            permissionAllowsAction(response.body.value, action),
            false,
            'Candidate has unexpected role-management authority',
          );
        }
      },
    );
  }
  const states = [
    ['shared', 'tfstate-shared', 'shared.tfstate'],
    ['uat', 'tfstate-uat', 'uat.tfstate'],
    ['prod', 'tfstate-prod', 'prod.tfstate'],
    ['legacy shared', 'tfstate', 'shared.tfstate'],
    ['legacy uat', 'tfstate', 'uat.tfstate'],
    ['legacy prod', 'tfstate', 'prod.tfstate'],
  ];
  for (const [target, container, key] of states) {
    await probe(
      `${target} state ${context === target ? 'allowed' : 'denied'}`,
      `https://veervrattfstate.blob.core.windows.net/${container}/${key}`,
      'storage',
      'HEAD',
      (response) => {
        if (context === target) {
          assert.equal(response.status, 200, 'Own state metadata is not readable');
          assert.ok(response.requestId, 'Missing Azure Storage service evidence');
        } else {
          assert.equal(response.status, 403, 'Other/legacy state was not explicitly denied');
          assert.equal(
            response.storageError,
            'AuthorizationPermissionMismatch',
            'Storage failure is not an explicit permission denial',
          );
        }
      },
    );
  }
  for (const target of ['uat', 'prod']) {
    await probe(
      `${target} vault metadata ${context === target ? 'allowed' : 'denied'}`,
      `https://veervrat-${target}-kv.vault.azure.net/secrets?api-version=7.4`,
      'vault',
      'GET',
      (response) => {
        if (context === target) {
          assert.equal(response.status, 200, 'Own vault secret metadata is not readable');
          assert.ok(Array.isArray(response.body?.value), 'Unexpected vault metadata response');
        } else {
          assert.equal(response.status, 403, 'Other vault metadata was not explicitly denied');
          assert.equal(
            response.body?.error?.innererror?.code,
            'ForbiddenByRbac',
            'Vault failure is not an RBAC denial',
          );
        }
      },
    );
  }
  return { context, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await verifyIdentity({
      context: process.argv[2],
      clientId: process.env.EXPECTED_CLIENT_ID,
      principalId: process.env.EXPECTED_PRINCIPAL_ID,
      tenantId: process.env.EXPECTED_TENANT_ID,
      subscriptionId: process.env.EXPECTED_SUBSCRIPTION_ID,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Do not dump assertions' actual values, HTTP bodies, subprocess objects or credentials.
    console.error(`Identity verification failed: ${error.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
