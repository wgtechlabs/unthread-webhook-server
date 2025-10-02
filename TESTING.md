# Testing Guide

This document outlines testing standards, patterns, and best practices for the Unthread Webhook Server project.

## 🧪 Testing Framework

We use [Vitest](https://vitest.dev/) as our testing framework for its:
- **Speed**: Significantly faster than Jest
- **TypeScript Support**: First-class TypeScript integration
- **ESM Support**: Native ES modules support
- **Developer Experience**: Interactive UI and excellent error messages
- **Built-in Coverage**: V8-based coverage reporting

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests once (CI/CD friendly)
yarn test

# Run tests in watch mode (development)
yarn test:watch

# Run tests with interactive UI
yarn test:ui

# Generate coverage report
yarn test:coverage
```

### Test Commands Explained

- **`yarn test`**: Runs all tests once and exits. Perfect for CI/CD pipelines and pre-commit checks.
- **`yarn test:watch`**: Runs tests in watch mode. Tests automatically re-run when files change. Ideal for development.
- **`yarn test:ui`**: Opens an interactive browser-based UI for debugging and exploring tests.
- **`yarn test:coverage`**: Generates detailed coverage reports in multiple formats (text, JSON, HTML, LCOV).

## 📁 Test Organization

### Co-located Tests

Tests are placed alongside the source code they test, using the `.test.ts` suffix:

```
src/
├── utils/
│   ├── signature.ts          # Source code
│   └── signature.test.ts     # Tests
├── services/
│   ├── redisService.ts       # Source code
│   └── redisService.test.ts  # Tests
└── middleware/
    ├── auth.ts               # Source code
    └── auth.test.ts          # Tests
```

**Benefits:**
- Easy to find tests for a given file
- Keeps related code together
- Easier maintenance and refactoring

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should handle expected behavior', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = processInput(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Test Patterns

#### 1. Unit Tests
Test individual functions in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSum } from './math';

describe('calculateSum', () => {
  it('should add two numbers correctly', () => {
    expect(calculateSum(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(calculateSum(-5, 3)).toBe(-2);
  });

  it('should handle zero', () => {
    expect(calculateSum(0, 0)).toBe(0);
  });
});
```

#### 2. Testing with Mocks
Use Vitest's built-in mocking:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendNotification } from './notifications';

describe('sendNotification', () => {
  it('should call the API with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    await sendNotification('user@example.com', 'Hello');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notify'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
  });
});
```

#### 3. Async Testing
Handle asynchronous code properly:

```typescript
import { describe, it, expect } from 'vitest';
import { fetchData } from './api';

describe('fetchData', () => {
  it('should fetch data successfully', async () => {
    const data = await fetchData('https://api.example.com');
    expect(data).toHaveProperty('id');
  });

  it('should handle errors', async () => {
    await expect(fetchData('invalid-url')).rejects.toThrow('Network error');
  });
});
```

## 📊 Coverage Requirements

We maintain high code coverage standards:

| Metric      | Threshold |
|-------------|-----------|
| Lines       | 80%       |
| Functions   | 80%       |
| Branches    | 80%       |
| Statements  | 80%       |

### Viewing Coverage Reports

After running `yarn test:coverage`, open the HTML report:

```bash
# Generate coverage
yarn test:coverage

# Open HTML report in browser
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

Coverage files are located in:
- `coverage/` - All coverage reports
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD integration

## 🔧 Configuration

### Vitest Configuration

