# Test Plan & Strategy

## Testing Philosophy

We follow the testing pyramid: lots of unit tests, some integration tests, few E2E tests. 

**Why?**
- Unit tests are fast and catch most bugs
- Integration tests verify components work together  
- E2E tests ensure user workflows work
- More tests at the bottom = faster feedback

```
      🔺 E2E Tests (slow, expensive)
     🔹🔹 Integration Tests  
   🔸🔸🔸🔸 Unit Tests (fast, cheap)
```

## Test Coverage Goals

- **Backend**: >90% line coverage
- **Frontend**: >80% function coverage
- **E2E**: Cover critical user journeys
- **Manual**: Usability and edge cases

## Testing Stack

### Backend Testing
- **Framework**: pytest
- **Fixtures**: pytest fixtures for test data
- **Mocking**: unittest.mock for external dependencies
- **Coverage**: pytest-cov for coverage reports
- **Database**: Separate test database file

### Frontend Testing  
- **Framework**: Vitest (modern, fast alternative to Jest)
- **DOM**: jsdom for DOM simulation
- **Assertions**: Vitest built-in assertions
- **Coverage**: c8 for coverage reports

### E2E Testing
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, Safari
- **Features**: Screenshots, video recording, network mocking
- **Auth**: Custom auth state management

## Backend Test Structure

### Unit Tests (131 tests)

**Test Organization:**
```
tests/
├── conftest.py           # Shared fixtures
├── test_auth.py          # Authentication (21 tests)
├── test_database.py      # Database operations (26 tests)
├── test_models.py        # Pydantic models (28 tests)
├── test_routes.py        # API endpoints (28 tests)
└── test_services.py      # Business logic (28 tests)
```

**Key Test Patterns:**

*Fixture-based setup:*
```python
@pytest.fixture
def test_user():
    return UserCreate(username="testuser", password="testpass123")

@pytest.fixture  
def test_db():
    db_path = "test_pim.db"
    db_manager.initialize_schema()
    yield db_path
    os.remove(db_path)
```

*Service layer testing:*
```python
def test_create_user_success(test_user):
    result = user_service.create_user(test_user)
    assert result["success"] is True
    assert result["username"] == test_user.username

def test_create_user_duplicate_username(test_user):
    user_service.create_user(test_user)
    with pytest.raises(ServiceError, match="already exists"):
        user_service.create_user(test_user)
```

*Database testing with transactions:*
```python
def test_particle_crud_operations(test_user_data):
    # Test create
    particle_id = particle_service.create_particle(test_particle, "testuser")
    assert particle_id is not None
    
    # Test read
    particle = particle_service.get_particle_by_id(particle_id, "testuser")
    assert particle.title == test_particle.title
    
    # Test update
    update_data = ParticleUpdate(title="Updated Title")
    updated = particle_service.update_particle(particle_id, update_data, "testuser") 
    assert updated.title == "Updated Title"
    
    # Test delete
    success = particle_service.delete_particle(particle_id, "testuser")
    assert success is True
```

### API Integration Tests (28 tests)

*Testing HTTP endpoints:*
```python
@pytest.fixture
def authenticated_client():
    client = TestClient(app)
    # Create test user and get token
    response = client.post("/api/v1/users/register", json={
        "username": "testuser", 
        "password": "testpass123"
    })
    
    login_response = client.post("/api/v1/auth/token", data={
        "username": "testuser",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

def test_create_particle_endpoint(authenticated_client):
    response = authenticated_client.post("/api/v1/particles/", json={
        "title": "Test Particle",
        "content": "Test content",
        "section": "Projects",
        "tags": ["test"]
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Particle"
    assert "Projects" in data["section"]
```

## Frontend Test Structure

### Unit Tests (36 tests)

**Test Organization:**
```
static/js/test/
├── setup.js              # Test environment setup
├── api.test.js           # API client (12 tests)
├── auth.test.js          # Authentication (10 tests)  
├── markdown.test.js      # Markdown processing (8 tests)
└── security.test.js      # Security utilities (6 tests)
```

**Example Tests:**

*API client testing:*
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiService } from '../modules/api.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiService', () => {
  let apiService;
  
  beforeEach(() => {
    apiService = new ApiService();
    vi.clearAllMocks();
  });

  it('should handle successful login', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        access_token: 'test-token',
        token_type: 'bearer'
      })
    };
    
    fetch.mockResolvedValueOnce(mockResponse);
    
    const result = await apiService.login('testuser', 'testpass');
    
    expect(result.access_token).toBe('test-token');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/token'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({
        detail: 'Invalid credentials'
      })
    };
    
    fetch.mockResolvedValueOnce(mockResponse);
    
    await expect(apiService.login('bad', 'creds'))
      .rejects.toThrow('Login failed: Invalid credentials');
  });
});
```

*Security utilities testing:*
```javascript
import { SecurityUtils } from '../modules/security.js';

