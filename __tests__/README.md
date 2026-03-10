# Test Suite

This directory contains automated tests for the Recipe Shopper application.

## Test Structure

- **`db.test.js`** - Database operations tests (SQLite queries, transactions)
- **`api-simple.test.js`** - Integration tests for API functionality (database + business logic)
- **`frontend.test.js`** - Frontend logic tests (data validation, formatting, state management)

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
```

### CI/CD Pipeline

Tests automatically run on:
- Push to `main`, `master`, or `develop` branches
- Pull requests to these branches

The CI pipeline runs tests against Node.js versions 18.x and 20.x.

## Test Coverage

The test suite covers:

### Database Operations (db.test.js)
- Creating recipes with ingredients
- Retrieving all recipes
- Deleting recipes and cascade deletion
- Cart operations (add, remove, duplicates)
- Shopping list aggregation
- Export/import data operations

### API Integration (api-simple.test.js)
- Recipe CRUD operations
- Cart management (add/remove recipes)
- Shopping list aggregation
- Export functionality
- Import with add mode (skip duplicates)
- Import with overwrite mode

### Frontend Logic (frontend.test.js)
- Recipe data structure validation
- Shopping list aggregation logic
- Export/import data formatting
- File handling (JSON parsing, blob creation)
- Cart management state
- View state management
- Form validation

## Coverage Reports

After running `npm test`, coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/coverage-final.json` - JSON coverage data for CI tools

## Writing New Tests

When adding new features, follow this pattern:

```javascript
describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically:
1. Checks out code
2. Sets up Node.js (multiple versions)
3. Installs dependencies
4. Runs tests with coverage
5. Uploads coverage reports
6. Archives test results

## Troubleshooting

### Tests failing locally but passing in CI
- Ensure you're using the same Node.js version
- Check for environment-specific dependencies
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Database tests failing
- Ensure no leftover `.db` files in `__tests__` directory
- Each test creates and destroys its own temporary database

### Coverage not generating
- Make sure you're running `npm test` (not `jest` directly)
- Check that the `coverage/` directory is writable
