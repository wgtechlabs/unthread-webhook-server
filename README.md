# Unthread Webhook Server 🎫⚡ [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs) [![official](https://img.shields.io/badge/official-Unthread%20Extension-FF5241.svg?logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://unthread.com)


[![node](https://img.shields.io/badge/node-%3E%3D16-green.svg?style=flat-square&labelColor=181717&logo=node.js&logoColor=white)](https://nodejs.org/) [![typescript](https://img.shields.io/badge/typescript-5.x-blue.svg?style=flat-square&labelColor=181717&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs) [![release](https://img.shields.io/github/release/wgtechlabs/unthread-webhook-server.svg?logo=github&labelColor=181717&color=green&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/stargazers) [![license](https://img.shields.io/github/license/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/blob/main/license)


A **production-ready Node.js webhook server** specifically engineered for Unthread.io integration - built with TypeScript, Express.js, and Redis for reliable webhook event processing. This server implements proper HMAC-SHA256 signature verification, handles URL verification, and features **intelligent platform source detection** with Redis-based duplicate prevention.

**Perfect for Discord bots, Telegram bots, web applications, and any service that needs to process Unthread.io webhook events reliably.** Whether you're building customer support automation, community management tools, or advanced ticketing systems, this webhook server provides the robust foundation you need with advanced event deduplication and source detection capabilities.

## ❣️ Motivation

Webhooks shouldn't be scary. Skip the hours of HMAC debugging, Redis setup, and "did I handle that edge case?" moments. Transform webhook integration from a security nightmare into confident, production-ready infrastructure - just plug in your secrets and watch events flow reliably.

## ✨ Key Features

- **Unthread.io Compliant**: Full HMAC-SHA256 signature verification and URL verification support
- **Smart Platform Detection**: Distinguishes between dashboard and target platform messages automatically
- **Duplicate Prevention**: Redis-based event deduplication with TTL expiration
- **TypeScript First**: 100% TypeScript with strict type checking and excellent IntelliSense
- **Redis Queue Integration**: Auto-queues events to `unthread-events` for consistent processing
- **Production Ready**: Battle-tested with [@wgtechlabs/log-engine](https://github.com/wgtechlabs/log-engine) logging and enterprise security
- **Zero Configuration**: Just set environment variables and start processing webhooks
- **Developer Experience**: Beautiful logs, audit trails, and simple API you'll master in minutes

## 🤔 How It Works

<!-- markdownlint-disable MD051 -->

1. **Webhook Reception**: Receives POST requests from Unthread.io at `/unthread-webhook`
2. **Signature Verification**: Validates requests using HMAC-SHA256 against your webhook secret
3. **Duplicate Detection**: Redis-based prevention checks if events were already processed
4. **Platform Source Detection**: Determines if events originate from dashboard or target platform
5. **Event Processing**: Parses and validates webhook events with audit logging
6. **Redis Queuing**: Publishes events to `unthread-events` queue for async processing
7. **Error Handling**: Logs failed requests and returns proper HTTP responses

Ready to streamline your Unthread.io integration? Get started in seconds with our [simple installation](#📦-installation)!

<!-- markdownlint-enable MD051 -->

## 📦 Installation

### Prerequisites

This project uses [Yarn](https://yarnpkg.com/) as the package manager. Please ensure you have Yarn installed:

```bash
# Install Yarn globally if you haven't already
npm install -g yarn

# Verify installation
yarn --version
```

### 1. Install Dependencies

```bash
yarn install
```

> ⚠️ **Important**: This project enforces the use of Yarn. If you try to use `npm install`, it will be blocked automatically.

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
TARGET_PLATFORM=telegram
REDIS_URL=redis://localhost:6379
UNTHREAD_WEBHOOK_SECRET=your_signing_secret_here
```

### Environment Variables

- **`NODE_ENV`**: Environment mode (default: development)
- **`PORT`**: Server port (default: 3000)
- **`TARGET_PLATFORM`**: Platform identifier for source detection (default: telegram)
- **`REDIS_URL`**: Redis connection URL (default: redis://localhost:6379)
- **`UNTHREAD_WEBHOOK_SECRET`**: Your Unthread.io signing secret (required)

> **Note**: The Redis queue name is hardcoded as `unthread-events` for consistency across all deployments.

### 3. Start Redis

Make sure Redis is running on your system:

```bash
# On Ubuntu/Debian
sudo systemctl start redis-server

# On macOS with Homebrew
brew services start redis

# Using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Run the Server

```bash
# Development mode with auto-reload
yarn dev

# Production mode
yarn start
```

The server will start on `http://localhost:3000` with the following endpoints:

- `GET /health` - Health check endpoint
- `POST /unthread-webhook` - Main webhook endpoint for Unthread events

## 🕹️ Usage

### Quick Start

Your Unthread webhook server is ready to receive events! Just configure your webhook URL in your Unthread dashboard:

```text
https://your-domain.com/unthread-webhook
```

The server automatically handles:

- **HMAC-SHA256 signature verification** - Ensures webhook authenticity using Unthread's security standards
- **URL verification events** - Responds to Unthread's verification challenges automatically
- **Platform source detection** - Intelligently determines if events originate from dashboard or target platform
- **Duplicate event prevention** - Redis-based deduplication with TTL prevents processing the same event twice
- **Event queuing to Redis** - Queues events to the `unthread-events` queue for asynchronous processing
- **Comprehensive audit logging** - Detailed logs for platform detection validation and debugging
- **Error handling and recovery** - Graceful error handling and retry mechanisms

### Platform Source Detection

The server automatically detects the source of incoming events using a sophisticated detection system:

#### Detection Methods

1. **Event Type Analysis**: `conversation_updated` events are always classified as dashboard sources (administrative actions)
2. **Primary Detection**: Analysis of `conversationUpdates` field in event metadata (100% reliable for message events)
3. **Secondary Detection**: Pattern matching on `botName` field (fallback method for edge cases)
4. **Comprehensive Logging**: Detailed audit trails for validation and debugging

#### Source Classifications

- **Dashboard Source**: Messages sent from Unthread support agents via the dashboard
- **Target Platform Source**: Messages from users on your configured platform (e.g., Telegram, Discord)
- **Unknown Source**: Events that cannot be reliably classified (rare edge cases)

### Redis Queue Message Structure

Events are queued to Redis with the following enhanced structure:

```json
{
  "platform": "unthread",
  "targetPlatform": "telegram",
  "type": "message_created",
  "sourcePlatform": "dashboard",
  "data": {
    "originalEvent": "message_created",
    "eventId": "evt_123456789",
    "eventTimestamp": 1733097600000,
    "webhookTimestamp": 1733097600000,
    "conversationId": "conv_abc123",
    "content": "Hello from support!",
    "botName": "Support Bot"
  },
  "timestamp": 1733097600000
}
```

### Supported Event Types

The server handles the following Unthread webhook events:

- **`url_verification`**: Automatic URL verification for webhook setup
- **`conversation_created`**: New conversation initialization events
- **`conversation_updated`**: Conversation status and metadata changes
- **`conversation_deleted`**: Conversation removal events
- **`message_created`**: New message events from both dashboard and target platform

All events are validated, processed, and queued to Redis with enhanced metadata for downstream processing.

### Unthread Configuration

#### 1. Get Your Signing Secret

1. Go to your [Unthread Dashboard](https://dashboard.unthread.io)
2. Navigate to Webhooks settings
3. Copy your signing secret and add it to your `.env` file

#### 2. Configure Webhook URL

In your Unthread dashboard, set your webhook URL to:

```text
https://your-domain.com/unthread-webhook
```

For local testing, you can use tools like [ngrok](https://ngrok.com/):

```bash
# Install ngrok and expose your local server
ngrok http 3000
```

## 🚀 Deployment & Production Notes

### Queue Configuration

The server uses a hardcoded Redis queue name `unthread-events` for consistency across all deployments. This design decision ensures:

- **Consistent Integration**: All instances use the same queue name regardless of environment
- **Simplified Configuration**: No need to coordinate queue names across services  
- **Reduced Configuration Errors**: Eliminates misconfiguration of queue names

### Redis Requirements

- **Minimum Redis Version**: 4.0+ (compatible with Redis v4.x client)
- **Memory Considerations**: Event tracking uses TTL-based keys with automatic expiration
- **Connection Management**: Single connection with automatic reconnection handling
- **Health Monitoring**: `/health` endpoint includes real-time Redis connectivity status
- **Queue Operations**: Uses `unthread-events` queue name for consistent integration

### Platform Source Detection Reliability

The detection system provides high reliability through multiple detection methods:

- **Event Type Detection**: 100% reliable for `conversation_updated` events (always dashboard)
- **Metadata Analysis**: 100% reliable using `conversationUpdates` field presence
- **BotName Pattern Matching**: High reliability fallback using naming conventions
- **Comprehensive Audit Logging**: Full detection trails for validation and debugging

### Scaling Considerations

- **Single Instance per Platform**: Designed for one webhook server per platform deployment
- **Memory Efficient**: 3-day TTL on processed events balances memory and reliability
- **Simple Architecture**: No complex distributed coordination required

## 🔍 Monitoring & Troubleshooting

### Health Check Endpoint

The `/health` endpoint provides comprehensive status information:

```bash
curl http://localhost:3000/health
```

Response examples:

```json
// Healthy state
{
  "status": "OK",
  "redis": "connected",
  "timestamp": "2025-06-01T12:00:00.000Z"
}

// Unhealthy state  
{
  "status": "ERROR",
  "redis": "disconnected",
  "timestamp": "2025-06-01T12:00:00.000Z"
}
```

### Common Issues

#### Redis Connection Problems

- **Symptom**: Health endpoint returns `redis: "disconnected"`
- **Solution**: Verify Redis is running and `REDIS_URL` is correct
- **Debug**: Check server logs for detailed connection errors

#### Duplicate Events

- **Symptom**: Same event processed multiple times
- **Cause**: Redis connection issues during processing
- **Solution**: Monitor Redis connectivity and check server logs

#### Platform Detection Issues

- **Symptom**: Events classified as "unknown" source
- **Debug**: Check logs for detection summary with field analysis
- **Solution**: Verify event structure matches expected Unthread format

### Log Analysis

The server provides structured logging with key information:

```text
[INFO] Platform detection completed - Detection: telegram | Event: evt_123 | Conversation: conv_abc | ConversationUpdates: missing | BotName: @MyBot | External: false
```

Key log markers:

- **Detection Summary**: Platform source classification details
- **Event Processing**: Successful event handling confirmation  
- **Redis Operations**: Queue publishing and health status

## 🔧 Development

### Building the Project

```bash
# Clean previous builds
yarn clean

# Type checking only (no build)
yarn type-check

# Build for production
yarn build

# Start production build
yarn start
```

### Development Workflow

1. **Install dependencies**: `yarn install`
2. **Set up environment**: Copy `.env.example` to `.env` and configure
3. **Start Redis**: Ensure Redis is running locally or via Docker
4. **Run in development**: `yarn dev` for hot-reload development
5. **Test webhooks**: Use tools like ngrok for local testing with Unthread

### Project Standards

- **Package Manager**: Yarn enforced via `preinstall` script
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Code Style**: Consistent formatting and linting practices
- **Error Handling**: Comprehensive error handling with detailed logging
- **Documentation**: Inline code documentation and comprehensive README

## 💬 Community Discussions

Join our community discussions to get help, share ideas, and connect with other users:

- 📣 **[Announcements](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/announcements)**: Official updates from the maintainer
- 📸 **[Showcase](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/showcase)**: Show and tell your implementation
- 💖 **[Wall of Love](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/wall-of-love)**: Share your experience with the server
- 🛟 **[Help & Support](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/help-support)**: Get assistance from the community
- 🧠 **[Ideas](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/ideas)**: Suggest new features and improvements

## 🛟 Help & Support

### Getting Help

Need assistance with the server? Here's how to get help:

<!-- markdownlint-disable MD051 -->

- **Community Support**: Check the [Help & Support](https://github.com/wgtechlabs/unthread-webhook-server/discussions/categories/help-support) category in our GitHub Discussions for answers to common questions.
- **Ask a Question**: Create a [new discussion](https://github.com/wgtechlabs/unthread-webhook-server/discussions/new?category=help-support) if you can't find answers to your specific issue.
- **Documentation**: Review the [usage instructions](#🕹️-usage) in this README for common examples and configurations.
- **Known Issues**: Browse [existing issues](https://github.com/wgtechlabs/unthread-webhook-server/issues) to see if your problem has already been reported.

<!-- markdownlint-enable MD051 -->

### Reporting Issues

Please report any issues, bugs, or improvement suggestions by [creating a new issue](https://github.com/wgtechlabs/unthread-webhook-server/issues/new/choose). Before submitting, please check if a similar issue already exists to avoid duplicates.

### Security Vulnerabilities

For security vulnerabilities, please do not report them publicly. Please create a private security advisory through GitHub's security advisory feature or contact the maintainers directly.

Your contributions to improving this project are greatly appreciated! 🙏✨

## 🎯 Contributing

Contributions are welcome, create a pull request to this repo and I will review your code. Please consider to submit your pull request to the `dev` branch. Thank you!

When contributing, please ensure your code follows the existing TypeScript patterns and includes appropriate error handling.

## 🙏 Sponsor

Like this project? **Leave a star**! ⭐⭐⭐⭐⭐

There are several ways you can support this project:

- [Become a sponsor](https://github.com/sponsors/wgtechlabs) and get some perks! 💖
- [Buy me a coffee](https://buymeacoffee.com/wgtechlabs) if you just love what I do! ☕

## ⭐ GitHub Star Nomination

Found this project helpful? Consider nominating me **(@warengonzaga)** for the [GitHub Star program](https://stars.github.com/nominate/)! This recognition supports ongoing development of this project and [my other open-source projects](https://github.com/warengonzaga?tab=repositories). GitHub Stars are recognized for their significant contributions to the developer community - your nomination makes a difference and encourages continued innovation!

## 📋 Code of Conduct

I'm committed to providing a welcoming and inclusive environment for all contributors and users. Please be respectful and constructive in all interactions.

## 📃 License

This project is licensed under the [GNU General Public License v3.0](https://opensource.org/licenses/GPL-3.0). This license ensures that all modifications to the code remain open source and freely available to the community. See the [LICENSE](LICENSE) file for the full license text.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors).

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/unthread-webhook-server)](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors)

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏
