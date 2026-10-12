import { canonicalJson } from './release-record.mjs';

const origin = 'https://veervrattfstate.blob.core.windows.net';

function validKey(key, area) {
  const tag = 'prod-\\d{4}-\\d{2}-\\d{2}(?:-[1-9]\\d*)?';
  return area === 'production'
    ? new RegExp(
        `^(?:claims/${tag}|(?:manifests|outcomes)/${tag}/\\d+/\\d+|probes/\\d+/\\d+)\\.json$`,
      ).test(key)
    : /^(?:receipts\/uat\/\d+\/\d+|acceptances\/uat\/\d+\/\d+\/\d+\/\d+|accepted\/[a-f0-9]{40}\/\d+\/\d+|rollback-requests\/prod-\d{4}-\d{2}-\d{2}(?:-[1-9]\d*)?|probes\/\d+\/\d+)\.json$/.test(
        key,
      );
}

function url(key, area) {
  if (!validKey(key, area)) throw new Error('Invalid release record key');
  return `${origin}/${area === 'production' ? 'production-release-records' : 'release-records'}/${key}`;
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

export function releaseStore(accessToken, request = fetch, area = 'uat') {
  if (!['uat', 'production'].includes(area)) throw new Error('Invalid record area');
  if (typeof accessToken !== 'string' || !accessToken) throw new Error('Storage token missing');
  async function call(key, method, body) {
    return request(url(key, area), {
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
    async readOptional(key) {
      const response = await call(key, 'GET');
      if (response.status === 404 && response.headers.get('x-ms-error-code') === 'BlobNotFound')
        return null;
      if (response.status !== 200)
        throw new Error(`Release record read failed: HTTP ${response.status}`);
      return JSON.parse(await boundedBody(response));
    },
    async list(prefix) {
      if (
        !(
          area === 'uat'
            ? /^accepted\/[a-f0-9]{40}\/$/
            : /^(?:claims\/|outcomes\/(?:prod-\d{4}-\d{2}-\d{2}(?:-[1-9]\d*)?\/)?)$/
        ).test(prefix)
      )
        throw new Error('Invalid release index prefix');
      const keys = [];
      let marker = '';
      for (let page = 0; page < 100; page++) {
        const target = new URL(
          `${origin}/${area === 'production' ? 'production-release-records' : 'release-records'}`,
        );
        target.search = new URLSearchParams({
          restype: 'container',
          comp: 'list',
          prefix,
          maxresults: '50',
          ...(marker ? { marker } : {}),
        }).toString();
        const response = await request(target.toString(), {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(30000),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-ms-version': '2023-11-03',
            'x-ms-date': new Date().toUTCString(),
          },
        });
        if (response.status !== 200)
          throw new Error(`Release index unavailable: HTTP ${response.status}`);
        const xml = await boundedBody(response);
        if (!xml.includes('<EnumerationResults') || !xml.includes('</EnumerationResults>'))
          throw new Error('Invalid release index response');
        for (const match of xml.matchAll(/<Name>([^<]*)<\/Name>/g)) {
          if (!validKey(match[1], area) || !match[1].startsWith(prefix))
            throw new Error('Unexpected record in release index');
          keys.push(match[1]);
        }
        marker = xml.match(/<NextMarker>([^<]*)<\/NextMarker>/)?.[1] ?? '';
        if (/[&<>]/.test(marker)) throw new Error('Unsupported index marker encoding');
        if (!marker) return keys;
      }
      throw new Error('Release index exceeds pagination limit');
    },
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
