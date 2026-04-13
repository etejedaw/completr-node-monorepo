FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci

FROM node:krypton-alpine AS builder
WORKDIR /usr/app
COPY --from=deps /usr/app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /usr/app/dist/completr/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
