import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia. Components that read media queries need a stub.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
