# -----------------------
# 1. Base build stage
# -----------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# -----------------------
# 2. Runtime stage
# -----------------------
FROM node:18-alpine

WORKDIR /app

# Copy only what’s needed at runtime
COPY --from=builder /app /app

# Expose the API port
EXPOSE 5090

# Default environment variables (can override in Compose/Kubernetes)
ENV NODE_ENV=production

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

# Run the app
CMD ["npm", "start"]
