FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --ignore-scripts

FROM deps AS builder
COPY apps/web ./apps/web
RUN npm run build -w apps/web

FROM nginx:alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY apps/web/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /usr/app/apps/web/dist/completr/browser /usr/share/nginx/html
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV API_UPSTREAM=https://api.completr.app
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
