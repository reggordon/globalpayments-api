# Use Node.js 20 LTS
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create data directory for transactions
RUN mkdir -p data

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 3001

# Start the application
CMD [ "node", "server.js" ]
