# 🎯 Contribute to Unthread Webhook Server

Any contributions are welcome, encouraged, and valued. See the following information below for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for the maintainer and smooth out the experience for all involved. The community looks forward to your contributions. 🎉✌✨

## 📋 Code of Conduct

This project and everyone participating in it is governed by the project's [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to <opensource@wgtechlabs.com>.

## 💖 How to Contribute

There are many ways to contribute to this open source project. Any contributions are welcome and appreciated. Be sure to read the details of each section for you to start contributing.

### 🧬 Development

If you can write code then create a pull request to this repo and I will review your code. Please consider submitting your pull request to the `dev` branch. I will auto reject if you submit your pull request to the `main` branch.

#### 🔧 Development Setup

To get started with development:

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/unthread-webhook-server.git
   cd unthread-webhook-server
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   > ⚠️ **Important**: This project enforces the use of pnpm. npm and yarn install will be blocked automatically.

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in the required information as described in the README
   ```bash
   cp .env.example .env
   ```

4. **Start Redis**
   ```bash
   # Choose one option based on your setup
   redis-server                          # Local installation
   brew services start redis             # macOS
   sudo systemctl start redis-server     # Linux
   docker run -d -p 6379:6379 redis:alpine  # Docker
   
   # OR for full Docker setup with proper naming:
   docker network create unthread-integration-network
   docker-compose up -d redis-webhook
   ```

5. **Start the project in development mode**
   ```bash
   pnpm dev
   ```

Please refer to the [README](./README.md) for more detailed setup instructions.

#### 🏗️ Development Commands

```bash
# Development with auto-reload
pnpm dev

# Build for production
pnpm build

# Type checking only
pnpm type-check

# Linting
pnpm lint              # Run ESLint on all source files
pnpm lint:fix          # Run ESLint with auto-fix
pnpm lint:security     # Focus on security-related issues
pnpm lint:ci           # CI-friendly linting (fails on warnings)

# Clean build artifacts
pnpm clean

# Start production build
pnpm start

# Run tests
pnpm test                # Run all tests once
pnpm test:watch          # Run tests in watch mode
pnpm test:ui             # Interactive test UI
pnpm test:coverage       # Generate coverage report
```

#### 🏛️ Project Structure

```
src/
├── app.ts              # Main application entry point
├── config/             # Configuration files
│   ├── env.ts         # Environment configuration
│   └── redis.ts       # Redis configuration
├── controllers/        # Request handlers
│   └── webhookController.ts
├── middleware/         # Express middleware
│   ├── auth.ts        # HMAC signature verification
│   └── validation.ts  # Request validation
├── services/           # Business logic
│   ├── redisService.ts
│   └── webhookService.ts
├── types/             # TypeScript type definitions
│   └── index.ts
└── utils/             # Helper functions
    └── signature.ts   # HMAC signature utilities
```

#### 🎯 Development Guidelines

