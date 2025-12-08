# -----------------------
# 1. Build stage
# -----------------------
FROM node:18-bullseye AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# -----------------------
# 2. Runtime stage
# -----------------------
FROM node:18-bullseye

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 6090

CMD ["node", "dist/server.js"]
