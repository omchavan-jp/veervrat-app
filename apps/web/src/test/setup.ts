import '@testing-library/jest-dom';

// jsdom does not implement `window.matchMedia`, and calling it throws rather than returning a
// falsy result. Any component that honours `prefers-reduced-motion` — which this codebase does
// before scrolling or animating — therefore explodes on mount in tests, with an error naming
// matchMedia rather than anything to do with what was being tested.
//
// Defaults to "no preference", the state most people are in, so a component takes its animated
// path unless a test says otherwise. A test that needs the reduced-motion branch can override
// this per case with vi.spyOn(window, 'matchMedia').
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated, but still called by some libraries
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

// jsdom has no layout engine, so `scrollIntoView` is undefined on every element. Components that
// keep a conversation pinned to the newest message call it on render.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
