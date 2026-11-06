# Landing

Estándares de una landing estática con Astro servida por nginx: estructura, contenido y build. Están escritos para servir tal cual en cualquier proyecto con el mismo stack. Lo que es propio de un producto concreto vive en el documento de reglas del repo.

## Estructura de carpetas

```
landing/
├── astro.config.mjs        # site, sitemap y Tailwind
├── nginx.conf              # Headers de seguridad, CSP, caché, CORS de los .json públicos
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

## Variables de entorno

Todas se leen en el build: el sitio es estático y no hay runtime de Node en producción.

- Las que llegan al cliente llevan el prefijo `PUBLIC_` y entran a la imagen como `ARG` del `Dockerfile`.
- Los tokens de servicios externos (GitHub, por ejemplo) son opcionales: sin ellos la llamada va sin autenticar, con límite de rate. Si la llamada falla, la sección usa valores por defecto y el build no se rompe.

## CSP

`nginx.conf` define una Content-Security-Policy estricta. Si agregas un script, una fuente o un `fetch` a otro dominio, suma ese dominio a la directiva correspondiente o el navegador lo bloquea.

## Dependencias

Si el bundle de prerender de Astro resuelve un paquete que el código propio no importa y la raíz del monorepo tiene otra versión incompatible, el paquete se declara en el `package.json` de la landing. Quitarlo rompe el build.
