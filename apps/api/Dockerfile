FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w apps/api --ignore-scripts

FROM deps AS builder
COPY apps/api ./apps/api
RUN npm run build -w apps/api

FROM node:krypton-alpine AS runner
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w apps/api --omit=dev --ignore-scripts
COPY --from=builder /usr/app/apps/api/dist ./apps/api/dist
RUN mkdir -p logs && chown node:node logs
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/robots.txt" || exit 1
CMD ["node", "apps/api/dist/src/app.js"]