The Vitest configuration is in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
});
```

### TypeScript Configuration

Test files are excluded from the build but type-checked by Vitest:

```json
{
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

## 🎯 Best Practices

### 1. Test Naming
Use descriptive names that explain what's being tested:

✅ **Good:**
```typescript
it('should return 404 when webhook ID does not exist', () => {
  // ...
});
```

❌ **Bad:**
```typescript
it('test webhook', () => {
  // ...
});
```

### 2. AAA Pattern
Structure tests using Arrange-Act-Assert:

```typescript
it('should validate webhook signature', () => {
  // Arrange
  const payload = '{"event": "test"}';
  const signature = 'sha256=abc123';
  
  // Act
  const isValid = verifySignature(payload, signature);
  
  // Assert
  expect(isValid).toBe(true);
});
```

### 3. Test Independence
Each test should be independent and not rely on others:

```typescript
// Each test sets up its own data
describe('User Management', () => {
  it('should create a user', () => {
    const user = createUser({ name: 'John' });
    expect(user.name).toBe('John');
  });

  it('should update a user', () => {
    const user = createUser({ name: 'John' });
    const updated = updateUser(user, { name: 'Jane' });
    expect(updated.name).toBe('Jane');
  });
});
```

### 4. Edge Cases
Always test edge cases:

```typescript
describe('parseInput', () => {
  it('should handle empty string', () => {
    expect(parseInput('')).toEqual([]);
  });

  it('should handle null', () => {
    expect(parseInput(null)).toEqual([]);
  });

  it('should handle undefined', () => {
    expect(parseInput(undefined)).toEqual([]);
  });
});
```

### 5. Error Testing
Test error conditions explicitly:

```typescript
it('should throw error for invalid input', () => {
  expect(() => processData(null)).toThrow('Invalid input');
});

it('should reject promise on failure', async () => {
  await expect(fetchData('bad-url')).rejects.toThrow();
});
```

## 🔌 VS Code Integration

The Vitest VS Code extension provides:
- Inline test results
- Run/debug individual tests
- Coverage highlighting
- Auto-run on save

Install the recommended extension:
```
vitest.explorer
```

Configuration in `.vscode/settings.json`:
```json
{
  "vitest.enable": true,
  "vitest.commandLine": "yarn test:watch"
}
```

## 🤝 Contributing Tests

When contributing to the project:

1. **Write tests for new features**: All new functionality should include tests
2. **Update tests for bug fixes**: Add tests that verify the fix
3. **Maintain coverage**: Ensure your changes don't reduce coverage below thresholds
4. **Run tests locally**: Always run tests before submitting a PR
5. **Follow patterns**: Use existing tests as examples

### Pre-commit Checklist

- [ ] All tests pass: `yarn test`
- [ ] Coverage meets requirements: `yarn test:coverage`
- [ ] TypeScript compiles: `yarn type-check`
- [ ] Build succeeds: `yarn build`

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Best Practices](https://vitest.dev/guide/features.html)
- [Coverage Configuration](https://vitest.dev/guide/coverage.html)

## 💡 Tips

### Debugging Tests

1. **Use `.only` to run a single test:**
   ```typescript
   it.only('should test this specific case', () => {
     // Only this test will run
   });
   ```

2. **Skip flaky tests temporarily:**
   ```typescript
   it.skip('temporarily disabled test', () => {
     // This test will be skipped
   });
   ```

3. **Use the interactive UI:**
   ```bash
   yarn test:ui
   ```

### Faster Test Runs

- Use `yarn test:watch` - only changed files are retested
- Use `.only` during development to focus on specific tests
- Leverage Vitest's parallel execution (automatic)

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout in `vitest.config.ts` or use `timeout` option:
  ```typescript
  it('long running test', async () => {
    // ...
  }, 30000); // 30 second timeout
  ```

**Issue**: Mocks not working
- **Solution**: Ensure you're using `vi.fn()` from Vitest, not Jest

**Issue**: Coverage too low
- **Solution**: Add tests for uncovered code paths shown in HTML report

## 🎓 Learning Resources

New to testing? Start here:

1. Read the [Vitest Getting Started Guide](https://vitest.dev/guide/)
2. Review existing tests in the `src/` directory
3. Write simple tests for utility functions
4. Gradually move to more complex integration tests

---

**Questions?** Open an issue or reach out to the maintainers.
