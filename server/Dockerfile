FROM node:18-slim

# Install Python and dependencies for yt-dlp (and sqlite3 fallback if needed)
# Use --no-install-recommends to keep image small and fetch faster
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp with timeout and retry
RUN curl -L --retry 3 --retry-delay 5 --connect-timeout 10 \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY . .

# Create directory for persistent data and ensure permissions
RUN mkdir -p /data && chown -R node:node /data

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
