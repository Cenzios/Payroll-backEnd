# -----------------------
# 1. Build stage
# -----------------------
FROM node:18-alpine AS builder

# Install build dependencies and OpenSSL 1.1
RUN apk add --no-cache bash curl openssl1.1-compat

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# -----------------------
# 2. Runtime stage
# -----------------------
FROM node:18-alpine

# Install runtime OpenSSL 1.1
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JS
COPY --from=builder /app/dist ./dist

# Copy Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Expose backend port
EXPOSE 6090

# Run the server
CMD ["node", "dist/server.js"]
