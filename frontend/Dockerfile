# Use Node.js
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Install a simple server to serve the static files
RUN npm install -g serve

# Expose port
EXPOSE 8080

# Start the server with SPA support (-s)
CMD ["serve", "-s", "dist", "-l", "8080"]
