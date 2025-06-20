import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock document.createRange for TipTap
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = vi.fn();
  range.getClientRects = () => ({
    item: vi.fn(),
    length: 0,
    [Symbol.iterator]: vi.fn(),
  });
  return range;
};

// Mock getSelection
window.getSelection = vi.fn().mockReturnValue({
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  getRangeAt: vi.fn(),
  rangeCount: 0,
});

// Mock canvas for TipTap
HTMLCanvasElement.prototype.getContext = vi.fn();

// Mock FileReader for file processing tests
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsText: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload?.({ target: { result: 'Mock file content' } });
    }, 0);
  }),
  readAsArrayBuffer: vi.fn(function(this: any) {
    setTimeout(() => {
      const buffer = new ArrayBuffer(8);
      this.onload?.({ target: { result: buffer } });
    }, 0);
  }),
  readAsDataURL: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload?.({ target: { result: 'data:text/plain;base64,TW9jayBmaWxlIGNvbnRlbnQ=' } });
    }, 0);
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onload: null,
  onerror: null,
  result: null
})) as any;

// Replace heavy TipTap with lightweight mock
vi.mock('@tiptap/react', async () => {
  const { createLightweightTipTapMock } = await import('./mocks/tiptap-lite');
  return createLightweightTipTapMock();
});
vi.mock('@tiptap/starter-kit', () => ({ 
  default: {
    configure: vi.fn().mockReturnValue({})
  }
}));
// Mock all TipTap extensions
vi.mock('@tiptap/extension-document', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-paragraph', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-heading', () => ({ 
  default: {
    configure: vi.fn().mockReturnValue({})
  }
}));
vi.mock('@tiptap/extension-bold', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-italic', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-underline', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-bullet-list', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-ordered-list', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-list-item', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-history', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@tiptap/extension-text-align', () => ({ 
  default: {
    configure: vi.fn().mockReturnValue({})
  }
}));

// Performance optimizations
beforeEach(() => {
  // Clear any accumulated state
  vi.clearAllTimers();
});

afterEach(() => {
  // Cleanup to prevent memory leaks
  document.body.innerHTML = '';
});