import assert from 'node:assert/strict';
import test from 'node:test';
import { stripMdxNonProse } from './governance.mjs';

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
