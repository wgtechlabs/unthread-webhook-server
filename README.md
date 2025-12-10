# Unthread Webhook Server 🎫⚡ [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![release workflow](https://img.shields.io/github/actions/workflow/status/wgtechlabs/unthread-webhook-server/release.yml?branch=main&style=flat-square&logo=github&labelColor=181717&label=release)](https://github.com/wgtechlabs/unthread-webhook-server/actions/workflows/release.yml) [![build workflow](https://img.shields.io/github/actions/workflow/status/wgtechlabs/unthread-webhook-server/build.yml?branch=dev&style=flat-square&logo=github&labelColor=181717&label=build)](https://github.com/wgtechlabs/unthread-webhook-server/actions/workflows/build.yml) [![node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=flat-square&labelColor=181717&logo=node.js&logoColor=white)](https://nodejs.org/) [![typescript](https://img.shields.io/badge/typescript-5.x-blue.svg?style=flat-square&labelColor=181717&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs) [![version](https://img.shields.io/github/release/wgtechlabs/unthread-webhook-server.svg?logo=github&labelColor=181717&color=green&style=flat-square&label=version)](https://github.com/wgtechlabs/unthread-webhook-server/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/stargazers) [![license](https://img.shields.io/github/license/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/blob/main/license)

A reliable, production-ready Node.js server for processing Unthread.io webhooks with signature verification and smart platform handling. Built with TypeScript, Express.js, and Redis, this webhook server provides secure HMAC-SHA256 signature validation, intelligent event deduplication, seamless integration with multiple platforms including Discord and Telegram, and **advanced file attachment correlation** that accurately detects source platforms for file uploads. The server automatically detects event sources, processes various webhook events (conversations, messages, status updates), correlates file attachments with their originating platforms, and efficiently queues them through Redis for downstream consumption by your bot applications, ensuring reliable and scalable webhook processing for your Unthread.io integrations.

## 🤗 Special Thanks

### 🤝 Partner Organizations

These outstanding organizations partner with us to support our open-source work:

<!-- markdownlint-disable MD033 -->
| <div align="center">💎 Platinum Sponsor</div> |
|:-------------------------------------------:|
| <a href="https://unthread.com"><img src="https://raw.githubusercontent.com/wgtechlabs/unthread-discord-bot/main/.github/assets/sponsors/platinum_unthread.png" width="250" alt="Unthread"></a> |
| <div align="center"><a href="https://unthread.com" target="_blank"><b>Unthread</b></a><br/>Streamlined support ticketing for modern teams.</div> |
<!-- markdownlint-enable MD033 -->


## 🚀 Quick Start

**Requirements**: Node.js 22+, Redis, pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Unthread webhook secret

# 3. Start Redis (choose one)
redis-server                          # Local installation
brew services start redis             # macOS
sudo systemctl start redis-server     # Linux
docker run -d -p 6379:6379 redis:alpine  # Docker

# 4. Run the server
pnpm dev        # Development with auto-reload
pnpm start      # Production mode
```

Server runs on `http://localhost:3000` with endpoints:
- `GET /health` - Health check
- `POST /unthread-webhook` - Webhook endpoint

## ✨ Features

### 🔐 Security & Reliability
- **HMAC-SHA256 Signature Verification**: Secure webhook authentication
- **Event Deduplication**: Redis-based TTL cache prevents duplicate processing
- **Rate Limiting**: Built-in protection against spam and abuse

### 🎯 Smart Platform Detection
- **Intelligent Source Identification**: Automatically detects Dashboard vs. target platform events
- **File Attachment Correlation**: Revolutionary system that links file uploads with their true source platforms
- **Multi-Platform Support**: Discord, Telegram, and extensible for other platforms

### 📎 Advanced File Handling
- **Source Platform Accuracy**: Eliminates "unknown" file sources through intelligent correlation
- **Rich Metadata Generation**: Automatic file summaries with counts, sizes, types, and names
- **Multi-Event Buffering**: Handles multiple file attachments with timeout-based processing
- **Memory-Based Correlation**: 15-second correlation windows with automatic fallbacks

### 🚀 Production-Ready Architecture
- **Redis Queue Integration**: Efficient FIFO event processing
- **Comprehensive Logging**: Detailed operation logs with emoji indicators
- **Health Monitoring**: Built-in health checks for system status
- **TypeScript**: Full type safety throughout the codebase
- **Security-First Linting**: ESLint with comprehensive security plugins (security, no-secrets, promise handling)
- **Code Quality**: Automated code quality checks with TypeScript-ESLint integration

## 🚂 One-Click Deploy

Deploy instantly to Railway with a single click:

