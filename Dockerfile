# -----------------------
# 1. Build stage
# -----------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
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
