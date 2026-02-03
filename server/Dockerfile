# Build Stage
FROM node:18-slim AS builder

# Install build dependencies (python3, make, g++, etc. for sqlite3 and others)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies if needed, or just prod)
# We use npm ci for reliable builds
RUN npm ci

# Runner Stage
FROM node:18-slim

# Install runtime dependencies (python3 for yt-dlp, curl)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L --retry 3 --retry-delay 5 --connect-timeout 10 \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy server code
COPY . .

# Create directory for persistent data
RUN mkdir -p /data && chown -R node:node /data

EXPOSE 3001

CMD ["node", "server.js"]
