# API Specification

## Base URL
- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://pim-project-qgyu.onrender.com/api/v1`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow consistent JSON format:

**Success Response:**
```json
{
  "data": {...},
  "success": true
}
```

**Error Response:**
```json
{
  "detail": "Error message",
  "success": false
}
```

## Authentication Endpoints

### POST /auth/token
Login user and get JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string" 
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Missing username/password

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=alex&password=mypassword"
```

### POST /auth/logout
Logout user and revoke token.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Successfully logged out. 1 sessions terminated.",
  "success": true
}
```

## User Management

### POST /users/register  
Create a new user account.

**Request:**
```json
{
  "username": "alex_student",
  "password": "mypassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully", 
  "success": true
}
```

**Validation:**
- Username: 3-50 characters, alphanumeric + underscore
- Password: Minimum 8 characters

**Errors:**
- `400` - Username already exists
- `400` - Invalid username/password format

### GET /users/me
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "username": "alex_student",
  "created": "2025-09-01T08:00:00Z"
}
```

## Particle Endpoints

### GET /particles/
List user's particles with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `section` (optional): Filter by PARA section  
- `q` (optional): Search query for title/content
- `limit` (optional): Max results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "CS 302 Project Plan",
    "content": "# Project Plan\n\n- [ ] Database design...",
    "tags": ["school", "project", "cs302"],
    "section": "Projects", 
    "user": "alex_student",
    "created": "2025-09-15T10:30:00Z",
    "updated": "2025-09-15T10:30:00Z"
  }
]
```

**Examples:**
```bash
# Get all particles
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/particles/

# Filter by section
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v1/particles/?section=Projects"

# Search particles  
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v1/particles/?q=project%20management"

# Pagination
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v1/particles/?limit=10&offset=20"
```

### GET /particles/{id}
Get a specific particle by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "CS 302 Project Plan",
  "content": "# Project Plan\n\n- [ ] Database design...",
  "tags": ["school", "project", "cs302"],
  "section": "Projects",
  "user": "alex_student", 
  "created": "2025-09-15T10:30:00Z",
  "updated": "2025-09-15T10:30:00Z"
}
```

**Errors:**
- `404` - Particle not found or access denied

### POST /particles/
Create a new particle.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "New Project Idea",
  "content": "Build a productivity app using PARA method...",
  "section": "Projects",
  "tags": ["productivity", "idea"]
}
```

**Response (201 Created):**
```json
{
  "id": 15,
  "title": "New Project Idea", 
  "content": "Build a productivity app using PARA method...",
  "tags": ["productivity", "idea"],
  "section": "Projects",
  "user": "alex_student",
  "created": "2025-09-15T14:22:00Z",
  "updated": "2025-09-15T14:22:00Z"
}
```

**Validation:**
- Title: Required, max 200 characters
- Content: Required, max 100KB
- Section: Must be "Projects", "Areas", "Resources", or "Archives"
- Tags: Optional array of strings

**Errors:**
- `400` - Validation error

### PUT /particles/{id}
Update an existing particle.

**Headers:** `Authorization: Bearer <token>`

**Request (partial update supported):**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["updated", "tags"]
}
```

**Response (200 OK):**
```json
{
  "id": 15,
  "title": "Updated Title",
  "content": "Updated content...", 
  "tags": ["updated", "tags"],
  "section": "Projects",
  "user": "alex_student",
  "created": "2025-09-15T14:22:00Z",
  "updated": "2025-09-15T15:10:00Z"
}
```

**Errors:**
- `404` - Particle not found or access denied
- `400` - Validation error

### DELETE /particles/{id}
Delete a particle.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Particle deleted successfully",
  "success": true
}
```

**Errors:**
- `404` - Particle not found or access denied

### GET /particles/stats/summary
Get particle statistics by section.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "Projects": 5,
  "Areas": 3, 
  "Resources": 12,
  "Archives": 2,
  "total": 22
}
```

## Error Codes

### HTTP Status Codes
- `200` - OK (successful GET, PUT, DELETE)
- `201` - Created (successful POST)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected server error)

### Common Error Messages

**Authentication Errors:**
```json
{
  "detail": "Your session has expired or is invalid. Please log in again to continue.",
  "success": false
}
```

**Validation Errors:**
```json
{
  "detail": "Username 'alex' already exists. Please choose a different username.",
  "success": false
}
```

**Access Control:**
```json
{
  "detail": "Particle with ID 123 not found or you don't have permission to update it.",
  "success": false
}
```

## Rate Limiting

Currently no rate limiting implemented. For production deployment, consider:
- 100 requests per minute per user
- 1000 requests per hour per IP

## Interactive Documentation

Visit the auto-generated Swagger UI:
- **Development**: `http://localhost:8000/docs`
- **Production**: `https://pim-project-qgyu.onrender.com/docs`

## SDK Examples

### JavaScript (Frontend)
```javascript
class ApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }
  
  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Usage
  async getParticles(section = null) {
    const query = section ? `?section=${section}` : '';
    return this.request(`/particles/${query}`);
  }
  
  async createParticle(data) {
    return this.request('/particles/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Example usage
const api = new ApiClient('http://localhost:8000/api/v1', userToken);
const particles = await api.getParticles('Projects');
```

### Python (Backend Integration)
```python
import requests

class PIMClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_particles(self, section=None):
        params = {'section': section} if section else {}
        response = requests.get(
            f'{self.base_url}/particles/',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def create_particle(self, data):
        response = requests.post(
            f'{self.base_url}/particles/',
            headers=self.headers,
            json=data
        )
        response.raise_for_status() 
        return response.json()

# Example usage
client = PIMClient('http://localhost:8000/api/v1', user_token)
particles = client.get_particles('Projects')
```

## Testing the API

### Manual Testing with curl

**Login and get token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass" \
  | jq -r '.access_token')
```

**Create a particle:**
```bash
curl -X POST http://localhost:8000/api/v1/particles/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Particle",
    "content": "This is a test",
    "section": "Projects",
    "tags": ["test"]
  }'
```

**Get particles:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/particles/
```

### Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "PIM API",
    "description": "PARA InfoSystem API"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{"key": "token", "value": "{{jwt_token}}"}]
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [],
        "url": "{{base_url}}/auth/token",
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            {"key": "username", "value": "testuser"},
            {"key": "password", "value": "testpass"}
          ]
        }
      }
    }
  ]
}
```

---

*API design keeps evolving based on frontend needs! 🚀*