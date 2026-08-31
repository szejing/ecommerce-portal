# ==============================
# Build stage
# ==============================
# Use buildx/compose target platform so native packages match the final image.
# For production, docker-compose.yml targets amd64 for Digital Ocean.
# Use bun:latest or bun:1 with a real Node install for the Nuxt/Vite build.
# Node 22+ is required: Tailwind 4.3 / lightningcss 1.32 call Set.prototype.difference.
FROM oven/bun:1 AS builder

WORKDIR /app

# Install git and npm for git-based dependencies and optional package installation
# Note: bun:1 should include Node.js 18+, but we'll verify and use Node.js explicitly for vite
RUN apt-get update && apt-get install -y git npm curl && \
    # Check if Node.js is available and version
    (node --version 2>/dev/null || echo "Node.js not found via node command") && \
    # Install Node.js 22.x (Set.prototype.difference; Vite 7 also needs Node 20+ crypto.hash)
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    node --version && \
    npm --version && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files first (better caching)
COPY package.json bun.lock ./

# Install ALL deps (dev + prod) with frozen lockfile
# Skip postinstall scripts to avoid esbuild version check issues
# We'll run necessary postinstall scripts manually after copying files
RUN bun install --frozen-lockfile --ignore-scripts --network-concurrency 8

# Install optional native dependencies that are skipped with --ignore-scripts
# Rollup native bindings for better performance
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      npm install --no-save --legacy-peer-deps @rollup/rollup-linux-arm64-gnu 2>/dev/null || true; \
    else \
      npm install --no-save --legacy-peer-deps @rollup/rollup-linux-x64-gnu 2>/dev/null || true; \
    fi

# Ensure vite is available (required by Nuxt 4 and @nuxt/devtools)
# Vite is a transitive dependency but may not be installed with --ignore-scripts
# Install vite directly - in Docker builds, modifying package.json is fine
RUN if [ ! -d "node_modules/vite" ] || [ ! -f "node_modules/vite/package.json" ]; then \
      echo "Installing vite (required by Nuxt 4)..." && \
      if bun add vite@^5.0.0 --dev 2>&1; then \
        echo "✓ Vite@^5.0.0 installed successfully"; \
      else \
        echo "Failed to install vite@^5.0.0, trying latest..." && \
        bun add vite --dev 2>&1 && \
        echo "✓ Vite (latest) installed successfully"; \
      fi; \
    else \
      echo "✓ Vite is already installed"; \
    fi && \
    # Verify vite is accessible
    if [ ! -d "node_modules/vite" ]; then \
      echo "ERROR: Vite installation failed!" && exit 1; \
    else \
      VITE_VERSION=$(node -p "require('vite/package.json').version" 2>/dev/null || echo "installed") && \
      echo "✓ Vite verified: version $VITE_VERSION"; \
    fi

# Run lightningcss postinstall script to extract native bindings
# Lightningcss bundles native bindings in the package and extracts them via postinstall
RUN if [ -d "node_modules/lightningcss" ]; then \
      cd node_modules/lightningcss && \
      if [ -f "package.json" ]; then \
        # Try to run the postinstall script directly
        npm run postinstall 2>&1 || \
        node -e "try{const pkg=require('./package.json');if(pkg.scripts&&pkg.scripts.postinstall){require('child_process').execSync(pkg.scripts.postinstall,{stdio:'inherit',cwd:process.cwd()})}}catch(e){}" 2>&1 || true; \
      fi && \
      # If postinstall didn't work, reinstall lightningcss with scripts enabled
      LIGHTNINGCSS_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "") && \
      if [ -n "$LIGHTNINGCSS_VERSION" ] && [ ! -f "lightningcss.linux-arm64-gnu.node" ] && [ ! -f "lightningcss.linux-x64-gnu.node" ]; then \
        echo "Native bindings not found, reinstalling lightningcss@$LIGHTNINGCSS_VERSION..." && \
        cd ../.. && \
        npm install --no-save --legacy-peer-deps --ignore-scripts=false lightningcss@$LIGHTNINGCSS_VERSION 2>&1 | tail -5 || true; \
      fi && \
      cd ../..; \
    fi

# Copy full project
COPY . .

# Final check: Ensure vite is available before running nuxt prepare
RUN if [ ! -d "node_modules/vite" ] || [ ! -f "node_modules/vite/package.json" ]; then \
      echo "ERROR: Vite is missing before nuxt prepare!" && \
      echo "Attempting emergency vite installation..." && \
      bun add vite@^5.0.0 --dev || bun add vite --dev || \
      (echo "All vite installation attempts failed!" && exit 1); \
    else \
      echo "✓ Vite confirmed available before nuxt prepare"; \
    fi

# Run nuxt prepare (postinstall script) now that all files are available
# This ensures Nuxt config is properly set up
RUN bun run nuxt prepare

# Build Nuxt app (production). Nitro bundling is memory-heavy; keep heap within Docker limits.
# Override at build time: docker build --build-arg NODE_MEMORY_MB=6144 ...
ARG NODE_MEMORY_MB=5120
ENV NODE_ENV=production
ENV NUXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY_MB}"
# Use Node (not bun runtime) for nuxt build — lower peak memory than `bun --bun nuxt build`
RUN node --version && \
    node node_modules/nuxt/bin/nuxt.mjs build --dotenv .env.prod


# ==============================
# Production stage
# ==============================
# Always use target platform for production (amd64 for Digital Ocean)
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:22-alpine AS production

WORKDIR /app

# Copy only built output (server + public assets)
COPY --from=builder /app/.output/ ./.output/

# Copy package.json (useful for debugging/env checks)
COPY --from=builder /app/package.json ./

# Copy environment file if it exists
COPY .env.prod* ./

# Env vars
ENV NODE_ENV=production
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001

# Set permissions
RUN chown -R nuxt:nodejs /app
USER nuxt

# Expose Nuxt app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

# Start Nuxt SSR server
CMD ["node", ".output/server/index.mjs"]
