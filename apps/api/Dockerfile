FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --ignore-scripts

FROM deps AS builder
COPY apps/api ./apps/api
RUN npm run build -w apps/api

FROM node:krypton-alpine AS runner
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev --ignore-scripts
COPY --from=builder /usr/app/apps/api/dist ./apps/api/dist
CMD ["node", "apps/api/dist/src/app.js"]
