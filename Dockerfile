# -----------------------
# 1. Build stage
# -----------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build TypeScript
RUN npm run build   # assumes "build": "tsc" in package.json

# -----------------------
# 2. Runtime stage
# -----------------------
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy any other needed files (optional)
COPY --from=builder /app/prisma ./prisma

# Expose the port
EXPOSE 6090

# Run the server
CMD ["node", "dist/server.js"]
