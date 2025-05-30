# Unthread Webhook Server 🔗⚡ [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![license](https://img.shields.io/github/license/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/blob/main/LICENSE)
[![release](https://img.shields.io/github/release/wgtechlabs/unthread-webhook-server.svg?logo=github&labelColor=181717&color=green&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/releases)
[![star](https://img.shields.io/github/stars/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/stargazers)
[![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs)

A **production-ready Node.js webhook server** specifically engineered for Unthread.io integration - built with TypeScript, Express.js, and Redis for reliable webhook event processing. This server implements proper HMAC-SHA256 signature verification, handles URL verification, and queues events for asynchronous processing with enterprise-grade security and error handling.

**Perfect for Discord bots, Telegram bots, web applications, and any service that needs to process Unthread.io webhook events reliably.** Whether you're building customer support automation, community management tools, or advanced ticketing systems, this webhook server provides the robust foundation you need.

## ❣️ Motivation

Picture this: You're building an amazing Discord bot or customer support system that integrates with Unthread.io, but you're spending more time wrestling with webhook verification, event processing, and Redis queue management than actually building features. Sound familiar? I've been there too.

I created Unthread Webhook Server because every developer deserves a **reliable, secure, and battle-tested foundation** for processing Unthread.io webhooks. No more manual HMAC verification, no more fragile event handling, no more reinventing the wheel. Just clean, TypeScript-powered webhook processing that scales with your application and keeps your users happy.

## ✨ Key Features

- **Unthread.io Compliant**: Full HMAC-SHA256 signature verification and URL verification support - meets all Unthread security requirements out of the box.
- **TypeScript First**: 100% TypeScript codebase with strict type checking, comprehensive type definitions, and excellent IntelliSense support for confident development.
- **Redis Queue Integration**: Automatic event queuing to Redis with configurable queue names based on your target platform - perfect for microservices architecture.
- **Enterprise Security**: Robust signature verification, request validation, environment variable enforcement, and comprehensive error handling.
- **Zero Configuration**: Intelligent auto-configuration with sensible defaults - just set your environment variables and start processing webhooks.
- **Production Ready**: Battle-tested error handling, logging with [@wgtechlabs/log-engine](https://github.com/wgtechlabs/log-engine), and designed for high-throughput production environments.
- **Developer Experience**: Beautiful colored logs, comprehensive documentation, and simple API that you can master in minutes.
- **Yarn Enforced**: Consistent dependency management with automatic npm blocking - ensures reliable builds across all environments.

## 🤔 How It Works

<!-- markdownlint-disable MD051 -->

1. **Webhook Reception**: The server receives POST requests from Unthread.io at the `/unthread-webhook` endpoint with proper CORS and security headers
2. **Signature Verification**: Each incoming request is validated using HMAC-SHA256 signature verification against your Unthread webhook secret
3. **Event Processing**: Valid webhook events are parsed, validated, and processed according to Unthread's event structure requirements
4. **Redis Queuing**: Events are automatically published to a Redis queue (`${TARGET_PLATFORM}-webhook-queue`) for asynchronous processing by your application
5. **Error Handling**: Comprehensive error handling ensures failed requests are logged and properly responded to, maintaining webhook reliability

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
TARGET_PLATFORM=discord
```

> **Note**: The Redis queue name is automatically generated as `${TARGET_PLATFORM}-webhook-queue` for consistency.

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

- **HMAC-SHA256 signature verification** - Ensures webhook authenticity
- **URL verification events** - Responds to Unthread's verification challenges
- **Event queuing to Redis** - Queues events for asynchronous processing
- **Error handling and logging** - Comprehensive error tracking and logging

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
- **Implementation Guide**: Check our [Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md) for detailed technical information.
- **Known Issues**: Browse [existing issues](https://github.com/wgtechlabs/unthread-webhook-server/issues) to see if your problem has already been reported.

<!-- markdownlint-enable MD051 -->

### Reporting Issues

Please report any issues, bugs, or improvement suggestions by [creating a new issue](https://github.com/wgtechlabs/unthread-webhook-server/issues/new/choose). Before submitting, please check if a similar issue already exists to avoid duplicates.

### Security Vulnerabilities

For security vulnerabilities, please do not report them publicly. Follow the guidelines in our [security policy](./security.md) to responsibly disclose security issues.

Your contributions to improving this project are greatly appreciated! 🙏✨

## 🎯 Contributing

Contributions are welcome, create a pull request to this repo and I will review your code. Please consider to submit your pull request to the `dev` branch. Thank you!

Read the project's [contributing guide](./CONTRIBUTING.md) for more info, including testing guidelines and requirements.

## 🙏 Sponsor

Like this project? **Leave a star**! ⭐⭐⭐⭐⭐

There are several ways you can support this project:

- [Become a sponsor](https://github.com/sponsors/wgtechlabs) and get some perks! 💖
- [Buy me a coffee](https://buymeacoffee.com/wgtechlabs) if you just love what I do! ☕

## ⭐ GitHub Star Nomination

Found this project helpful? Consider nominating me **(@warengonzaga)** for the [GitHub Star program](https://stars.github.com/nominate/)! This recognition supports ongoing development of this project and [my other open-source projects](https://github.com/warengonzaga?tab=repositories). GitHub Stars are recognized for their significant contributions to the developer community - your nomination makes a difference and encourages continued innovation!

## 📋 Code of Conduct

I'm committed to providing a welcoming and inclusive environment for all contributors and users. Please review the project's [Code of Conduct](./code_of_conduct.md) to understand the community standards and expectations for participation.

## 📃 License

This project is licensed under the [GNU Affero General Public License v3.0](https://opensource.org/licenses/AGPL-3.0). This license requires that all modifications to the code must be shared under the same license, especially when the software is used over a network. See the [LICENSE](LICENSE) file for the full license text.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors).

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/unthread-webhook-server)](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors)

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏
