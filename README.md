# Unthread Webhook Server 🔗⚡ [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![license](https://img.shields.io/github/license/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/blob/main/LICENSE) [![release](https://img.shields.io/github/release/wgtechlabs/unthread-webhook-server.svg?logo=github&labelColor=181717&color=green&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/stargazers) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs)

A **production-ready Node.js webhook server** specifically engineered for Unthread.io integration - built with TypeScript, Express.js, and Redis for reliable webhook event processing. This server implements proper HMAC-SHA256 signature verification, handles URL verification, and features **intelligent platform source detection** with Redis-based duplicate prevention.

**Perfect for Discord bots, Telegram bots, web applications, and any service that needs to process Unthread.io webhook events reliably.** Whether you're building customer support automation, community management tools, or advanced ticketing systems, this webhook server provides the robust foundation you need with advanced event deduplication and source detection capabilities.

## ❣️ Motivation

Ever stared at webhook documentation wondering if you're implementing signature verification correctly? Or worried your event processing might miss critical messages? I built this because webhooks shouldn't be scary.

Transform webhook integration from a security nightmare into confident, production-ready infrastructure. Skip the hours of HMAC debugging, Redis queue setup, and "did I handle that edge case?" moments. Just plug in your secrets and watch events flow reliably to your application - because great integrations should feel effortless, not exhausting.

## 🆕 Latest Updates

### June 2025 - Major Enhancement Release

- ✅ **Intelligent Platform Source Detection**: Real-time field-based analysis to distinguish dashboard vs target platform events
- ✅ **Advanced Duplicate Prevention**: Redis-based TTL tracking prevents duplicate event processing
- ✅ **Enhanced Redis Integration**: Improved connection handling, health monitoring, and graceful error recovery
- ✅ **Comprehensive Audit Logging**: Detailed detection summaries and debugging information for platform classification
- ✅ **Simplified Configuration**: Streamlined environment setup with hardcoded queue names for consistency
- ✅ **Production Hardening**: Improved error handling and robust event processing

## ✨ Key Features

- **Unthread.io Compliant**: Full HMAC-SHA256 signature verification and URL verification support - meets all Unthread security requirements out of the box.
- **Intelligent Platform Source Detection**: Advanced field-based detection to distinguish between Unthread dashboard messages and target platform messages using real-time analysis.
- **Duplicate Prevention System**: Redis-based event deduplication with TTL expiration to prevent duplicate processing.
- **TypeScript First**: 100% TypeScript codebase with strict type checking, comprehensive type definitions, and excellent IntelliSense support for confident development.
- **Redis Queue Integration**: Automatic event queuing to Redis with the hardcoded `unthread-events` queue name for consistent integration across deployments.
- **Enterprise Security**: Robust signature verification, request validation, and comprehensive error handling.
- **Production Ready**: Battle-tested error handling, logging with [@wgtechlabs/log-engine](https://github.com/wgtechlabs/log-engine), and designed for high-throughput production environments.
- **Zero Configuration**: Intelligent auto-configuration with sensible defaults - just set your environment variables and start processing webhooks.
- **Developer Experience**: Beautiful colored logs, comprehensive audit trails for platform detection, and simple API that you can master in minutes.
- **Yarn Enforced**: Consistent dependency management with automatic npm blocking - ensures reliable builds across all environments.

## 🤔 How It Works

<!-- markdownlint-disable MD051 -->

1. **Webhook Reception**: The server receives POST requests from Unthread.io at the `/unthread-webhook` endpoint with proper CORS and security headers
2. **Signature Verification**: Each incoming request is validated using HMAC-SHA256 signature verification against your Unthread webhook secret
3. **Duplicate Detection**: Advanced Redis-based duplicate prevention system checks if events have already been processed using TTL-based tracking
4. **Platform Source Detection**: Intelligent field-based analysis automatically determines if events originate from the Unthread dashboard or your target platform
5. **Event Processing**: Valid webhook events are parsed, validated, and processed with comprehensive audit logging for detection validation
6. **Redis Queuing**: Events are automatically published to the `unthread-events` Redis queue for asynchronous processing by your application
7. **Error Handling**: Comprehensive error handling ensures failed requests are logged and properly responded to

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
PORT=3000
UNTHREAD_WEBHOOK_SECRET=your_actual_signing_secret_here
REDIS_URL=redis://localhost:6379
TARGET_PLATFORM=telegram
```

### Environment Variables

- **`PORT`**: Server port (default: 3000)
- **`UNTHREAD_WEBHOOK_SECRET`**: Your Unthread.io signing secret (required)
- **`REDIS_URL`**: Redis connection URL (default: redis://localhost:6379)
- **`TARGET_PLATFORM`**: Platform identifier for source detection (default: telegram)
- **`NODE_ENV`**: Environment mode (default: development)

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
- `POST /unthread-webhook` - Main webhook endpoint for Unthread

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

The server automatically detects the source of incoming events:

- **Dashboard Source**: Messages sent from Unthread support agents via the dashboard
- **Target Platform Source**: Messages from users on your configured platform (e.g., Telegram, Discord)
- **Unknown Source**: Events that cannot be reliably classified

Detection is performed using:

1. **Primary Detection**: Analysis of `conversationUpdates` field presence (100% reliable)
2. **Secondary Detection**: Pattern matching on `botName` field (fallback method)
3. **Audit Logging**: Comprehensive detection logs for validation and debugging

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

### Advanced Features

#### Duplicate Prevention

- **TTL-based tracking**: Events are tracked in Redis with 3-day expiration
- **Simple deduplication**: Prevents processing the same event multiple times

#### Health Monitoring

- **Redis connectivity**: Health endpoint checks Redis connection status
- **Comprehensive logging**: Structured logs with detection summaries
- **Error tracking**: Detailed error logging with context

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

- **Minimum Redis Version**: 4.0+ (uses Redis v4.x client)
- **Memory Considerations**: Event tracking uses TTL-based keys (3-day expiration)
- **Connection Pooling**: Single connection with automatic reconnection handling
- **Health Monitoring**: `/health` endpoint includes Redis connectivity status

### Platform Source Detection Reliability

The detection system is designed for high reliability:

- **Primary Method**: 100% reliable using `conversationUpdates` field analysis
- **Fallback Method**: Pattern matching for edge cases
- **Logging**: Comprehensive audit trails for validation and debugging

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

This project is licensed under the [GNU Affero General Public License v3.0](https://opensource.org/licenses/AGPL-3.0). This license requires that all modifications to the code must be shared under the same license, especially when the software is used over a network. See the [LICENSE](LICENSE) file for the full license text.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors).

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/unthread-webhook-server)](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors)

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏
