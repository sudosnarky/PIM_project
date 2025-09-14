import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('API Module', () => {
  let API

  beforeEach(() => {
    // Mock fetch responses
    global.fetch.mockClear()
    
    // Mock API functions
    API = {
      baseUrl: 'http://localhost:8000',
      
      getAuthHeaders: (token) => ({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }),
      
      handleResponse: async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail || `HTTP ${response.status}`)
        }
        return response.json()
      },
      
      login: async (username, password) => {
        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)
        
        const response = await fetch(`${API.baseUrl}/auth/token`, {
          method: 'POST',
          body: formData
        })
        
        return API.handleResponse(response)
      },
      
      getParticles: async (token, filters = {}) => {
        const params = new URLSearchParams(filters)
        const response = await fetch(`${API.baseUrl}/particles?${params}`, {
          headers: API.getAuthHeaders(token)
        })
        
        return API.handleResponse(response)
      }
    }
  })

  describe('Authentication Headers', () => {
    it('should include bearer token when provided', () => {
      const token = 'test-token'
      const headers = API.getAuthHeaders(token)
      
      expect(headers['Authorization']).toBe(`Bearer ${token}`)
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should not include authorization header without token', () => {
      const headers = API.getAuthHeaders()
      
      expect(headers['Authorization']).toBeUndefined()
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('Response Handling', () => {
    it('should handle successful responses', async () => {
      const mockData = { success: true }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      }
      
      const result = await API.handleResponse(mockResponse)
      expect(result).toEqual(mockData)
    })

    it('should handle error responses', async () => {
      const mockError = { detail: 'Test error' }
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue(mockError)
      }
      
      await expect(API.handleResponse(mockResponse)).rejects.toThrow('Test error')
    })

    it('should handle error responses without detail', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Parse error'))
      }
      
      await expect(API.handleResponse(mockResponse)).rejects.toThrow('HTTP 500')
    })
  })

  describe('API Endpoints', () => {
    it('should call login endpoint correctly', async () => {
      const mockResponse = { access_token: 'token123' }
      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      })
      
      const result = await API.login('testuser', 'testpass')
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should call particles endpoint with filters', async () => {
      const mockParticles = [{ id: 1, title: 'Test' }]
      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockParticles)
      })
      
      const filters = { section: 'projects', q: 'test' }
      const result = await API.getParticles('token123', filters)
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/particles?section=projects&q=test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123'
          })
        })
      )
      expect(result).toEqual(mockParticles)
    })
  })
})