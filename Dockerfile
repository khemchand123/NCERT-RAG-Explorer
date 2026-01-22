# Use Node.js LTS
FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user first
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create directories with proper permissions
RUN mkdir -p src/uploads src/data && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app/src/uploads && \
    chmod -R 755 /app/src/data

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3101

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3101/health || exit 1

# Start the application
CMD ["npm", "start"]
