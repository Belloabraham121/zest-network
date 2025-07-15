# Use Node.js 18 (LTS) as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package.json and install dependencies
COPY backend/package.json .
RUN npm install

# Copy backend source code
COPY backend/ .

# Build TypeScript
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]