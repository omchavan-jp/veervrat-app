import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest 5 no longer inherits global Jest matcher declarations. Keep return types
// accurate for both synchronous assertions and the resolves/rejects paths.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- Ambient merging requires Vitest's existing two-parameter interface.
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}