describe('SecurityUtils', () => {
  it('should escape HTML characters', () => {
    const unsafe = '<script>alert("xss")</script>';
    const safe = SecurityUtils.escapeHtml(unsafe);
    
    expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
  
  it('should validate password strength', () => {
    expect(SecurityUtils.validatePassword('weak')).toBe(false);
    expect(SecurityUtils.validatePassword('strong123!')).toBe(true);
  });
});
```

## E2E Test Structure

### Critical User Journeys (20 tests)

**Test Organization:**
```
e2e/
├── auth.spec.js          # Login/logout flows (8 tests)
├── particles.spec.js     # CRUD operations (8 tests)
├── dashboard.spec.js     # Dashboard functionality (4 tests)
└── search.spec.js        # Search features (0 tests) // TODO
```

**Example E2E Tests:**

*Authentication flow:*
```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    // Visit the app
    await page.goto('/');
    
    // Register new user
    await page.click('#show-register');
    await page.fill('#register-username', 'newuser');
    await page.fill('#register-password', 'password123');
    await page.click('#register-btn');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard.html');
    await expect(page.locator('.user-display')).toContainText('newuser');
  });
  
  test('user can logout', async ({ page, context }) => {
    // Login first (using auth setup)
    await page.goto('/dashboard.html');
    
    // Logout
    await page.click('#logout-btn');
    
    // Should redirect to login
    await expect(page).toHaveURL('/index.html');
    
    // Local storage should be cleared
    const storage = await context.storageState();
    expect(storage.origins[0].localStorage).toEqual([]);
  });
});
```

*Particle management:*
```javascript
test.describe('Particle Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login as test user
    await page.goto('/');
    await page.fill('#login-username', 'testuser');
    await page.fill('#login-password', 'testpass123');
    await page.click('#login-btn');
    await page.waitForURL('/dashboard.html');
  });
  
  test('user can create a new particle', async ({ page }) => {
    // Navigate to create page
    await page.click('#create-particle-btn');
    await expect(page).toHaveURL('/edit.html');
    
    // Fill form
    await page.fill('.article-header input', 'Test Particle');
    await page.fill('.markdown-editor', 'This is test content');
    await page.selectOption('.section-select', 'Projects');
    
    // Save
    await page.click('.btn-primary');
    
    // Should redirect to dashboard  
    await expect(page).toHaveURL('/dashboard.html');
    
    // New particle should appear
    await expect(page.locator('.particle-card')).toContainText('Test Particle');
  });
  
  test('user can search particles', async ({ page }) => {
    // Type in search box
    await page.fill('.search-input', 'test');
    
    // Wait for debounced search
    await page.waitForTimeout(500);
    
    // Should filter results
    const particles = page.locator('.particle-card');
    await expect(particles).toHaveCount(1);
    await expect(particles.first()).toContainText('test');
  });
});
```

## Test Data Management

### Test Fixtures

**Backend fixtures:**
```python
# conftest.py
@pytest.fixture
def test_user_data():
    return UserCreate(
        username="testuser",
        password="testpass123"
    )

@pytest.fixture  
def test_particle_data():
    return ParticleCreate(
        title="Test Particle",
        content="Test content with **markdown**",
        section="Projects", 
        tags=["test", "sample"]
    )

@pytest.fixture
def test_db_session():
    """Clean database session for each test"""
    db_manager.execute_query("DELETE FROM particles")
    db_manager.execute_query("DELETE FROM users")
    yield
    # Cleanup handled by db_manager
```

**Frontend test data:**
```javascript
// setup.js
export const testUser = {
  username: 'testuser',
  password: 'testpass123'
};

export const testParticle = {
  title: 'Test Particle',
  content: 'Test content',
  section: 'Projects',
  tags: ['test']
};

// Mock API responses
export const mockApiResponses = {
  loginSuccess: {
    access_token: 'mock-jwt-token',
    token_type: 'bearer',
    expires_in: 3600
  },
  particlesList: [
    { id: 1, title: 'First Particle', section: 'Projects' },
    { id: 2, title: 'Second Particle', section: 'Areas' }
  ]
};
```

## Running Tests

### Backend Tests
```bash
cd api

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_services.py

# Run specific test
pytest tests/test_services.py::test_create_user_success

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

### Frontend Tests  
```bash
cd api/static/js

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm test -- api.test.js
```

### E2E Tests
```bash
# Install Playwright browsers (first time)
npx playwright install

# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Continuous Integration

### GitHub Actions (Future)
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v3
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v3
  
  frontend:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd api/static/js && npm ci
      - run: cd api/static/js && npm test
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

## Test Metrics & Coverage

### Current Coverage (as of Sept 2025)
- **Backend**: 94% line coverage (131/131 tests passing)
- **Frontend**: 87% function coverage (36/36 tests passing)  
- **E2E**: 5 critical user journeys covered

### Coverage Reports
```bash
# Backend coverage report
pytest --cov=. --cov-report=html
open htmlcov/index.html

# Frontend coverage report  
npm run test:coverage
open coverage/index.html
```

### What's Not Covered
- Error edge cases (network failures, etc.)
- Browser compatibility testing
- Performance testing under load
- Accessibility testing
- Mobile device testing

## Testing Best Practices

### What We Do Well
- ✅ Test isolation (clean database per test)
- ✅ Realistic test data
- ✅ Both success and error cases
- ✅ Fast feedback loop
- ✅ Clear test organization

### What We Could Improve
- 🔄 More edge case testing
- 🔄 Performance/load testing  
- 🔄 Cross-browser E2E testing
- 🔄 Visual regression testing
- 🔄 Automated accessibility testing

### Testing Team Agreements
- Write tests before pushing code
- Aim for >90% backend coverage
- E2E tests for user-critical features only
- Mock external dependencies
- Keep tests simple and readable

## Debugging Test Failures

### Common Issues & Solutions

**Database test pollution:**
```python
# Solution: Use proper fixture cleanup
@pytest.fixture(autouse=True)
def clean_db():
    db_manager.execute_query("DELETE FROM particles")
    db_manager.execute_query("DELETE FROM users")  
    yield
```

**Async timing issues in E2E:**
```javascript
// Problem: Element not ready
await page.click('#button');

// Solution: Wait for element
await page.waitForSelector('#button', { state: 'visible' });
await page.click('#button');
```

**Mock not working:**
```javascript
// Problem: Mock not clearing between tests
fetch.mockReturnValue(mockResponse);

// Solution: Clear mocks in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

*Tests give us confidence to ship! 🧪*