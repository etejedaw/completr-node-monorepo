FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci

FROM node:krypton-alpine AS builder
WORKDIR /usr/app
COPY --from=deps /usr/app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:krypton-alpine AS runner
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /usr/app/dist ./dist
CMD ["npm", "run", "start"]