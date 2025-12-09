FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY . .

# Create directory for persistent data (if needed by volume mount)
RUN mkdir -p /data

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
