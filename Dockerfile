FROM node:lts-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code and data
COPY server/src ./src
COPY server/data ./data

# Copy client files to the correct location
# The server references client from '../../client' relative to src directory
# Since src is in /usr/src/app/src, ../../client resolves to /usr/src/client
COPY client /usr/src/client

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "src/index.js"]
