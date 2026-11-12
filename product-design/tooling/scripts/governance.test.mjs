import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { stripMdxNonProse } from './governance.mjs';
import { documentHref } from '../lib/document-href.ts';

test('preserves prose references while removing tags, attributes, code and link destinations', () => {
  const input =
    '<span data-ref="PD-999">PD-001</span> [PD-002](https://example.test/PD-998) `PD-997`\n```js\nPD-996\n```';
  assert.equal(stripMdxNonProse(input).trim(), 'PD-001 PD-002');
});

test('uses parsed markup for malformed/nested tags and suppresses non-prose script text', () => {
  const input = '<script>PD-999</script><span title="a > b">PD-003</span><!-- PD-998 -->';
  assert.equal(stripMdxNonProse(input), 'PD-003');
  const malformed = stripMdxNonProse('<<script>PD-997</script><b>PD-004</b>');
  assert.ok(!malformed.includes('<script>'));
  assert.ok(malformed.includes('PD-004'));
});

test('registry and schema source links work independently of page URL trailing slashes', () => {
  const decisionLog = readFileSync(new URL('../../00-governance/decision-log.mdx', import.meta.url), 'utf8');
  const links = [...decisionLog.matchAll(/\]\((\.\/decision-registry(?:\.schema)?\.json)\)/g)].map((m) => m[1]);
  assert.deepEqual(links, ['./decision-registry.json', './decision-registry.schema.json']);

  for (const href of links) {
    const expected = `/product-docs/00-governance/${href.slice(2)}`;
    for (const pageUrl of ['/00-governance/decision-log', '/00-governance/decision-log/']) {
      const rendered = documentHref(href, pageUrl);
      assert.equal(rendered, expected);
      for (const suffix of ['', '/']) {
        const browserUrl = `https://example.test/product-docs/00-governance/decision-log${suffix}`;
        assert.equal(new URL(rendered, browserUrl).pathname, expected);
      }
    }
  }
});

test('document links retain MDX routing, parent paths, queries, fragments, and the docs prefix', () => {
  assert.equal(documentHref('../04-practice-model/README.mdx#canonical-records', '/00-governance/decision-log/'),
    '/product-docs/04-practice-model/README#canonical-records');
  assert.equal(documentHref('./decision-registry.schema.json?download=1#properties', '/00-governance/decision-log'),
    '/product-docs/00-governance/decision-registry.schema.json?download=1#properties');
  assert.equal(documentHref('./00-governance/decision-log.mdx', '/'), '/product-docs/00-governance/decision-log');
  assert.equal(documentHref('./deferred-topics.json', '/00-governance/deferred-topics/'),
    '/product-docs/00-governance/deferred-topics.json');
});

test('non-relative links are left unchanged', () => {
  for (const href of [undefined, '', '#registry', '?q=registry', '/product-docs/00-governance/decision-registry.json',
    'https://example.test/reference.mdx', '//example.test/file.json', 'mailto:docs@example.test']) {
    assert.equal(documentHref(href, '/00-governance/decision-log/'), href);
  }
});
