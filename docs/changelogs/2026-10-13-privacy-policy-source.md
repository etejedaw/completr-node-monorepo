# Política de privacidad con una sola fuente

**Released:** 2026-10-13

## Summary

El texto de la política de privacidad vive ahora solo en la landing, como colección de contenido `legal` en español e inglés. La landing publica la versión en español en `/privacy` y la inglesa como `/privacy.json`; la API la reexpone en `GET /privacy` con caché de 5 minutos y `apps/web` la carga desde ahí en lugar de mantener el texto en una plantilla. El proxy con caché que ya usaba `GET /changelog` se extrae a un helper común.

## Highlights

- Un solo lugar para editar la política: `apps/landing/src/content/legal/`.
- `GET /privacy` público, con rate limit y respuesta en caché si la fuente cae.
- El build de la landing falla si las secciones declaradas no coinciden con los `##` del cuerpo.

## Added

- `createCachedJsonProxy` (`common/utils/cached-json-proxy.util.ts`): caché de 5 minutos, timeout de 5 segundos, una sola petición en vuelo y respuesta con el último valor si la fuente falla. Responde 503 si nunca hubo caché.
- Módulo `privacy` y endpoint `GET /privacy`, documentado en `docs/api/privacy/get.yml`.
- Variable `PRIVACY_SOURCE_URL` (por defecto `http://localhost:4321/privacy.json`) en `environment.config.ts` y `.env.example`.
- Landing: colección `legal` en `content.config.ts`, `privacy-es.md`, `privacy-en.md`, `utils/privacy-policy.ts` y la ruta `privacy.json.ts`.
- Web: `privacy-policy.ts` con los tipos de la política y `LANDING_PRIVACY_URL`.

## Changed

- `changelog.controller.ts` usa `createCachedJsonProxy`.
- `privacy.astro` renderiza la política desde la colección `legal`.
- `nginx.conf` de la landing sirve `/privacy.json` con los mismos headers que `/changelog.json`.
- `features/legal/privacy` carga la política con la API y muestra el estado de carga y de error.
- `injectSectionScrollSpy` acepta una señal de secciones y resuelve el fragmento de la URL cuando las secciones llegan.
- `docs/context/landing.md` y `docs/context/frontend.md` documentan el flujo y las capturas de la landing.

## Removed

- El texto de la política escrito en `privacy.html` de `apps/web`.

## Files of interest

- `apps/api/src/common/utils/cached-json-proxy.util.ts`
- `apps/api/src/privacy/`
- `apps/landing/src/utils/privacy-policy.ts`
- `apps/landing/src/content/legal/`
- `apps/web/src/app/features/legal/privacy/privacy.ts`
- `docs/context/landing.md`

## Commits

- `eb74cd0c` — refactor(api): extract cached json proxy helper
- `de43dad2` — feat(privacy): add GET /privacy proxy endpoint
- `1a369d9c` — feat(landing): serve privacy policy from legal collection
- `7e36809b` — feat(web): load privacy policy from api
- `9e6751f7` — docs(context): document privacy policy flow and landing assets
