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

Para desarrollo local no hace falta `.env.dev.local`: los valores por defecto de la API están en el código y coinciden con el `docker-compose.yml`. Las variables disponibles y cómo se consumen viven en [`apps/api/src/common/config/`](./apps/api/src/common/config/).

Si quieres sobrescribir alguna, crea `apps/api/.env.dev.local` solo con esas variables. [`apps/api/.env.example`](./apps/api/.env.example) lista todas las keys como referencia; no lo copies tal cual, porque una key vacía no toma el valor por defecto.

Conviene definir tres cosas, todas opcionales:

- `RAWG_API_KEY`, gratuita en https://rawg.io/apidocs. Sin ella, la API arranca y usa solo el catálogo local.
- `SMTP_HOST` y `SMTP_PORT`, para que la API envíe correos (por ejemplo, la recuperación de contraseña) a Mailpit. Sin `SMTP_HOST`, el correo queda deshabilitado y esos endpoints responden 503.
- `DEEPSEEK_API_KEY`, para las funciones con IA. Sin ella, la IA queda como no configurada y la API arranca igual. `DEEPSEEK_MODEL` (por defecto `deepseek-flash`) y `DEEPSEEK_TIMEOUT_MS` (por defecto `30000`) ajustan el modelo y el tiempo máximo de espera.

```bash
cat > apps/api/.env.dev.local <<'ENV'
RAWG_API_KEY=<tu-key>
SMTP_HOST=localhost
SMTP_PORT=1025
ENV
```

La URL de la API que usa el frontend está en [`apps/web/src/environments/`](./apps/web/src/environments/).

### 3. Levantar la infraestructura con Docker Compose

```bash
npm run db
```

Esto levanta:

- **PostgreSQL** en `localhost:5432` con la DB `completr`
- **PostgreSQL de tests** en `localhost:5433` con la DB `completr_test`
- **pgAdmin** en http://localhost (login `root@postgres.com` / `toor`)
- **Mailpit** con SMTP en `localhost:1025` y la bandeja de correos enviados en http://localhost:8025

Para bajarla: `npm run db:down`.

Si alguno de esos puertos está ocupado (por ejemplo, por otro proyecto con su propio Postgres), crea `apps/api/.env` con los que quieras usar. Docker Compose lee ese archivo solo; las variables que no definas mantienen su valor por defecto:

```bash
PG_PORT=5432
PG_TEST_PORT=5433
PGADMIN_PORT=80
MAILPIT_SMTP_PORT=1025
MAILPIT_UI_PORT=8025
```

Si cambias `PG_PORT`, define el mismo valor en `apps/api/.env.dev.local` para que la API y las migraciones apunten al puerto nuevo.

### 4. Correr migraciones

```bash
npm run migrate:dev
```

### 5. Cargar datos de prueba (opcional)

```bash
npm run seed:dev
```

Llena una base local ya migrada con lo mínimo para probar a mano el modal de "Añadir juego". Es idempotente (puedes correrlo varias veces sin duplicar ni pisar lo que ya exista) y se niega a correr si `NODE_ENV` no es `dev` o si `PG_HOST` no es un host local.

- **Usuarios**, ambos con la contraseña `DevSeed123!`: `admin@completr.local` (admin) y `user@completr.local` (usuario normal, username `player`).
- **Plataformas**: PC, PlayStation 5, Nintendo Switch y Xbox Series X|S. Las fuentes de puntaje (Completr, Metacritic, OpenCritic y RAWG) las siembran las migraciones y el seed las asegura.
- **Juegos**, uno por caso del modal: Astro Bot (puntaje, duración y una sola plataforma), Hades (puntaje, duración y varias plataformas), Balatro (sin puntaje, con duración), Celeste (sin duración, con puntaje), Tunic (sin puntaje ni duración) y Hollow Knight (sin plataformas).
- **Backlog** de `user@completr.local`: Hades en `playing`, Astro Bot en `completed` y Celeste en `not_started`, para probar el modo edición.

Los datos son de prueba: las notas, duraciones y plataformas de cada juego están simplificadas a propósito.

### 6. Iniciar la app en modo desarrollo

```bash
npm run dev
```

Levanta las tres apps a la vez:

- **API** en `http://localhost:3000`, con reinicio automático al guardar cambios (`node --watch`).
- **Web** en `http://localhost:4200`.
- **Landing** en `http://localhost:4321`. La página "What's new" de la web lee el changelog de la landing a través de la API, así que en local muestra las entradas de `apps/landing/src/content/releases/`.

Para levantar una sola: `npm run dev:api`, `npm run dev:web` o `npm run dev:landing`.

## Scripts principales

Todos se ejecutan desde la raíz:

| Script                 | Qué hace                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`          | API, web y landing en desarrollo                                                |
| `npm run build`        | Compila todas las apps                                                          |
| `npm run lint`         | ESLint sobre todo el repo                                                       |
| `npm run format`       | Prettier sobre todo el repo                                                     |
| `npm run typecheck`    | Chequeo de tipos de API y landing                                               |
| `npm test`             | Tests del frontend                                                              |
| `npm run migrate:dev`  | Aplica las migraciones pendientes en local                                      |
| `npm run seed:dev`     | Carga datos de prueba en la base local (usuarios, catálogo, juegos y backlog)   |
| `npm run migrate:prod` | Aplica las migraciones pendientes en producción, con `apps/api/.env.prod.local` |

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
