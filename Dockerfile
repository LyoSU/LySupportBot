FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source and build
COPY . .
RUN npm run build

# Start the application
CMD ["node", "dist/index.js"]
