// Test setup for Vitest
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock window.location
delete window.location
window.location = {
  hostname: 'localhost',
  origin: 'http://localhost:8000',
  href: 'http://localhost:8000',
  replace: vi.fn(),
  assign: vi.fn(),
  reload: vi.fn(),
}

// Mock fetch API
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}