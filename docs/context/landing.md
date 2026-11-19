# Landing

Estándares de una landing estática con Astro servida por nginx: estructura, contenido y build. Están escritos para servir tal cual en cualquier proyecto con el mismo stack. Lo que es propio de un producto concreto vive en el documento de reglas del repo.

## Estructura de carpetas

```
landing/
├── astro.config.mjs        # site, sitemap, Tailwind y chequeos de build
├── contact-endpoint-check.mjs  # Falla el build si el endpoint del formulario falta o no está en la CSP
├── nginx.conf              # Caché, CORS de los .json públicos e include de los headers
├── security-headers.conf   # Headers de seguridad y CSP, incluidos en cada location
├── public/                 # Estáticos servidos tal cual (fuentes, og.png, .well-known)
└── src/
    ├── assets/             # Imágenes que optimiza astro:assets
    ├── content.config.ts   # Schemas de las colecciones
    ├── content/            # Una colección por carpeta, una entrada .md por documento
    ├── components/         # Secciones de la página
    ├── layouts/
    ├── pages/              # Rutas, incluidos los endpoints .json generados en el build
    ├── providers/          # Llamadas a servicios externos en build
    ├── utils/              # Helpers de build
    └── styles/global.css
```

## Imágenes

Las imágenes que muestra la landing viven en `src/assets/` y se usan con `<Picture>` de `astro:assets`, que genera AVIF y WebP en varios anchos durante el build. Las capturas se guardan en `.webp` con densidad alta (escritorio a 1440×900 y celular a 390×844). Para cambiar una imagen basta con reemplazar el archivo manteniendo el nombre; si se agrega una nueva, se importa en el componente que la usa. Las imágenes de `public/` no se optimizan, por eso no van ahí.

## Fuentes

Las fuentes se autoalojan en `public/fonts/`, nunca se cargan de un servicio de terceros, y su licencia va junto a los archivos.

## Contenido

El contenido editable (changelog, textos legales) vive en content collections, con un schema de Zod en `content.config.ts` que valida el frontmatter. El build falla si una entrada no cumple el schema.

- Cada entrada es un `.md`. Para las que se ordenan por fecha, el nombre sigue `YYYY-MM-DD-NN-<slug>.md` y un campo `order` desempata las del mismo día.
- Un endpoint `.json` generado en el build (`src/pages/<nombre>.json.ts`) expone el contenido a otros orígenes, y nginx lo sirve con `Access-Control-Allow-Origin: *`.
- Cuando un documento legal tiene secciones declaradas en el frontmatter y secciones en el cuerpo, un helper de `utils/` las une y el build falla si la cantidad no coincide.
- Un documento publicado en varios idiomas se edita en todos los archivos a la vez, con la misma versión, la misma fecha y los mismos ids de sección en el mismo orden, para que los enlaces directos a una sección apunten al mismo lugar.

## Idiomas

La landing usa el i18n nativo de Astro: `i18n` en `astro.config.mjs` con `prefixDefaultLocale: true`, así que cada idioma tiene su prefijo de ruta (`/es/`, `/en/`). Las páginas viven en `src/pages/[lang]/`, con `getStaticPaths` armado desde la lista de idiomas de la config (`astro:config/client`, vía `src/i18n/locales.ts`). Las páginas paginadas llaman a `paginate` una vez por idioma con `params: { lang }`.

- Cada componente lee el idioma con `Astro.currentLocale`, sin recibirlo como prop, y guarda sus textos en un objeto `copy = { es: {...}, en: {...} } satisfies Record<Locale, unknown>` al principio del frontmatter; la plantilla lee `copy[lang]`. Los dos idiomas tienen la misma forma, y los datos que no son texto (íconos, ids) van junto a su etiqueta en cada idioma.
- Un texto con un resaltado dentro (un `span`, un enlace) se parte en trozos, y el marcado queda en la plantilla.
- Los enlaces internos se arman con `getRelativeLocaleUrl` de `astro:i18n` y las URL absolutas con `getAbsoluteLocaleUrl`. Esas funciones agregan una barra final a todo lo que reciben, también a un ancla (`/en/#ratio/`), así que un enlace a una sección se arma como `getRelativeLocaleUrl(lang)` seguido del ancla.
- `Layout` toma el idioma y la ruta de la URL, y con eso arma `<html lang>`, la URL canónica y los `hreflang` de cada idioma más `x-default`, que apunta a la ruta sin prefijo.
- Los textos de los scripts del cliente llegan en atributos `data-*` renderizados desde `copy`, nunca escritos en el script.
- Las fechas se formatean con `Intl.DateTimeFormat(lang, …)`.
- En un sitio estático, `Astro.preferredLocale` no existe: el servidor elige el idioma de las rutas sin prefijo y redirige. El sitemap se genera con la opción `i18n` de `@astrojs/sitemap`.
- **Espacios entre una expresión y un elemento.** Cuando `{t.algo}` y un elemento en línea (`<a>`, `<span>`, `<strong>`) quedan en líneas distintas, Astro descarta el espacio entre ellos y las palabras se pegan. Prettier corta esas líneas al formatear, así que el espacio se escribe explícito: `{t.leadStart}{" "}`.

## Variables de entorno

Todas se leen en el build: el sitio es estático y no hay runtime de Node en producción.

- Las que llegan al cliente llevan el prefijo `PUBLIC_` y entran a la imagen como `ARG` del `Dockerfile`.
- Una variable sin la que una función del sitio no sirve (el endpoint de un formulario, por ejemplo) es obligatoria: una integración de `astro.config.mjs` hace fallar `astro build` con un mensaje claro si falta, en vez de publicar un formulario roto. Si la variable apunta a otro dominio, la misma integración verifica que su origen esté en la directiva de la CSP que lo usa, para que la variable y `security-headers.conf` no se desincronicen.
- Los tokens de servicios externos (GitHub, por ejemplo) son opcionales: sin ellos la llamada va sin autenticar, con límite de rate. Si la llamada falla, la sección usa valores por defecto y el build no se rompe.

## Headers de seguridad y CSP

`security-headers.conf` define la Content-Security-Policy estricta y el resto de los headers de seguridad. Si agregas un script, una fuente o un `fetch` a otro dominio, suma ese dominio a la directiva correspondiente o el navegador lo bloquea.

- `nginx.conf` incluye ese archivo en el `server` y otra vez en cada `location` que declara su propio `add_header`. En nginx, un `add_header` dentro de un `location` anula todos los del `server`: sin el `include`, esos recursos salen sin CSP, HSTS ni `nosniff`.
- `Cache-Control: immutable` solo va en recursos con hash en el nombre (`/_astro/`, `/fonts/`). Un archivo sin hash (`favicon.svg`, `og.png`) marcado `immutable` no se actualiza en los navegadores que ya lo tienen.

## Accesibilidad

El layout empieza con un enlace "Saltar al contenido" que apunta al `main` de cada página (`id="main-content"`), visible al recibir el foco.

## Dependencias

Si el bundle de prerender de Astro resuelve un paquete que el código propio no importa y la raíz del monorepo tiene otra versión incompatible, el paquete se declara en el `package.json` de la landing. Quitarlo rompe el build.
