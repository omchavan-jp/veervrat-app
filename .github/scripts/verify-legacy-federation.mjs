import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateToken } from './verify-azure-identity.mjs';

const legacyClientId = '0058e2a1-5dac-432f-aa05-c645472a3652';
const guid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const audience = 'api://AzureADTokenExchange';

export function oidcRequestUrl(value) {
  const url = new URL(value);
  assert.ok(
    url.protocol === 'https:' && url.hostname.endsWith('.actions.githubusercontent.com'),
    'Unexpected GitHub OIDC origin',
  );
  assert.ok(!url.username && !url.password && !url.port, 'Unexpected OIDC URL authority');
  url.searchParams.set('audience', audience);
  return url.toString();
}

async function jsonRequest(url, options) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  try {
    return { status: response.status, body: await response.json() };
  } catch {
    throw new Error('Unexpected federation API response; credentials and body were not logged');
  }
}

export async function verifyLegacyRevoked({
  newClientId,
  newPrincipalId,
  tenantId,
  oidcUrl,
  oidcRequestToken,
  request = jsonRequest,
}) {
  for (const value of [newClientId, newPrincipalId, tenantId])
    assert.match(value ?? '', guid, 'Missing identity metadata');
  assert.notEqual(
    newClientId,
    legacyClientId,
    'Positive control must use the replacement identity',
  );
  assert.ok(oidcRequestToken, 'Missing GitHub OIDC request credential');
  const github = await request(oidcRequestUrl(oidcUrl), {
    method: 'GET',
    headers: { Authorization: `Bearer ${oidcRequestToken}` },
  });
  assert.equal(github.status, 200, 'GitHub OIDC request failed');
  assert.equal(typeof github.body?.value, 'string', 'GitHub did not return an assertion');
  const assertion = github.body.value;
  const claims = JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(
    claims.iss,
    'https://token.actions.githubusercontent.com',
    'Unexpected GitHub assertion issuer',
  );
  assert.equal(claims.aud, audience, 'Unexpected GitHub assertion audience');
  assert.equal(
    claims.sub,
    'repo:omchavan-jp@317451750/veervrat-app@1287947867:environment:build',
    'Unexpected GitHub assertion subject',
  );
  const endpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const exchange = (clientId) =>
    request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
        scope: 'https://management.azure.com/.default',
      }),
    });
  // Same assertion/endpoint, changing only client ID: network/authentication failure is not revocation evidence.
  const replacement = await exchange(newClientId);
  assert.equal(replacement.status, 200, 'Replacement federation positive control failed');
  assert.equal(
    typeof replacement.body?.access_token,
    'string',
    'Replacement returned no access token',
  );
  validateToken(replacement.body.access_token, 'https://management.azure.com/', {
    clientId: newClientId,
    principalId: newPrincipalId,
    tenantId,
  });
  const legacy = await exchange(legacyClientId);
  assert.ok(
    [400, 401].includes(legacy.status),
    'Legacy federation still succeeds or failed for an unverified reason',
  );
  assert.ok(
    ['invalid_client', 'unauthorized_client'].includes(legacy.body?.error),
    'Unexpected legacy federation failure class',
  );
  // The reviewed cleanup deletes the obsolete MI; its known client ID may now be absent in Entra.
  const accepted = new Set([70025, 700213, 700016]);
  assert.ok(
    Array.isArray(legacy.body?.error_codes) &&
      legacy.body.error_codes.some((code) => accepted.has(code)),
    'Legacy failure is not missing/mismatched federated trust',
  );
  return {
    replacementFederation: 'passed',
    legacyFederation: 'rejected',
    errorCodes: legacy.body.error_codes.filter((code) => accepted.has(code)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(
      JSON.stringify(
        await verifyLegacyRevoked({
          newClientId: process.env.NEW_CLIENT_ID,
          newPrincipalId: process.env.NEW_PRINCIPAL_ID,
          tenantId: process.env.AZURE_TENANT_ID,
          oidcUrl: process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
          oidcRequestToken: process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
        }),
      ),
    );
  } catch (error) {
    console.error(`Legacy federation verification failed: ${error.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
