# Development Container Configuration

This directory contains the configuration for the VS Code Development Container (dev container) that provides a fully-configured development environment for the Unthread Webhook Server project.

## 🚀 Quick Start

### Prerequisites
1. [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
2. [Visual Studio Code](https://code.visualstudio.com/) installed
3. [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) installed in VS Code

### Starting the Dev Container

1. **Open the project in VS Code**
   ```bash
   code /path/to/unthread-webhook-server
   ```

2. **Reopen in container**
   - VS Code should show a notification: "Folder contains a Dev Container configuration file"
   - Click "Reopen in Container"
   - OR use Command Palette (F1): "Dev Containers: Reopen in Container"

3. **Wait for setup to complete**
   - First-time setup takes 3-5 minutes (downloads images, installs dependencies)
   - Subsequent startups are much faster (30-60 seconds)

## 📦 What's Included

### Core Tools
- **Node.js 22.16 LTS** - Matching production environment
- **pnpm** - Primary package manager (installed globally)
- **npm** - For global package installations
- **yarn** - Legacy compatibility (pre-installed in base image)
- **TypeScript** - Via project dependencies
- **ts-node** - For running TypeScript directly
- **nodemon** - For development with auto-reload

### GitHub Tools
- **GitHub CLI (gh)** - Latest version
- **GitHub Copilot CLI** - Installed via both methods:
  - `gh extension install github/gh-copilot` (gh extension)
  - `npm install -g @github/copilot` (npm package)
- **Copilot Aliases** (configured in shell):
  - `ghcs` → `gh copilot suggest`
  - `ghce` → `gh copilot explain`

### Development Tools
- **Git** - Latest version with credential forwarding
- **curl & wget** - Network utilities
- **redis-cli** - For Redis debugging and testing
- **Zsh + Oh My Zsh** - Enhanced shell experience

### VS Code Extensions

#### GitHub & Copilot
- GitHub Copilot (`github.copilot`)
- GitHub Copilot Chat (`github.copilot-chat`)
- GitHub Pull Requests (`github.vscode-pull-request-github`)

#### TypeScript & Node.js
- ESLint (`dbaeumer.vscode-eslint`)
- npm Intellisense (`christian-kohler.npm-intellisense`)
- Path Intellisense (`christian-kohler.path-intellisense`)

#### Code Quality
- Error Lens (`usernamehw.errorlens`)
- Better Comments (`aaron-bond.better-comments`)
- Prettier (`esbenp.prettier-vscode`)
- EditorConfig (`editorconfig.editorconfig`)

#### Docker & Git
- Docker (`ms-azuretools.vscode-docker`)
- GitLens (`eamodio.gitlens`)

## 🔧 Configuration Files

### `devcontainer.json`
Main configuration file that defines:
- Base image and features
- VS Code extensions and settings
- Port forwarding
- Post-creation commands

### `docker-compose.override.yml`
Overrides for the main `docker-compose.yml`:
- Mounts workspace for live development
- Keeps container running with `sleep infinity`
- Sets appropriate environment variables

## 🌐 Port Forwarding

The dev container automatically forwards these ports:

| Port | Service | Auto-Forward Behavior |
|------|---------|----------------------|
| 3000 | Webhook Server | Notify on forward |
| 6379 | Redis | Silent (background service) |

Access forwarded ports:
- Webhook Server: `http://localhost:3000`
- Redis: `localhost:6379` (use redis-cli)

## 🛠️ Development Workflow

### Starting Development

1. **Install dependencies** (automatic on first start)
   ```bash
   pnpm install
   ```

2. **Copy environment file** (if not done)
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

### Available Commands

```bash
# Package management
pnpm install              # Install dependencies
pnpm add <package>        # Add a package

# Development
pnpm dev                  # Start with auto-reload
pnpm build                # Build for production
pnpm start                # Run production build
pnpm type-check           # TypeScript type checking
pnpm clean                # Clean build artifacts

# Redis operations
redis-cli                 # Connect to Redis
redis-cli ping            # Test Redis connection
redis-cli KEYS '*'        # List all keys
redis-cli FLUSHALL        # Clear all data (use with caution!)

# GitHub Copilot
gh copilot suggest        # Get command suggestions (or: ghcs)
gh copilot explain        # Explain commands (or: ghce)
copilot                   # Alternative copilot command
```

### Working with Docker

The dev container runs alongside Redis in a Docker Compose stack:

```bash
# View running containers
docker ps

# Check Redis logs
docker logs unthread-webhook-server-redis-webhook-1

# Execute commands in Redis container
docker exec -it unthread-webhook-server-redis-webhook-1 redis-cli

# Restart Redis (from host machine, not in dev container)
docker-compose restart redis-webhook
```

## 🔐 Environment Variables

The dev container uses the same `.env` file as local development:

```bash
# Required variables
UNTHREAD_WEBHOOK_SECRET=your_secret_here
TARGET_PLATFORM=telegram
PORT=3000
REDIS_URL=redis://redis-webhook:6379  # Use docker-compose service name
```

**Note:** The `REDIS_URL` should point to `redis-webhook` (the Docker Compose service name) instead of `localhost` when running in the dev container.

## 🐛 Troubleshooting

### Container won't start
```bash
# Rebuild the container
# In VS Code: F1 → "Dev Containers: Rebuild Container"
# OR from terminal:
docker-compose down
docker-compose up --build -d
```

### Dependencies not installing
```bash
# Manually install
pnpm install

# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Redis connection issues
```bash
# Test Redis connectivity
redis-cli -h redis-webhook ping

# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs unthread-webhook-server-redis-webhook-1
```

### GitHub Copilot not working
```bash
# Reinstall Copilot CLI
gh extension remove github/gh-copilot
gh extension install github/gh-copilot

# OR reinstall npm package
npm uninstall -g @github/copilot
npm install -g @github/copilot

# Authenticate with GitHub
gh auth login
```

### Port already in use
```bash
# Change port in .env
PORT=3001  # or any available port

# Or stop conflicting services on host
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

## 🔄 Rebuilding the Container

When you update dependencies or configuration:

1. **Rebuild without cache**
   - VS Code: F1 → "Dev Containers: Rebuild Container Without Cache"

2. **Rebuild with cache** (faster)
   - VS Code: F1 → "Dev Containers: Rebuild Container"

3. **From command line** (on host machine)
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## 📝 Customization

### Adding VS Code Extensions

Edit `devcontainer.json`:
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "existing.extension",
        "your.new-extension"
      ]
    }
  }
}
```

### Adding System Packages

Edit `devcontainer.json` to add features or use `postCreateCommand`:
```json
{
  "postCreateCommand": "sudo apt-get update && sudo apt-get install -y your-package"
}
```

### Changing Shell Configuration

Oh My Zsh is installed by default. Customize in `~/.zshrc`:
```bash
# Edit your shell config
nano ~/.zshrc
```

## 🎯 Tips & Best Practices

1. **Use pnpm for consistency** - The project is migrating from yarn to pnpm
2. **Keep .env updated** - Don't commit secrets to version control
3. **Leverage Copilot** - Use `ghcs` and `ghce` for CLI help
4. **Monitor Redis** - Use `redis-cli` to debug webhook processing
5. **Use Zsh features** - Tab completion, syntax highlighting, etc.
6. **Git credentials** - Forwarded from host, no need to reconfigure

## 🔗 Resources

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker Documentation](https://docs.docker.com/)
- [pnpm Documentation](https://pnpm.io/)
- [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli)
- [Project README](../README.md)
- [Contributing Guide](../CONTRIBUTING.md)

## 🆘 Getting Help

If you encounter issues:

1. Check this README for troubleshooting steps
2. Review the [main README](../README.md)
3. Check [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
4. Open an issue on GitHub with dev container logs

---

**Happy coding! 🚀**
