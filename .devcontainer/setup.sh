#!/bin/bash
# =============================================================================
# Dev Container Post-Create Setup Script
# =============================================================================
# This script runs after the dev container is created to set up the development
# environment with all necessary tools and configurations.
# =============================================================================

set -e

echo "🚀 Starting dev container setup..."

# =============================================================================
# 1. Install pnpm (Primary Package Manager)
# =============================================================================
echo "📦 Installing pnpm..."
npm install -g pnpm

# =============================================================================
# 2. Install Project Dependencies
# =============================================================================
echo "📚 Installing project dependencies with pnpm..."
pnpm install

# =============================================================================
# 3. Install GitHub Copilot CLI (Method 1: gh extension)
# =============================================================================
echo "🤖 Installing GitHub Copilot CLI (gh extension)..."
gh extension install github/gh-copilot 2>/dev/null || echo "  ℹ️  GitHub Copilot extension already installed or failed to install"

# =============================================================================
# 4. Install GitHub Copilot CLI (Method 2: npm package)
# =============================================================================
echo "🤖 Installing GitHub Copilot CLI (npm package)..."
npm install -g @github/copilot 2>/dev/null || echo "  ℹ️  GitHub Copilot npm package already installed or failed to install"

# =============================================================================
# 5. Set Up Shell Aliases for Copilot CLI
# =============================================================================
echo "⚡ Setting up shell aliases for GitHub Copilot CLI..."

# Add aliases to .zshrc if they don't exist
if ! grep -qF 'alias ghcs="gh copilot suggest"' ~/.zshrc 2>/dev/null; then
    echo 'alias ghcs="gh copilot suggest"' >> ~/.zshrc
    echo "  ✓ Added ghcs alias"
fi

if ! grep -qF 'alias ghce="gh copilot explain"' ~/.zshrc 2>/dev/null; then
    echo 'alias ghce="gh copilot explain"' >> ~/.zshrc
    echo "  ✓ Added ghce alias"
fi

# =============================================================================
# 6. Install Redis CLI Tools
# =============================================================================
echo "🔧 Checking for Redis CLI..."
if ! command -v redis-cli &> /dev/null; then
    echo "  Installing Redis CLI tools..."
    sudo apt-get update -qq
    sudo apt-get install -y redis-tools
    echo "  ✓ Redis CLI installed"
else
    echo "  ✓ Redis CLI already available"
fi

# =============================================================================
# 7. Verify Installation
# =============================================================================
echo ""
echo "🔍 Verifying installations..."

# Check Node.js
NODE_VERSION=$(node --version)
echo "  ✓ Node.js: $NODE_VERSION"

# Check pnpm
PNPM_VERSION=$(pnpm --version)
echo "  ✓ pnpm: $PNPM_VERSION"

# Check GitHub CLI
GH_VERSION=$(gh --version | head -1)
echo "  ✓ GitHub CLI: $GH_VERSION"

# Check Redis CLI
REDIS_CLI_VERSION=$(redis-cli --version)
echo "  ✓ Redis CLI: $REDIS_CLI_VERSION"

# Check if Copilot extension is installed
if gh extension list | grep -q copilot; then
    echo "  ✓ GitHub Copilot CLI extension: installed"
else
    echo "  ⚠️  GitHub Copilot CLI extension: not installed (may require authentication)"
fi

# =============================================================================
# 8. Environment Setup
# =============================================================================
echo ""
echo "🌍 Checking environment configuration..."

if [ ! -f .env ]; then
    echo "  ℹ️  Creating .env from .env.example..."
    cp .env.example .env
    echo "  ⚠️  Please update .env with your configuration values"
else
    echo "  ✓ .env file already exists"
fi

# =============================================================================
# Setup Complete
# =============================================================================
echo ""
echo "✅ Dev container setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update .env with your configuration values"
echo "  2. Authenticate with GitHub: gh auth login"
echo "  3. Start development: pnpm dev"
echo ""
echo "💡 Helpful aliases:"
echo "  ghcs - Get command suggestions from GitHub Copilot"
echo "  ghce - Explain commands with GitHub Copilot"
echo ""
echo "🎉 Happy coding!"
