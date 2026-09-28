FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
# Replit's npm firewall URLs are private; use the same public tarballs on Render.
RUN node -e "const fs=require('fs'); const p='package-lock.json'; const lock=JSON.parse(fs.readFileSync(p,'utf8')); for(const pkg of Object.values(lock.packages)){if(pkg.resolved)pkg.resolved=pkg.resolved.replace(/^https?:\\/\\/package-firewall\\.replit\\.internal\\/npm\\//,'https://registry.npmjs.org/')} if(Object.values(lock.packages).some(pkg=>pkg.resolved?.includes('package-firewall.replit.internal')))throw Error('Private npm URLs remain'); fs.writeFileSync(p,JSON.stringify(lock));" \
    && npm ci --omit=dev --no-audit --no-fund
COPY . .

ENV NODE_ENV=production APP_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]