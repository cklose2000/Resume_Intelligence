import '@testing-library/jest-dom';
import { vi } from 'vitest';
import createLightweightTipTapMock from './mocks/tiptap-lite';

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

// Replace heavy TipTap with lightweight mock
vi.mock('@tiptap/react', () => createLightweightTipTapMock);
vi.mock('@tiptap/starter-kit', () => ({ 
  default: vi.fn(),
  StarterKit: vi.fn() 
}));
vi.mock('@tiptap/extension-text-align', () => ({ 
  default: vi.fn().mockImplementation(() => ({}))
}));
vi.mock('@tiptap/extension-underline', () => ({ 
  default: vi.fn().mockImplementation(() => ({}))
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