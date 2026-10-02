import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Tests are in Polish: the browser is "Polish" before the website's modules pick the default language
// (i18n/index.ts reads navigator.languages on import). English tests set useLang.
Object.defineProperty(navigator, 'languages', { value: ['pl-PL', 'pl'], configurable: true });

afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
});

// Browser APIs jsdom doesn't have.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as never);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= ResizeObserverStub as never;
globalThis.IntersectionObserver ??= IntersectionObserverStub as never;
Element.prototype.scrollIntoView ??= function () {};
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as never;
// canvas without the "canvas" library: getContext returns a fake instead of logging an error
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never;
