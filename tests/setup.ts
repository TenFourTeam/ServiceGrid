import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
// Environment variables are now handled by vitest.config.ts define block

// Mock window.Clerk for authentication tests
Object.defineProperty(window, 'Clerk', {
  value: {
    session: {
      getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    },
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch for tests
global.fetch = vi.fn();

// Silence console errors in tests unless explicitly testing error scenarios
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.call(console, ...args);
};