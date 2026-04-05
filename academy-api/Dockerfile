# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine AS runtime

# Create non-root user without shell
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S app -G appgroup -H -s /bin/false

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production

# Copy Prisma schema (needed at runtime for some adapters)
COPY prisma/ ./prisma/

# Copy built files from builder stage (includes generated Prisma client)
COPY --from=builder /app/dist ./dist

# Change ownership of app directory
RUN chown -R app:appgroup /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["node", "dist/src/index.js"]
