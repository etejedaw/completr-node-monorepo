# Completr

[Completr](https://www.completr.app) es una aplicación tipo **Trakt pero para videojuegos**.

Permite gestionar tu backlog de juegos, priorizarlos con un sistema de ratio (puntuación / duración estimada) y llevar registro de qué has completado, qué estás jugando y qué quieres jugar próximamente. Integra datos de fuentes como RAWG, Metacritic, OpenCritic y HowLongToBeat.

- **App en producción:** https://web.completr.app

## Estructura

Monorepo con npm workspaces:

| Carpeta    | Qué contiene                                        |
| ---------- | --------------------------------------------------- |
| `apps/api` | API REST (Node.js + Express + Sequelize)            |
| `apps/web` | Aplicación web (Angular + PWA)                      |
| `docs/`    | Documentación técnica, colección Bruno y changelogs |

## Stack

**Backend (`apps/api`)**

- **Runtime:** Node.js 22+ con TypeScript
- **Framework:** Express 5
- **ORM:** Sequelize 6
- **Base de datos:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Validación:** Zod v4
- **Logging:** Pino
- **Seguridad:** Helmet, CORS, rate-limiter-flexible

**Frontend (`apps/web`)**

- **Framework:** Angular 22 (standalone, Signals)
- **Estilos:** Tailwind CSS 4
- **Componentes:** ng-primitives
- **PWA:** Angular Service Worker
- **Tests:** Vitest

## Requisitos

- [Node.js 22+](https://nodejs.org/) (se usa el flag nativo `--env-file`)
- [Docker](https://www.docker.com/) y Docker Compose (para PostgreSQL local)
- npm

## Cómo correrlo en local

### 1. Clonar e instalar dependencias

```bash
git clone git@github.com:etejedaw/completr-node-monorepo.git
cd completr-node-monorepo
nvm use
npm install
```

Un solo `npm install` en la raíz instala las dependencias de las dos apps.

### 2. Configurar variables de entorno

Copia el ejemplo:

```bash
cp apps/api/.env.example apps/api/.env
```

Los valores por defecto ya están listos para desarrollo local y coinciden con el `docker-compose.yml`. Las variables disponibles y cómo se consumen viven en [`apps/api/src/common/config/`](./apps/api/src/common/config/).

Lo único que necesitas conseguir aparte es una `RAWG_API_KEY` gratuita en https://rawg.io/apidocs.

La URL de la API que usa el frontend está en [`apps/web/src/environments/`](./apps/web/src/environments/).

### 3. Levantar la infraestructura con Docker Compose

```bash
npm run db
```

Esto levanta:

- **PostgreSQL** en `localhost:5432` con la DB `completr`
- **PostgreSQL de tests** en `localhost:5433` con la DB `completr_test`
- **pgAdmin** en http://localhost (login `root@postgres.com` / `toor`)

Para bajarla: `npm run db:down`.

### 4. Correr migraciones

```bash
npm run migrate
```

### 5. Iniciar la app en modo desarrollo

```bash
npm run dev
```

Levanta las dos apps a la vez:

- **API** en `http://localhost:3000`, con reinicio automático al guardar cambios (`node --watch`).
- **Web** en `http://localhost:4200`.

Para levantar una sola: `npm run dev:api` o `npm run dev:web`.

## Scripts principales

Todos se ejecutan desde la raíz:

| Script              | Qué hace                          |
| ------------------- | --------------------------------- |
| `npm run dev`       | API + web en modo desarrollo      |
| `npm run build`     | Compila las dos apps              |
| `npm run lint`      | ESLint sobre todo el repo         |
| `npm run format`    | Prettier sobre todo el repo       |
| `npm run typecheck` | Chequeo de tipos del backend      |
| `npm test`          | Tests del frontend                |
| `npm run migrate`   | Aplica las migraciones pendientes |

Cualquier otro script de una app: `npm run <script> -w apps/<app>`.

Las convenciones de arquitectura y las reglas que el código hace cumplir están en [`docs/`](./docs/README.md).

## Documentación de la API

La colección de endpoints vive en [`docs/api/`](./docs/api/) en formato [Bruno v3.1](https://www.usebruno.com/). Para explorarla:

1. Instalar Bruno
2. Abrir la carpeta `docs/api/` como colección
3. Configurar la variable `BASE_URL` (por defecto `http://localhost:3000`)

## Licencia

[AGPL-3.0](./LICENSE)
