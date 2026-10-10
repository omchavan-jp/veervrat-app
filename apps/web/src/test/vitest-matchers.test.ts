import { expect, expectTypeOf, test } from 'vitest';

test('DOM matchers work synchronously with void return types', () => {
  const element = document.createElement('div');
  document.body.append(element);
  expectTypeOf(expect(element).toBeInTheDocument()).toEqualTypeOf<void>();
  element.remove();
  expect(element).not.toBeInTheDocument();
});

test('DOM matchers preserve awaited assertion return types', async () => {
  const element = document.createElement('div');
  document.body.append(element);
  const assertion = expect(Promise.resolve(element)).resolves.toBeInTheDocument();
  expectTypeOf(assertion).toEqualTypeOf<Promise<void>>();
  await assertion;
  element.remove();
});
