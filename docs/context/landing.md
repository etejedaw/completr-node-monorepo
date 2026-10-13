# Landing

Arquitectura y convenciones de `apps/landing`, el sitio público de Completr (`https://www.completr.app`). Es independiente de `apps/api` y `apps/web`: no llama a la API ni comparte código con el frontend. Las reglas generales de estilo, commits y post-edición están en [`conventions.md`](./conventions.md) y aplican a todas las apps.

## Stack

| Capa      | Tecnología                                        |
| --------- | ------------------------------------------------- |
| Framework | Astro 7, salida estática (`output: "static"`)     |
| Lenguaje  | TypeScript 6.0 (`astro/tsconfigs/strict`)         |
| Estilos   | Tailwind CSS 4 vía `@tailwindcss/vite`            |
| Contenido | Content collections (`src/content.config.ts`)     |
| SEO       | `@astrojs/sitemap`, `public/robots.txt`           |
| Servidor  | nginx en producción (`nginx.conf`), sin SSR       |
| Lint      | `eslint-plugin-astro` + reglas comunes de la raíz |
| Formato   | `prettier-plugin-astro`, declarado en la raíz     |

## Estructura de carpetas

```
apps/landing/
├── astro.config.mjs        # site, sitemap y Tailwind
├── nginx.conf              # Headers de seguridad, CSP, caché, CORS de los .json públicos
├── public/                 # Estáticos servidos tal cual (fuentes, og.png, .well-known)
└── src/
    ├── assets/screenshots/ # Capturas de la app que optimiza astro:assets
    ├── content.config.ts   # Schemas de las colecciones `releases` y `legal`
    ├── content/releases/   # Una entrada .md por release pública
    ├── content/legal/      # Política de privacidad en español e inglés
    ├── components/         # Secciones de la página (Hero, Ratio, ProductTour, Changelog…)
    ├── layouts/Layout.astro
    ├── pages/              # Rutas: /, /changelog, /privacy, /gracias, 404, changelog.json, privacy.json
    ├── providers/          # Llamadas a servicios externos en build (GitHub)
    ├── utils/              # Helpers de build (armado de la política por secciones)
    └── styles/global.css
```

## Capturas de la app

Las capturas que muestra la landing viven en `src/assets/screenshots/` como `.webp` (escritorio a 1440×900 y celular a 390×844, ambas con densidad alta) y se usan con `<Picture>` de `astro:assets`, que genera AVIF y WebP en varios anchos durante el build. El marco de ventana y de celular está en `DeviceFrames.astro`. Para cambiar una captura basta con reemplazar el archivo manteniendo el nombre; si se agrega una nueva, se importa en el componente que la usa. Las imágenes de `public/` no se optimizan, por eso las capturas no van ahí.

## Changelog público

`src/content/releases/` es el changelog que ven los usuarios, en `/changelog` y en `/changelog.json`. Es distinto de `docs/changelogs/`, que es técnico y referencia commits. Cada entrada es un `.md` con frontmatter validado por el schema de `content.config.ts`; el nombre sigue `YYYY-MM-DD-NN-<slug>.md` y `order` desempata las entradas del mismo día.

`/changelog.json` se genera en el build (`src/pages/changelog.json.ts`) y nginx lo sirve con `Access-Control-Allow-Origin: *` para que otros orígenes puedan leerlo. La API lo reexpone en `GET /changelog` y `apps/web` lo muestra en la página "What's new". La API lo lee de `CHANGELOG_SOURCE_URL`: por defecto es `http://localhost:4321/changelog.json`, la landing de `npm run dev`, y en producción se configura con `https://www.completr.app/changelog.json`. La API guarda la respuesta en caché 5 minutos; reiníciala para ver al instante una entrada nueva. Si la landing no está corriendo, `GET /changelog` responde 503.

Por eso cada entrada mezcla dos idiomas: `tag`, `title` y `highlights` van en inglés, como la UI de la app; `landing.pitch` va en español, como la landing. Los `highlights` solo se ven en la app, y el `pitch` solo en la landing.

## Política de privacidad

El texto de la política vive solo en la landing, en `src/content/legal/`: `privacy-es.md` y `privacy-en.md`, validados por la colección `legal` de `content.config.ts`. Cada archivo declara en el frontmatter la versión, la fecha, el resumen, las tarjetas de resumen (`highlights`) y la lista de secciones (`id`, etiqueta corta e ícono); el cuerpo tiene una sección por cada `##`, en el mismo orden que esa lista. `src/utils/privacy-policy.ts` une ambas cosas y el build falla si la cantidad de `##` no coincide con las secciones declaradas.

La versión en español se publica en `/privacy`; la versión en inglés solo como `/privacy.json`, que nginx sirve con los mismos headers que `/changelog.json`. La API la reexpone en `GET /privacy` (variable `PRIVACY_SOURCE_URL`, por defecto `http://localhost:4321/privacy.json`; en producción `https://www.completr.app/privacy.json`) y `apps/web` la muestra en su página Privacy.

Para cambiar la política se editan **los dos archivos a la vez**, con la misma `version`, la misma `updated` y los mismos `id` de sección en el mismo orden: los enlaces directos como `/privacy#cookies` apuntan a la misma sección en la landing y en la app. Igual que con el changelog, la API guarda la respuesta 5 minutos.

## Variables de entorno

Todas se leen en el build: el sitio es estático y no hay runtime de Node en producción.

| Variable                  | Uso                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `PUBLIC_CONTACT_ENDPOINT` | Destino del formulario de la beta. Llega a la imagen como `ARG` del `Dockerfile`      |
| `GITHUB_TOKEN`            | Opcional. Autentica las llamadas a la API de GitHub de `providers/github.ts` en build |

Sin `GITHUB_TOKEN`, la API de GitHub responde sin autenticar (con límite de rate). Si falla, la sección de código abierto usa valores por defecto y el build no se rompe.

## CSP

`nginx.conf` define una Content-Security-Policy estricta. Si agregas un script, una fuente o un `fetch` a otro dominio, suma ese dominio a la directiva correspondiente o el navegador lo bloquea.

## Dependencias

`cookie` está declarado en `apps/landing/package.json` aunque el código no lo importa. El bundle de prerender de Astro lo resuelve desde `apps/landing`, y sin esa declaración npm deja en la raíz el `cookie@0.x` de Express, que no tiene los exports que Astro espera. Quitarlo rompe `npm run build -w apps/landing`.

## Comandos

| Comando                                | Qué hace                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev:landing`                  | Servidor de desarrollo en `http://localhost:4321`. También lo levanta `npm run dev` |
| `npm run build:landing`                | `astro check` + build estático en `apps/landing/dist`                               |
| `npm run typecheck -w apps/landing`    | Solo `astro check`                                                                  |
| `npm run preview -w apps/landing`      | Sirve el build local                                                                |
| `npm run astro -w apps/landing -- ...` | CLI de Astro                                                                        |
