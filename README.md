# Completr

[Completr](https://www.completr.app) es una aplicación tipo **Trakt pero para videojuegos**.

Permite gestionar tu backlog de juegos, priorizarlos con un sistema de ratio (puntuación / duración estimada) y llevar registro de qué has completado, qué estás jugando y qué quieres jugar próximamente. Integra datos de fuentes como RAWG, Metacritic, OpenCritic y HowLongToBeat.

- **Sitio:** https://www.completr.app
- **App en producción:** https://web.completr.app

## Estructura

Monorepo con npm workspaces:

| Carpeta        | Qué contiene                                        |
| -------------- | --------------------------------------------------- |
| `apps/api`     | API REST (Node.js + Express + Sequelize)            |
| `apps/web`     | Aplicación web (Angular + PWA)                      |
| `apps/landing` | Landing y changelog público (Astro, estático)       |
| `docs/`        | Documentación técnica, colección Bruno y changelogs |

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

**Landing (`apps/landing`)**

- **Framework:** Astro 7 (salida estática)
- **Estilos:** Tailwind CSS 4

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

Un solo `npm install` en la raíz instala las dependencias de todas las apps.

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

Para levantar una sola: `npm run dev:api` o `npm run dev:web`. La landing se levanta aparte con `npm run dev:landing`, en `http://localhost:4321`.

## Scripts principales

Todos se ejecutan desde la raíz:

| Script              | Qué hace                          |
| ------------------- | --------------------------------- |
| `npm run dev`       | API + web en modo desarrollo      |
| `npm run build`     | Compila todas las apps            |
| `npm run lint`      | ESLint sobre todo el repo         |
| `npm run format`    | Prettier sobre todo el repo       |
| `npm run typecheck` | Chequeo de tipos de API y landing |
| `npm test`          | Tests del frontend                |
| `npm run migrate`   | Aplica las migraciones pendientes |

Cualquier otro script de una app: `npm run <script> -w apps/<app>`.

## Dependencias

El repo usa [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces): hay un solo `package-lock.json` y un solo `node_modules` en la raíz, compartido por todas las apps. Por eso `npm install` se ejecuta siempre desde la raíz, nunca dentro de una carpeta de `apps/`.

| Quiero…                                      | Comando                                 |
| -------------------------------------------- | --------------------------------------- |
| Instalar todo después de clonar o de un pull | `npm install`                           |
| Agregar una dependencia al backend           | `npm install <paquete> -w apps/api`     |
| Agregar una dependencia al frontend          | `npm install <paquete> -w apps/web`     |
| Agregar una dependencia a la landing         | `npm install <paquete> -w apps/landing` |
| Agregar una herramienta de desarrollo común  | `npm install -D <paquete>`              |
| Quitar una dependencia de una app            | `npm uninstall <paquete> -w apps/<app>` |

Dónde declarar cada paquete:

- **En el `package.json` de la raíz:** herramientas que usa todo el repo (TypeScript, ESLint, Prettier, Husky) y cualquier paquete que necesiten varias apps.
- **En el `package.json` de cada app:** lo que solo usa esa app, como Express o Sequelize en el backend, Angular en el frontend y Astro en la landing.
- **Nunca en los dos a la vez.** Un paquete declarado en la raíz y en una app puede terminar instalado en dos versiones distintas.

Las convenciones de arquitectura y las reglas que el código hace cumplir están en [`docs/`](./docs/README.md).

## Documentación de la API

La colección de endpoints vive en [`docs/api/`](./docs/api/) en formato [Bruno v3.1](https://www.usebruno.com/). Para explorarla:

1. Instalar Bruno
2. Abrir la carpeta `docs/api/` como colección
3. Configurar la variable `BASE_URL` (por defecto `http://localhost:3000`)

## Licencia

[AGPL-3.0](./LICENSE)
