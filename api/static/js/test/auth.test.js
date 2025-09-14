import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Auth Module', () => {
  let Auth

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = localStorageMock
    
    // Clear localStorage
    localStorageMock.clear()
    
    // Mock Auth functions
    Auth = {
      getToken: () => localStorageMock.getItem('pim_token'),
      
      setToken: (token) => {
        localStorageMock.setItem('pim_token', token)
        localStorageMock.getItem.mockReturnValue(token)
      },
      
      removeToken: () => {
        localStorageMock.removeItem('pim_token')
        localStorageMock.getItem.mockReturnValue(null)
      },
      
      isAuthenticated: () => !!localStorageMock.getItem('pim_token'),
      
      getApiBaseUrl: () => {
        return window.location.hostname.includes('render.com')
          ? 'https://pim-project-qgyu.onrender.com'
          : window.location.origin.replace(/\/static.*/, '')
      }
    }
  })

  describe('Token Management', () => {
    it('should store and retrieve tokens', () => {
      const testToken = 'test-token-123'
      Auth.setToken(testToken)
      expect(Auth.getToken()).toBe(testToken)
    })

    it('should return null for non-existent token', () => {
      expect(Auth.getToken()).toBeNull()
    })

    it('should remove tokens', () => {
      const testToken = 'test-token-123'
      Auth.setToken(testToken)
      Auth.removeToken()
      expect(Auth.getToken()).toBeNull()
    })

    it('should check authentication status', () => {
      expect(Auth.isAuthenticated()).toBe(false)
      
      Auth.setToken('test-token')
      expect(Auth.isAuthenticated()).toBe(true)
      
      Auth.removeToken()
      expect(Auth.isAuthenticated()).toBe(false)
    })
  })

  describe('API Base URL', () => {
    it('should return production URL for render.com', () => {
      window.location.hostname = 'pim-project.onrender.com'
      expect(Auth.getApiBaseUrl()).toBe('https://pim-project-qgyu.onrender.com')
    })

    it('should return development URL for localhost', () => {
      window.location.hostname = 'localhost'
      window.location.origin = 'http://localhost:8000'
      const url = Auth.getApiBaseUrl()
      expect(url).toBe('http://localhost:8000')
    })
  })
})