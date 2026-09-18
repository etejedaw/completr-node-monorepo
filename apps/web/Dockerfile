FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --ignore-scripts

FROM deps AS builder
COPY apps/web ./apps/web
RUN npm run build -w apps/web

FROM nginx:alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /usr/app/apps/web/dist/completr/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
