# Unthread Webhook Server 🎫⚡ [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![release workflow](https://img.shields.io/github/actions/workflow/status/wgtechlabs/unthread-webhook-server/release.yml?branch=main&style=flat-square&logo=github&labelColor=181717&label=release)](https://github.com/wgtechlabs/unthread-webhook-server/actions/workflows/release.yml) [![build workflow](https://img.shields.io/github/actions/workflow/status/wgtechlabs/unthread-webhook-server/build.yml?branch=dev&style=flat-square&logo=github&labelColor=181717&label=build)](https://github.com/wgtechlabs/unthread-webhook-server/actions/workflows/build.yml) [![node](https://img.shields.io/badge/node-%3E%3D20-green.svg?style=flat-square&labelColor=181717&logo=node.js&logoColor=white)](https://nodejs.org/) [![typescript](https://img.shields.io/badge/typescript-5.x-blue.svg?style=flat-square&labelColor=181717&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs) [![version](https://img.shields.io/github/release/wgtechlabs/unthread-webhook-server.svg?logo=github&labelColor=181717&color=green&style=flat-square&label=version)](https://github.com/wgtechlabs/unthread-webhook-server/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/stargazers) [![license](https://img.shields.io/github/license/wgtechlabs/unthread-webhook-server.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/unthread-webhook-server/blob/main/license)

A reliable, production-ready Node.js server for processing Unthread.io webhooks with signature verification and smart platform handling. Built with TypeScript, Express.js, and Redis, this webhook server provides secure HMAC-SHA256 signature validation, intelligent event deduplication, and seamless integration with multiple platforms including Discord and Telegram. The server automatically detects event sources, processes various webhook events (conversations, messages, status updates), and efficiently queues them through Redis for downstream consumption by your bot applications, ensuring reliable and scalable webhook processing for your Unthread.io integrations.

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

**Requirements**: Node.js 20+, Redis, Yarn

```bash
# 1. Install dependencies
yarn install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Unthread webhook secret

# 3. Start Redis (choose one)
redis-server                          # Local installation
brew services start redis             # macOS
sudo systemctl start redis-server     # Linux
docker run -d -p 6379:6379 redis:alpine  # Docker

# 4. Run the server
yarn dev        # Development with auto-reload
yarn start      # Production mode
```

Server runs on `http://localhost:3000` with endpoints:
- `GET /health` - Health check
- `POST /unthread-webhook` - Webhook endpoint

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
| `TARGET_PLATFORM` | Platform identifier (e.g., telegram, discord) | `telegram` | ❌ |
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
5. **Queue Publishing**: Sends processed events to Redis `unthread-events` queue

## 📊 Event Processing

### Supported Events
- `url_verification` - Automatic URL verification
- `conversation_created` - New conversations
- `conversation_updated` - Status changes  
- `conversation_deleted` - Conversation removal
- `message_created` - New messages

### Redis Queue Format
Events are queued with this structure:

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
    "eventTimestamp": 1733097600000
  },
  "timestamp": 1733097600000
}
```

## 💻 Development

### Build Commands

```bash
yarn clean      # Clean previous builds
yarn build      # Build for production
yarn type-check # TypeScript type checking only
yarn dev        # Development with hot-reload
yarn start      # Run production build
```

### Project Structure

```
src/
├── app.ts              # Main application entry
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Auth & validation
├── services/           # Business logic
├── types/              # TypeScript types
└── utils/              # Helper functions
```

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

## 📃 License

Licensed under [GNU General Public License v3.0](LICENSE) - ensuring modifications remain open source.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors).

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/unthread-webhook-server)](https://github.com/wgtechlabs/unthread-webhook-server/graphs/contributors)

---

💻 Made with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com)

<!-- GitAds-Verify: 46GGWGNHH1QGNNWIX2XENTW6AQHPRY1C -->
