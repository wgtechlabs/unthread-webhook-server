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
   yarn install
   ```
   > ⚠️ **Important**: This project enforces the use of Yarn. npm install will be blocked automatically.

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
   yarn dev
   ```

Please refer to the [README](./README.md) for more detailed setup instructions.

#### 🏗️ Development Commands

```bash
# Development with auto-reload
yarn dev

# Build for production
yarn build

# Type checking only
yarn type-check

# Clean build artifacts
yarn clean

# Start production build
yarn start
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
- **Structured Logging**: Use `@wgtechlabs/log-engine` for all logging with built-in PII protection and security features
- **Error Handling**: Implement comprehensive error handling with detailed logging
- **Package Manager**: Use Yarn exclusively (enforced via preinstall script)
- **Code Style**: Follow existing patterns and maintain consistency
- **Environment**: Use Node.js 20+ for development
- **Redis Integration**: Ensure Redis connectivity for all webhook-related features
- **Webhook Integration**: Ensure compatibility with [`wgtechlabs/unthread-telegram-bot`](https://github.com/wgtechlabs/unthread-telegram-bot)

#### 🧪 Testing Guidelines

While this project doesn't currently have a test suite, when contributing:

- Test your changes manually using tools like ngrok for webhook testing
- Verify Redis connectivity and queue operations
- Test HMAC signature verification with valid Unthread events
- Ensure proper error handling for edge cases
- Verify platform source detection accuracy

#### 🔍 Code Review Process

1. **Pre-submission checks**:
   - [ ] Code builds without errors (`yarn build`)
   - [ ] TypeScript type checking passes (`yarn type-check`)
   - [ ] Development server starts successfully (`yarn dev`)
   - [ ] Redis integration works properly
   - [ ] Error handling is comprehensive

2. **Pull Request Requirements**:
   - [ ] Target the `dev` branch (PRs to `main` will be rejected)
   - [ ] Include clear description of changes
   - [ ] Follow existing code patterns
   - [ ] Update documentation if needed
   - [ ] Test webhook functionality manually

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