- **TypeScript First**: All code must be written in TypeScript with strict type checking
- **Code Quality**: Follow ESLint rules and security best practices enforced by automated linting
- **Structured Logging**: Use `@wgtechlabs/log-engine` for all logging with built-in PII protection and security features
- **Error Handling**: Implement comprehensive error handling with detailed logging
- **Package Manager**: Use pnpm exclusively (enforced via preinstall script)
- **Code Style**: Follow existing patterns and maintain consistency
- **Environment**: Use Node.js 20+ for development
- **Redis Integration**: Ensure Redis connectivity for all webhook-related features
- **Webhook Integration**: Ensure compatibility with [`wgtechlabs/unthread-telegram-bot`](https://github.com/wgtechlabs/unthread-telegram-bot)

#### 🔍 Code Quality and Linting

This project uses **ESLint** with comprehensive security plugins to maintain code quality and prevent common security vulnerabilities.

**Security Plugins Enabled:**

- **eslint-plugin-security** - Detects common security vulnerabilities
- **eslint-plugin-no-secrets** - Prevents hardcoded secrets and credentials
- **eslint-plugin-n** - Node.js best practices and deprecated API detection
- **eslint-plugin-import** - Validates ES6 import/export syntax
- **eslint-plugin-promise** - Ensures proper promise handling

**Running Linting:**

```bash
# Check for issues
pnpm lint

# Automatically fix issues
pnpm lint:fix

# Security-focused check
pnpm lint:security

# CI mode (fails on warnings)
pnpm lint:ci
```

**Comprehensive ESLint Configuration:**

This project uses a modern flat config format (`eslint.config.js`) with the following capabilities:
- **TypeScript-first**: Full TypeScript-ESLint integration with strict type checking
- **Security-focused**: Multiple security plugins working together to prevent vulnerabilities
- **Customizable**: Tailored rules for webhook server security requirements
- **IDE Integration**: Works seamlessly with VSCode ESLint extension

For complete configuration details, see [ESLINT.md](./ESLINT.md).

**Key Security Rules:**

- **No hardcoded secrets** - Detects API keys, tokens, passwords, webhook secrets in code
- **Safe regular expressions** - Prevents ReDoS attacks
- **Secure random generation** - Enforces crypto.randomBytes over Math.random
- **Object injection protection** - Warns about unsafe object property access
- **Child process security** - Flags potentially unsafe child process usage
- **Promise handling** - Ensures all promises are properly handled

**Best Practices:**

- **Fix all linting errors** before submitting PRs (required)
- **Address security warnings** unless there's a documented reason to ignore them
- **Use ESLint disable comments sparingly** and only with proper justification
- **Run `pnpm lint:fix`** to auto-fix style issues before committing
- **Test security rules** with `pnpm lint:security` for security-focused checks
- **VSCode users** get automatic linting and auto-fix on save with ESLint extension
- **Document any rule disables** in code comments explaining why they're necessary

**When to Disable Rules:**

```typescript
// ✅ Good - documented reason
// eslint-disable-next-line security/detect-object-injection
const value = obj[key]; // key is from typed enum, safe

// ❌ Bad - no justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

#### 🧪 Testing Guidelines

This project uses [Vitest](https://vitest.dev/) for automated testing. When contributing:

**Automated Testing:**
- Write tests for new features and bug fixes
- Ensure all tests pass: `yarn test`
- Maintain minimum 80% code coverage: `yarn test:coverage`
- Follow co-located test patterns (e.g., `signature.ts` → `signature.test.ts`)
- See [TESTING.md](./TESTING.md) for detailed testing documentation

**Manual Testing:**
- Test your changes using tools like ngrok for webhook testing
- Verify Redis connectivity and queue operations
- Test HMAC signature verification with valid Unthread events
- Ensure proper error handling for edge cases
- Verify platform source detection accuracy

#### 🔍 Code Review Process

1. **Pre-submission checks**:
   - [ ] Code builds without errors (`pnpm build`)
   - [ ] TypeScript type checking passes (`pnpm type-check`)
   - [ ] Linting passes without errors (`pnpm lint`)
   - [ ] All tests pass (`pnpm test`)
   - [ ] Coverage requirements met (`pnpm test:coverage`)
   - [ ] Development server starts successfully (`pnpm dev`)
   - [ ] Redis integration works properly
   - [ ] Error handling is comprehensive
   - [ ] No security warnings from `pnpm lint:security`

2. **Pull Request Requirements**:
   - [ ] Target the `dev` branch (PRs to `main` will be rejected)
   - [ ] Include clear description of changes
   - [ ] Follow existing code patterns and ESLint rules
   - [ ] Update documentation if needed
   - [ ] Add/update tests for changes
   - [ ] Test webhook functionality manually
   - [ ] All linting issues resolved or properly justified

### 📖 Documentation

Improvements to documentation are always welcome! This includes:
- README updates
- Code comments
- API documentation
- Configuration examples
- Troubleshooting guides
- Fixing typos or clarifying existing documentation

### 🐞 Reporting Bugs

For any security bugs or issues, please create a private security advisory through GitHub's security advisory feature.

For other bugs, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, Redis version, OS)
- Relevant logs or error messages

### 💡 Feature Requests

We welcome suggestions for new features! Please create an issue with:

- Clear description of the feature
- Use case and benefits
- Any implementation considerations
- Examples or mockups if applicable

## 📊 Advanced Logging Security with Log Engine

This project uses [`@wgtechlabs/log-engine`](https://github.com/wgtechlabs/log-engine) for enterprise-grade logging with built-in security features and comprehensive PII protection.

### 🔒 **Automatic Security Features**

**Zero Configuration PII Protection:**

- **Automatic Redaction**: Passwords, tokens, emails, API keys, and 50+ sensitive patterns are automatically protected
- **Deep Object Scanning**: Recursively scans nested objects and arrays for sensitive data
- **Content Truncation**: Large payloads are automatically truncated to prevent log bloat
- **Environment-Based Control**: Security automatically adapts based on NODE_ENV settings

**Built-in Patterns Protected:**

- **Authentication**: `password`, `token`, `apiKey`, `secret`, `jwt`, `auth`, `sessionId`
- **Personal Info**: `email`, `phone`, `ssn`, `firstName`, `lastName`, `address`
- **Financial**: `creditCard`, `cvv`, `bankAccount`, `routingNumber`
- **System**: `clientSecret`, `privateKey`, `webhookSecret`, `unthreadSecret`

### 🛡️ **Advanced Security Configuration**

**Custom Enterprise Protection:**

```javascript
import { LogEngine } from '@wgtechlabs/log-engine';

// Add custom patterns for enterprise-specific data
LogEngine.addCustomRedactionPatterns([
  /internal.*/i,        // Matches any field starting with "internal"
  /company.*/i,         // Matches any field starting with "company"
  /webhook.*/i,         // Matches webhook-specific fields
  /unthread.*/i         // Matches unthread-specific fields
]);

// Add dynamic sensitive field names
LogEngine.addSensitiveFields([
  'webhookSecret', 
  'unthreadWebhookSecret', 
  'unthreadApiKey',
  'redisPassword'
]);
```

**Secure Logging Examples:**

```javascript
// ✅ Automatic protection - no configuration needed
LogEngine.info('Webhook authentication', {
  webhookId: '123456789',          // ✅ Visible
  webhookSecret: 'secret123',      // ❌ [REDACTED]
  targetPlatform: 'telegram',      // ✅ Visible
  unthreadApiKey: 'key_123'        // ❌ [REDACTED]
});

// ✅ Event processing protection
LogEngine.info('Event processing', {
  eventType: 'message_created',     // ✅ Visible
  eventId: 'evt_001',              // ✅ Visible
  signature: 'sha256=...',         // ❌ [REDACTED]
  payload: { /* large data */ }    // Automatically truncated
});

// ✅ Redis queue security
LogEngine.info('Queue publishing', {
  queueName: 'unthread-events',    // ✅ Visible
  platform: 'unthread',           // ✅ Visible
  redisUrl: 'redis://localhost',  // ❌ [REDACTED]
  eventCount: 5                    // ✅ Visible
});
```

### ⚙️ **Environment Configuration**

**Production Security (Recommended):**

```bash
NODE_ENV=production           # Full PII protection enabled
LOG_REDACTION_TEXT="[SECURE]" # Custom redaction text
LOG_MAX_CONTENT_LENGTH=150    # Truncate large content
```

**Development Debugging:**

```bash
NODE_ENV=development          # Redaction disabled for debugging
LOG_REDACTION_DISABLED=true   # Explicit disable
DEBUG_FULL_PAYLOADS=true      # Show complete data
```

**Custom Security Configuration:**

```bash
# Custom sensitive fields (comma-separated)
LOG_SENSITIVE_FIELDS="webhookSecret,unthreadSecret,redisPassword"

# Custom redaction patterns (JSON array)
LOG_CUSTOM_PATTERNS='["/internal.*/i", "/company.*/i"]'

# Truncation settings
LOG_MAX_CONTENT_LENGTH=200
LOG_TRUNCATION_TEXT="... [CONFIDENTIAL_TRUNCATED]"
```

### 🔧 **Development & Debugging**

**Raw Logging for Development:**

```javascript
// ⚠️ Use with caution - bypasses all redaction
LogEngine.debugRaw('Full webhook payload', {
  password: 'visible',          // ⚠️ Visible (not redacted)
  apiKey: 'full-key-visible'    // ⚠️ Visible (not redacted)
});

// Temporary redaction bypass
LogEngine.withoutRedaction().info('Debug mode', sensitiveData);

// Test field redaction
const isRedacted = LogEngine.testFieldRedaction('webhookSecret'); // true
const currentConfig = LogEngine.getRedactionConfig();
```

### 📊 **Logging Benefits for This Webhook Server**

**Security Compliance:**

- **GDPR Ready**: Automatic PII protection for European compliance
- **Data Minimization**: Only necessary data is logged
- **Audit Trails**: Complete security event logging with timestamps
- **Incident Response**: Quick identification of security events

**Operational Benefits:**

- **Color-Coded Output**: Easy visual identification of log levels (🔵 INFO, 🟡 WARN, 🔴 ERROR)
- **Structured Logging**: Consistent format across all webhook components
- **Performance Optimized**: Minimal overhead with intelligent processing
- **TypeScript Support**: Full type safety and IDE integration

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com), [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏
