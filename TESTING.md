# Testing Guide

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Suites

### 1. Authentication API Tests (`auth.test.js`)
Tests for authentication endpoints:
- User registration
- User login
- User logout
- Session management
- Password security
- Protected routes

**Note:** These tests currently contain placeholders. To enable full API testing, export the Express app from `server.js`:

```javascript
// At the end of server.js, add:
module.exports = app;
```

### 2. User Management Tests (`user.test.js`)
Unit tests for user management functions:
- Password hashing with bcrypt
- Email validation
- Password strength validation
- File operations (reading/writing users)
- User lookup functions
- Security best practices

**Status:** ✅ Fully functional

## Test Coverage

Current test coverage focuses on:
- ✅ Password hashing and verification
- ✅ Email format validation
- ✅ File operations for user data
- ✅ Security best practices
- ⏳ API endpoint integration (requires app export)

## Writing New Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeAll(() => {
    // Setup before all tests
  });

  afterAll(() => {
    // Cleanup after all tests
  });

  test('should do something specific', () => {
    // Test code
    expect(result).toBe(expected);
  });
});
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data (files, DB entries)
3. **Descriptive names**: Use clear test descriptions
4. **Edge cases**: Test both success and failure scenarios
5. **Security**: Test authentication and authorization

## Continuous Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
  
- name: Check coverage
  run: npm run test:coverage
```

## Debugging Tests

Run a specific test file:
```bash
npx jest __tests__/user.test.js
```

Run tests matching a pattern:
```bash
npx jest --testNamePattern="password"
```

Enable verbose output:
```bash
npx jest --verbose
```

## Future Test Additions

Planned test suites:
- [ ] Payment processing tests
- [ ] RealVault tokenization tests
- [ ] Transaction management tests
- [ ] HPP integration tests
- [ ] End-to-end browser tests (with Playwright or Cypress)
