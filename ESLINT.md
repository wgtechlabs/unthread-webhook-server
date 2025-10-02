# ESLint Configuration Guide

This project uses ESLint with comprehensive security plugins to maintain code quality and prevent common security vulnerabilities.

## 📦 Installed Plugins

### Core
- **@eslint/js** - ESLint's recommended JavaScript rules
- **@typescript-eslint/eslint-plugin** - TypeScript-specific linting rules
- **@typescript-eslint/parser** - TypeScript parser for ESLint

### Security Plugins
- **eslint-plugin-security** - Detects common security vulnerabilities
  - Object injection prevention
  - RegEx DoS protection
  - Buffer security checks
  - Eval detection
  - CSRF protection

- **eslint-plugin-no-secrets** - Prevents hardcoded secrets and credentials
  - API keys detection
  - Passwords and tokens
  - Custom patterns for webhook secrets

### Best Practices
- **eslint-plugin-n** - Node.js best practices and deprecated API detection
- **eslint-plugin-import** - Validates ES6 import/export syntax
- **eslint-plugin-promise** - Ensures proper promise handling

## 🚀 Usage

### Run Linting

```bash
# Check for issues
yarn lint

# Automatically fix issues
yarn lint:fix

# Security-focused check
yarn lint:security

# CI mode (fails on warnings)
yarn lint:ci
```

### VSCode Integration

ESLint is automatically integrated with VSCode:
- Real-time linting feedback
- Auto-fix on save (configurable)
- Inline error/warning display

Make sure you have the ESLint extension installed:
```
ext install dbaeumer.vscode-eslint
```

## 🔒 Key Security Rules

### Critical (Error Level)

- ✅ **No hardcoded secrets** - Detects API keys, tokens, passwords
- ✅ **Safe regular expressions** - Prevents ReDoS attacks
- ✅ **Secure random generation** - Enforces crypto.randomBytes
- ✅ **No eval** - Prevents code injection via eval()
- ✅ **Buffer security** - Checks for unsafe buffer operations
- ✅ **Promise handling** - All promises must be properly handled

### Warnings

- ⚠️ **Object injection** - Warns about dynamic property access
- ⚠️ **Child processes** - Flags subprocess creation
- ⚠️ **File system operations** - Non-literal file paths
- ⚠️ **Timing attacks** - Potential timing-based vulnerabilities
- ⚠️ **process.exit()** - Suggests throwing errors instead

## ⚙️ Configuration

The ESLint configuration uses the modern flat config format (`eslint.config.js`).

### Ignored Patterns

The following are automatically ignored:
- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `*.min.js`
- `.yarn/`
- `tmp/`, `temp/`

### Custom Rules

Some rules are customized for this project:

```javascript
// Security rules - adjusted for false positives
'security/detect-object-injection': 'warn',  // Warn instead of error
'security/detect-non-literal-fs-filename': 'warn',
'security/detect-non-literal-require': 'warn',

// TypeScript rules
'@typescript-eslint/no-explicit-any': 'warn',  // Allow with justification
'@typescript-eslint/no-unused-vars': ['error', { 
  argsIgnorePattern: '^_',  // Allow unused vars prefixed with _
  varsIgnorePattern: '^_',
}],
```

## 💡 Best Practices

### When to Disable Rules

Use ESLint disable comments sparingly and only with justification:

```typescript
// Good - documented reason
// eslint-disable-next-line security/detect-object-injection
if (!event[field]) {  // field is from typed array, safe
  // ...
}

// Bad - no justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

### Acceptable Uses of `any`

The `any` type is acceptable in these cases:
- External API responses (Unthread webhook payloads)
- Dynamic data structures where type is truly unknown
- Express.js Request generics
- Always document why `any` is necessary

### Handling Warnings

- **Fix all errors** before committing
- **Address warnings** unless there's a documented reason
- **Security warnings** should be taken seriously
- Use `yarn lint:fix` to auto-fix style issues

## 🔄 CI/CD Integration

ESLint runs automatically in GitHub Actions:

```yaml
- name: Run linting
  run: yarn lint
```

Builds will fail if there are linting errors. Warnings are allowed but should be minimized.

## 🔧 Troubleshooting

### "Parsing error: parserOptions.project"

Make sure `tsconfig.json` exists and is valid.

### "Cannot find module 'eslint-plugin-xxx'"

Run `yarn install` to ensure all dependencies are installed.

### Too many warnings

Use `yarn lint:fix` to automatically fix style issues.

### False positives

For security false positives:
1. Verify the code is actually safe
2. Add ESLint disable comment with justification
3. Document in PR why the disable is necessary

## 📚 Resources

- [ESLint Documentation](https://eslint.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)
- [eslint-plugin-no-secrets](https://github.com/nickdeis/eslint-plugin-no-secrets)
