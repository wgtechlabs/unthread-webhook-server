# =============================================================================
# UNTHREAD WEBHOOK SERVER - DOCKERFILE
# =============================================================================
# Multi-stage Docker build for the Unthread Webhook Server
# 
# Build stages:
# 1. base    - Base Alpine image with Node.js and security updates
# 2. deps    - Install production dependencies only
# 3. build   - Install dev dependencies and build the application
# 4. final   - Create minimal runtime image with built app
#
# Usage:
#   docker build -t unthread-webhook-server .
#   docker run --env-file .env unthread-webhook-server
#
# =============================================================================

# syntax=docker/dockerfile:1

# Use Node.js 22.16 LTS Alpine with security patches
ARG NODE_VERSION=22.16-alpine3.21

# Get Railway service ID for cache mounts
ARG RAILWAY_SERVICE_ID

# =============================================================================
# STAGE 1: Base Image
# =============================================================================
# Alpine Linux 3.21 base for minimal image size with latest security updates
FROM node:${NODE_VERSION} AS base

# Install security updates for Alpine packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Enable and install pnpm via corepack
# Note: Version must match packageManager field in package.json (currently 9.15.4)
RUN corepack enable && \
    corepack prepare pnpm@9.15.4 --activate

# Set working directory for all subsequent stages
WORKDIR /usr/src/app

# =============================================================================
# STAGE 2: Production Dependencies
# =============================================================================
# Install only production dependencies for runtime
FROM base AS deps

# Use bind mounts and cache for faster builds
# Downloads dependencies without copying package files into the layer
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# =============================================================================
# STAGE 3: Build Application  
# =============================================================================
# Install dev dependencies and build the TypeScript application
FROM deps AS build

# Install all dependencies (including devDependencies for building)
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code and build the application
COPY . .
RUN pnpm run build

# =============================================================================
# STAGE 4: Final Runtime Image
# =============================================================================
# Minimal production image with only necessary files
FROM base AS final

# Set production environment with security options
ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=512"

# Create a dedicated user for the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package.json for package manager commands
COPY --chown=nodejs:nodejs package.json .

# Copy production dependencies and built application
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /usr/src/app/dist ./dist

# Copy environment example (for reference)
COPY --chown=nodejs:nodejs .env.example ./

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init for proper signal handling and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]