[![deploy on railway](https://railway.com/button.svg)](https://railway.com/deploy/unthread-webhook-server?referralCode=dTwT-i)

## 🐳 Docker Setup

```bash
# 1. Create external network (if not already created)
docker network create unthread-integration-network

# 2. Copy environment template
cp .env.example .env
# Edit .env with your webhook secret

# 3. Start with Docker Compose
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f webhook-server
docker-compose logs -f redis-webhook

# 6. Stop services
docker-compose down
```

**Environment Files:**

- `.env` - Single config file for both local development and Docker
- `.env.example` - Template with default values
- `.env.railway` - Railway deployment template

## 🏗️ Development Container

Dev container with Node.js 22.16, pnpm, and essential VS Code extensions (Copilot, ESLint, Docker, GitLens).

**Quick Start:** Open in VS Code → Click "Reopen in Container" → Start coding

## ⚙️ Configuration

### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `UNTHREAD_WEBHOOK_SECRET` | Your Unthread.io signing secret | - | ✅ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `PORT` | Server port | `3000` | ❌ |
| `TARGET_PLATFORM` | Platform identifier (e.g., telegram, discord) | - | ✅ |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | ❌ |

### Getting Your Unthread Signing Secret

1. Go to [Unthread Dashboard](https://dashboard.unthread.io)
2. Navigate to **Webhooks** settings
3. Copy your signing secret to `UNTHREAD_WEBHOOK_SECRET` in `.env`
4. Set your webhook URL to: `https://your-domain.com/unthread-webhook`

For local testing, use [ngrok](https://ngrok.com/): `ngrok http 3000`

## 🔧 How It Works

1. **Webhook Reception**: Receives POST requests from Unthread.io at `/unthread-webhook`
2. **Security**: Validates HMAC-SHA256 signatures using your webhook secret
3. **Deduplication**: Prevents duplicate event processing with Redis TTL cache
4. **Platform Detection**: Identifies if events come from dashboard or target platform
5. **File Attachment Correlation**: Smart correlation system that links file attachments with their source platforms instead of marking them as "unknown"
6. **Queue Publishing**: Sends processed events to Redis `unthread-events` queue with enhanced attachment metadata

### 🎯 File Attachment Intelligence

This server features advanced file attachment correlation that:

- **Eliminates "Unknown" Sources**: Automatically correlates file upload events with their originating platform (Dashboard, Telegram, Discord, etc.)
- **Memory-Based Correlation**: Uses intelligent caching to match message events with subsequent file upload events
- **Rich Metadata Generation**: Provides comprehensive attachment summaries including file count, total size, MIME types, and file names
- **Multi-Event Buffering**: Handles multiple file attachments in a single conversation with timeout-based processing
- **Backwards Compatibility**: Existing integrations continue to work without modification

## 📊 Event Processing

### Supported Events
- `url_verification` - Automatic URL verification
- `conversation_created` - New conversations
- `conversation_updated` - Status changes  
- `conversation_deleted` - Conversation removal
- `message_created` - New messages

### Redis Queue Format

Events are queued with this enhanced structure:

```json
{
  "platform": "unthread",
  "targetPlatform": "telegram",
  "type": "message_created", 
  "sourcePlatform": "dashboard",
  "data": {
    "eventId": "evt_123456789",
    "conversationId": "conv_abc123",
    "content": "Hello from support!",
    "eventTimestamp": 1733097600000,
    "files": [
      {
        "id": "F123ABC456",
        "name": "document.pdf",
        "size": 524288,
        "mimetype": "application/pdf"
      }
    ]
  },
  "attachments": {
    "hasFiles": true,
    "fileCount": 1,
    "totalSize": 524288,
    "types": ["application/pdf"],
    "names": ["document.pdf"]
  },
  "timestamp": 1733097600000
}
```

**New Enhancement**: Events with file attachments now include an `attachments` metadata object providing:
- `hasFiles`: Boolean indicating presence of files
- `fileCount`: Total number of attached files  
- `totalSize`: Combined size of all files in bytes
- `types`: Array of unique MIME types (deduplicated)
- `names`: Array of all file names (maintains order)

## 💻 Development

### Build Commands

```bash
pnpm clean      # Clean previous builds
pnpm build      # Build for production
pnpm type-check # TypeScript type checking only
pnpm dev        # Development with hot-reload
pnpm start      # Run production build
```

### Code Quality & Linting

This project enforces strict code quality and security standards using ESLint with comprehensive security plugins.

```bash
pnpm lint              # Run ESLint on all source files
pnpm lint:fix          # Run ESLint with auto-fix
pnpm lint:security     # Focus on security-related issues
pnpm lint:ci           # CI-friendly linting (fails on warnings)
```

**Security Plugins Enabled:**
- `eslint-plugin-security` - Detects common security vulnerabilities
- `eslint-plugin-no-secrets` - Prevents hardcoded secrets and credentials
- `eslint-plugin-n` - Node.js best practices and deprecated API detection
- `eslint-plugin-import` - Validates ES6 import/export syntax
- `eslint-plugin-promise` - Ensures proper promise handling

For detailed ESLint configuration and security rules, see [ESLINT.md](./ESLINT.md).

### Project Structure

```
src/
├── app.ts              # Main application entry
├── config/             # Configuration files
│   ├── env.ts         # Environment validation
│   └── redis.ts       # Redis configuration
├── controllers/        # Request handlers
│   └── webhookController.ts
├── middleware/         # Auth & validation
│   ├── auth.ts        # HMAC signature verification
│   └── validation.ts  # Request validation
├── services/           # Business logic
│   ├── redisService.ts      # Redis operations
│   └── webhookService.ts    # Webhook processing
├── types/              # TypeScript types
│   └── index.ts       # All type definitions
└── utils/              # Helper functions
    ├── signature.ts         # HMAC utilities
    └── fileAttachmentCorrelation.ts  # File correlation system
```

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) for fast, modern testing with first-class TypeScript support.

### Running Tests

```bash
# Run all tests (one-time)
pnpm test

# Run tests in watch mode (development)
pnpm test:watch

# Run tests with interactive UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Writing Tests

Tests are co-located with source files using the `.test.ts` suffix:
```
src/
├── utils/
│   ├── signature.ts
│   └── signature.test.ts
```

### Coverage Requirements
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

**Healthy Response:**
```json
{
  "status": "OK",
  "redis": "connected",
  "timestamp": "2025-06-21T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "status": "ERROR", 
  "redis": "disconnected",
  "timestamp": "2025-06-21T12:00:00.000Z"
}
```

### Troubleshooting

**Redis Connection Issues:**

- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` in your `.env` file
- Review server logs for connection errors

**Platform Detection Issues:**

- Check logs for detection summary details
- Verify event structure matches Unthread format
- Events may be classified as "unknown" for edge cases

**File Attachment Correlation Issues:**

- Verify `TARGET_PLATFORM` is set correctly in your `.env` file
- Check correlation logs for timing and buffering details
- File events without correlation data will fall back to "unknown" source
- Correlation window is 15 seconds - events outside this window may not correlate

**Common Solutions:**

- Restart the server if platform detection seems inconsistent
- Clear Redis cache if experiencing correlation issues: `redis-cli FLUSHDB`
- Enable debug logging by setting `NODE_ENV=development` for detailed correlation logs

## 🚀 Integration Benefits

### For Bot Developers

- **Accurate Source Detection**: No more "unknown" file attachment sources - get precise platform identification
- **Rich File Metadata**: Access file counts, sizes, types, and names without parsing complex file arrays
- **Simplified Integration**: Use the `attachments` metadata for quick file handling logic
- **Backwards Compatibility**: Existing code continues to work unchanged

### For Production Systems

- **Reliable Correlation**: Memory-based correlation system with 15-second timing windows and automatic fallbacks
- **Robust Error Handling**: Comprehensive timeout management and duplicate prevention
- **Scalable Architecture**: Efficient Redis-based queuing with TTL cleanup and deduplication
- **Production-Ready**: Extensive logging, monitoring, and error recovery mechanisms

## 🎯 Contributing

Contributions are welcome, create a pull request to this repo and I will review your code. Please consider to submit your pull request to the `dev` branch. Thank you!

When contributing, please ensure your code follows the existing TypeScript patterns and includes appropriate error handling.

## � Recent Updates

### v1.0.0-beta.5.2 - File Attachment Intelligence

**Major Enhancement**: Revolutionary file attachment correlation system that eliminates "unknown" source platforms.

**New Features:**
- **Smart File Correlation**: Memory-based system that links file uploads with their originating platforms
- **Rich Attachment Metadata**: Automatic generation of file summaries for easier integration
- **Multi-Event Buffering**: Handles multiple files per conversation with robust timeout management
- **Enhanced Platform Detection**: Required `TARGET_PLATFORM` configuration for improved accuracy
- **Production-Ready**: Comprehensive error handling, logging, and resource cleanup

**Breaking Changes:**
- `TARGET_PLATFORM` is now required (no default value)
- Enhanced Redis queue format includes `attachments` metadata object

**Migration Guide:**
- Set `TARGET_PLATFORM` in your `.env` file (e.g., `telegram`, `discord`)
- Existing integrations will continue to work - new `attachments` field is additive

## �🙏 Sponsor

Like this project? **Leave a star**! ⭐⭐⭐⭐⭐

There are several ways you can support this project:

- [Become a sponsor](https://github.com/sponsors/wgtechlabs) and get some perks! 💖
- [Buy me a coffee](https://buymeacoffee.com/wgtechlabs) if you just love what I do! ☕

## ⭐ GitHub Star Nomination

Found this project helpful? Consider nominating me **(@warengonzaga)** for the [GitHub Star program](https://stars.github.com/nominate/)! This recognition supports ongoing development of this project and [my other open-source projects](https://github.com/warengonzaga?tab=repositories). GitHub Stars are recognized for their significant contributions to the developer community - your nomination makes a difference and encourages continued innovation!

## 📃 License

Licensed under [GNU General Public License v3.0](LICENSE) - ensuring modifications remain open source.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors).

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/unthread-webhook-server)](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors)

---

💻 Made with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com)

<!-- GitAds-Verify: 46GGWGNHH1QGNNWIX2XENTW6AQHPRY1C -->
