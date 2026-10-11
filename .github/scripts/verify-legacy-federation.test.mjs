import assert from 'node:assert/strict';
import test from 'node:test';
import { oidcRequestUrl, verifyLegacyRevoked } from './verify-legacy-federation.mjs';

const client = '00000000-0000-4000-8000-000000000001';
const principal = '00000000-0000-4000-8000-000000000002';
const tenant = '00000000-0000-4000-8000-000000000003';
const jwt = (claims) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const assertion = jwt({
  iss: 'https://token.actions.githubusercontent.com',
  aud: 'api://AzureADTokenExchange',
  sub: 'repo:omchavan-jp@317451750/veervrat-app@1287947867:environment:build',
});
const access = jwt({
  aud: 'https://management.azure.com/',
  appid: client,
  oid: principal,
  tid: tenant,
  exp: Math.floor(Date.now() / 1000) + 3600,
});
function fixture(legacy, replacement = { status: 200, body: { access_token: access } }) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === 'GET') return { status: 200, body: { value: assertion } };
    assert.equal(new URL(url).hostname, 'login.microsoftonline.com');
    assert.equal(options.body.get('client_assertion'), assertion);
    return options.body.get('client_id') === client ? replacement : legacy;
  };
  return {
    options: {
      newClientId: client,
      newPrincipalId: principal,
      tenantId: tenant,
      oidcUrl: 'https://pipelines.actions.githubusercontent.com/token?job=1',
      oidcRequestToken: 'synthetic-request-credential',
      request,
    },
    calls,
  };
}
test('only a specific missing-trust error after a successful replacement proves rejection', async () => {
  for (const code of [70025, 700213, 700016]) {
    const { options, calls } = fixture({
      status: 400,
      body: { error: 'invalid_client', error_codes: [code] },
    });
    assert.equal((await verifyLegacyRevoked(options)).legacyFederation, 'rejected');
    assert.deepEqual(
      calls.map((call) => call.method),
      ['GET', 'POST', 'POST'],
    );
  }
});
test('legacy token success, unrelated AAD errors and networking failures cannot pass', async () => {
  for (const response of [
    { status: 200, body: { access_token: 'synthetic' } },
    { status: 400, body: { error: 'invalid_client', error_codes: [700027] } },
    { status: 500, body: { error: 'server_error' } },
  ]) {
    const { options } = fixture(response);
    await assert.rejects(verifyLegacyRevoked(options));
  }
});
test('replacement failure blocks the negative test', async () => {
  const { options, calls } = fixture(
    { status: 400, body: { error: 'invalid_client', error_codes: [70025] } },
    { status: 401, body: {} },
  );
  await assert.rejects(verifyLegacyRevoked(options), /positive control/);
  assert.equal(calls.length, 2);
});
test('OIDC origin matching cannot be spoofed by URL substrings or userinfo', () => {
  for (const url of [
    'https://attacker.invalid/?target=actions.githubusercontent.com',
    'https://actions.githubusercontent.com.attacker.invalid/token',
    'https://user:password@pipelines.actions.githubusercontent.com/token',
    'http://pipelines.actions.githubusercontent.com/token',
  ]) {
    assert.throws(() => oidcRequestUrl(url), /Unexpected/);
  }
});
