FROM node:22-alpine

WORKDIR /app

# better-sqlite3 can compile if a compatible prebuilt binary is unavailable.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production APP_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]