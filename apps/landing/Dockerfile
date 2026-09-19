FROM node:krypton-alpine AS deps
WORKDIR /usr/app
COPY package.json package-lock.json ./
COPY apps/landing/package.json apps/landing/
RUN npm ci -w apps/landing --ignore-scripts

FROM deps AS builder
ARG PUBLIC_CONTACT_ENDPOINT
ENV PUBLIC_CONTACT_ENDPOINT=$PUBLIC_CONTACT_ENDPOINT
COPY apps/landing ./apps/landing
RUN npm run build -w apps/landing

FROM nginx:alpine AS runner
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/app/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
