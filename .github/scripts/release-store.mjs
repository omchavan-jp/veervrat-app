import { canonicalJson } from './release-record.mjs';

const origin = 'https://veervrattfstate.blob.core.windows.net';

function url(key) {
  if (
    !/^(?:receipts\/uat\/\d+\/\d+|acceptances\/uat\/\d+\/\d+\/\d+\/\d+|probes\/\d+\/\d+)\.json$/.test(
      key,
    )
  )
    throw new Error('Invalid release record key');
  return `${origin}/release-records/${key}`;
}

async function boundedBody(response) {
  const parts = [];
  let size = 0;
  for await (const part of response.body) {
    size += part.length;
    if (size > 131072) throw new Error('Release record exceeds size limit');
    parts.push(Buffer.from(part));
  }
  return Buffer.concat(parts).toString('utf8');
}

export function releaseStore(accessToken, request = fetch) {
  if (typeof accessToken !== 'string' || !accessToken) throw new Error('Storage token missing');
  async function call(key, method, body) {
    return request(url(key), {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-ms-version': '2023-11-03',
        'x-ms-date': new Date().toUTCString(),
        ...(method === 'PUT'
          ? {
              'x-ms-blob-type': 'BlockBlob',
              'Content-Type': 'application/json',
              'If-None-Match': '*',
            }
          : {}),
      },
      ...(body === undefined ? {} : { body }),
    });
  }
  return {
    async read(key) {
      const response = await call(key, 'GET');
      if (response.status !== 200)
        throw new Error(`Release record read failed: HTTP ${response.status}`);
      return JSON.parse(await boundedBody(response));
    },
    async create(key, record) {
      const body = canonicalJson(record);
      if (Buffer.byteLength(body) > 131072) throw new Error('Release record exceeds size limit');
      const response = await call(key, 'PUT', body);
      if (response.status !== 201)
        throw new Error(`Release record conditional create failed: HTTP ${response.status}`);
      const readBack = await this.read(key);
      if (canonicalJson(readBack) !== body) throw new Error('Release record read-back mismatch');
      return readBack;
    },
    async verifyCreateOnly(key, record) {
      await this.create(key, record);
      const response = await call(key, 'PUT', canonicalJson({ ...record, changed: true }));
      const code = response.headers.get('x-ms-error-code');
      if (!(
        (response.status === 412 && code === 'ConditionNotMet') ||
        (response.status === 409 && code === 'BlobAlreadyExists')
      ))
        throw new Error('Overwrite rejection not proven');
      if (canonicalJson(await this.read(key)) !== canonicalJson(record))
        throw new Error('Original probe record changed');
    },
  };
}
