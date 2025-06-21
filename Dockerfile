# Multi-stage build for Unthread Webhook Server

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package manager files
COPY package.json yarn.lock .yarnrc ./

# Install all dependencies (including devDependencies for building)
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy source code and build configuration
COPY src/ ./src/
COPY tsconfig.json ./

# Build the TypeScript application
RUN yarn build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package manager files
COPY package.json yarn.lock .yarnrc ./

# Set environment to production
ENV NODE_ENV=production
# Install only production dependencies
RUN yarn config set strict-ssl false && \
    yarn install --frozen-lockfile --production --ignore-scripts && \
    yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy environment example (for reference)
COPY .env.example ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/app.js"]