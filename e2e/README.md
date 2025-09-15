# E2E Tests for PIM System

This directory contains comprehensive end-to-end tests for the PARA InfoSystem using Playwright.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd e2e
   npm install
   npm run install  # Install Playwright browsers
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run tests:**
   ```bash
   # Run all tests
   npm test
   
   # Run tests with UI mode
   npm run test:ui
   
   # Run specific test suite
   npm run test:auth
   npm run test:dashboard
   npm run test:crud
   ```

## 📁 Project Structure

```
e2e/
├── tests/                  # Test files
│   ├── auth.spec.js       # Authentication tests
│   ├── dashboard.spec.js  # Dashboard and navigation tests
│   └── crud.spec.js       # CRUD operations tests
├── utils/                 # Test utilities and helpers
│   ├── auth-helper.js     # Authentication helper functions
│   ├── page-objects.js    # Page object models
│   ├── test-data.js       # Test data factories and constants
│   ├── global-setup.js    # Global test setup
│   └── global-teardown.js # Global test cleanup
├── fixtures/              # Test data and configuration
│   ├── users.json         # Test user fixtures
│   ├── notes.json         # Test note fixtures
│   └── config.js          # Test configuration
├── playwright.config.js   # Playwright configuration
├── package.json           # Dependencies and scripts
└── .env.example          # Environment variables template
```

## 🧪 Test Categories

### Authentication Tests (`auth.spec.js`)
- ✅ Login flow with valid/invalid credentials
- ✅ Registration form validation and submission
- ✅ Form switching (login ↔ register)
- ✅ Session management and logout
- ✅ Security tests (XSS, SQL injection prevention)
- ✅ Accessibility compliance

### Dashboard Tests (`dashboard.spec.js`)
- ✅ Dashboard layout and element visibility
- ✅ Navigation between pages
- ✅ Responsive design on different screen sizes
- ✅ Search and filter functionality
- ✅ Notes/items display
- ✅ Performance and loading states
- ✅ Error handling

### CRUD Tests (`crud.spec.js`)
- ✅ Create new notes/items
- ✅ Read and view note details
- ✅ Update existing notes
- ✅ Delete notes with confirmation
- ✅ Data validation and error handling
- ✅ PARA category management
- ✅ Large content handling

## 🎯 Test Tags

Tests are tagged for easy filtering:

- `@smoke` - Critical functionality tests
- `@regression` - Full regression test suite
- `@a11y` - Accessibility tests
- `@performance` - Performance-related tests

Run tagged tests:
```bash
npm run test:smoke     # Smoke tests only
npm run test:regression # Full regression suite
```

## 🌐 Browser Coverage

Tests run across multiple browsers:
- **Desktop:** Chrome, Firefox, Safari (WebKit)
- **Mobile:** Mobile Chrome, Mobile Safari
- **Tablet:** iPad Pro

## 📊 Test Reports

After running tests, view results:
```bash
npm run report    # Open HTML report
npm run trace     # View trace files
```

Reports include:
- Test execution results
- Screenshots on failures
- Video recordings (configurable)
- Performance metrics
- Accessibility scan results

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
BASE_URL=http://localhost:8000  # Application URL
TEST_USERNAME=testuser          # Default test user
TEST_PASSWORD=testpass123       # Default test password
HEADLESS=true                   # Run browsers in headless mode
PARALLEL_TESTS=true             # Run tests in parallel
CAPTURE_SCREENSHOTS=true        # Screenshot on failure
```

### Playwright Configuration

Main settings in `playwright.config.js`:
- Browser configurations
- Test timeouts
- Retry policies
- Report generation
- Web server setup

## 🛠️ Development

### Adding New Tests

1. Create test file in `tests/` directory
2. Follow existing patterns and use helper utilities
3. Add appropriate test tags
4. Update this README if adding new test categories

### Test Data Management

- Use `TestDataFactory` for generating dynamic test data
- Store static fixtures in `fixtures/` directory
- Clean up test data after test runs

### Page Objects

Use page object pattern for complex UI interactions:
```javascript
import { DashboardPage } from '../utils/page-objects.js';

const dashboardPage = new DashboardPage(page);
await dashboardPage.waitForLoad();
await dashboardPage.clickCreateNote();
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests timing out:**
   - Increase timeouts in `playwright.config.js`
   - Check if application server is running
   - Verify network connectivity

2. **Authentication failures:**
   - Ensure test user exists in database
   - Check credentials in `.env` file
   - Verify authentication endpoints are working

3. **Element not found errors:**
   - Check if selectors match current UI
   - Wait for elements to load before interacting
   - Use `page.waitForSelector()` for dynamic content

4. **Browser installation issues:**
   ```bash
   npx playwright install --with-deps
   ```

### Debug Mode

Run tests in debug mode:
```bash
npm run test:debug    # Opens browser and pauses on failures
```

### CI/CD Integration

For continuous integration, use:
```bash
# In CI environment
export CI=true
npm test
```

This will:
- Run in headless mode
- Generate JUnit reports
- Skip interactive features
- Use minimal logging

## 📈 Metrics and Coverage

The test suite provides:
- **Functional Coverage:** All major user journeys
- **Browser Coverage:** Chrome, Firefox, Safari, Mobile browsers
- **Accessibility Coverage:** WCAG compliance checks
- **Performance Coverage:** Load time and responsiveness tests
- **Security Coverage:** XSS and injection prevention tests

## 🤝 Contributing

When adding new tests:
1. Follow existing naming conventions
2. Use appropriate test tags
3. Add helper functions to utilities
4. Update documentation
5. Ensure tests are deterministic and can run in parallel

For questions or issues, please refer to the main project documentation or create an issue in the repository.