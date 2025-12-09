COPY . .

# Create directory for persistent data and ensure permissions
RUN mkdir -p /data && chown -R node:node /data

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
