# Completr — Backend

API REST de [Completr](https://www.completr.app), una aplicación tipo **Trakt pero para videojuegos**.

Permite gestionar tu backlog de juegos, priorizarlos con un sistema de ratio (puntuación / duración estimada) y llevar registro de qué has completado, qué estás jugando y qué quieres jugar próximamente. Integra datos de fuentes como RAWG, Metacritic, OpenCritic y HowLongToBeat.

## Repositorios relacionados

- **Frontend (Angular + PWA):** [`completr-node-frontend`](https://github.com/etejedaw/completr-node-frontend)
- **App en producción:** https://web.completr.app

Este repo expone la API que consume el frontend. Para levantar la app completa en local necesitas correr ambos proyectos.

## Stack

- **Runtime:** Node.js 22+ con TypeScript
- **Framework:** Express 5
- **ORM:** Sequelize 6
- **Base de datos:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Validación:** Zod v4
- **Logging:** Pino
- **Seguridad:** Helmet, CORS, rate-limiter-flexible

## Requisitos

- [Node.js 22+](https://nodejs.org/) (se usa el flag nativo `--env-file`)
- [Docker](https://www.docker.com/) y Docker Compose (para PostgreSQL local)
- npm

## Cómo correrlo en local

### 1. Clonar e instalar dependencias

```bash
git clone git@github.com:etejedaw/completr-node-backend.git
cd completr-node-backend
nvm use
npm install
```

### 2. Configurar variables de entorno

Copia el ejemplo:

```bash
cp .env.example .env
```

Los valores por defecto ya están listos para desarrollo local y coinciden con el `docker-compose.yml`. Las variables disponibles y cómo se consumen viven en [`src/common/config/`](./src/common/config/).

Lo único que necesitas conseguir aparte es una `RAWG_API_KEY` gratuita en https://rawg.io/apidocs.

### 3. Levantar la infraestructura con Docker Compose

```bash
docker compose up -d
```

Esto levanta:

- **PostgreSQL** en `localhost:5432` con la DB `completr`
- **PostgreSQL de tests** en `localhost:5433` con la DB `completr_test`
- **pgAdmin** en http://localhost (login `root@postgres.com` / `toor`)

### 4. Correr migraciones

```bash
npm run migrate
```

### 5. Iniciar el servidor en modo desarrollo

```bash
npm run start:dev
```

El servidor queda escuchando en `http://localhost:3000` y se reinicia automáticamente al guardar cambios (`node --watch`).

Más detalle sobre conceptos del dominio (ratio, estados, vistas vs listas) y convenciones de arquitectura está en [`CONTEXT.md`](./CONTEXT.md).

## Documentación de la API

La colección de endpoints vive en [`docs/api/`](./docs/api/) en formato [Bruno v3.1](https://www.usebruno.com/). Para explorarla:

1. Instalar Bruno
2. Abrir la carpeta `docs/api/` como colección
3. Configurar la variable `BASE_URL` (por defecto `http://localhost:3000`)

## Licencia

[AGPL-3.0](./LICENSE)
