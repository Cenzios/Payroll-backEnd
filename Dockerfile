# -----------------------
# 1. Build stage
# -----------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code, including tsconfig.json
COPY . .

# Build TypeScript (will now respect your tsconfig.json)
RUN npm run build

# -----------------------
# 2. Runtime stage
# -----------------------
FROM node:18-alpine

WORKDIR /app

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JS
COPY --from=builder /app/dist ./dist

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Expose backend port
EXPOSE 6090

# Run the server
CMD ["node", "dist/server.js"]
