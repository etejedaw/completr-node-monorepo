# RAWG provider opcional

**Released:** 2026-09-08

## Summary

Hasta ahora `RAWG_API_KEY` era obligatoria: el schema del config la exigia con `min(1)` y se parseaba al importar el modulo, asi que sin la key el proceso moria con un `ZodError` antes de levantar el servidor. Un fork del repo, un entorno de CI o cualquiera que no quisiera usar RAWG no tenia forma de arrancar el backend. Ahora la credencial es opcional y la integracion se degrada de forma explicita: el resto del producto (backlog, listas, ratio, reviews, amigos) funciona igual sobre el catalogo local.

La decision de diseno es un null object en la propia jerarquia del provider. `RawgClient` es una clase base abstracta con un `static create(apiKey?)` que devuelve `RawgProvider` si hay credencial y `DisabledRawgProvider` si no. El estado deshabilitado deja de ser algo que cada consumidor tenga que recordar comprobar: es el comportamiento por defecto del objeto que recibe.

## Highlights

- El backend arranca sin `RAWG_API_KEY` y avisa una vez al iniciar.
- Las cuatro superficies que dependen de RAWG responden 503 `RAWG_DISABLED` en lugar de tumbar el proceso.
- La busqueda de juegos degrada a catalogo local en vez de fallar.
- Los errores del provider dejan de salir como 500 generico y llegan al cliente con su status real.

## Added

- `RawgClient`, clase base abstracta en `src/rawg/rawg.provider.ts` con `isEnabled`, los tres metodos del provider y el `static create(apiKey?)` que elige implementacion.
- `DisabledRawgProvider`, implementacion que lanza `RAWG_DISABLED` en cada metodo.
- Capa de errores propia del provider en `src/rawg/errors/`: `rawg.domain-error.ts`, `rawg.service-to-domain.mapper.ts`, `rawg.domain-to-http.mapper.ts` y `rawg.error-domain.normalizer.ts`, registrados en los dos normalizers globales bajo la clave `RAWG Provider`.
- Constructor `disabledError()` en `rawg.service-error.ts`.

## Changed

- `RAWG_API_KEY` pasa a opcional en `api-keys.config.ts`, con un `optionalApiKey` reusable que tolera tanto la variable ausente como el string vacio. Agregar un provider nuevo es una linea mas en el schema.
- `games.service`, `games-search.service` y `jobs.service` crean su instancia con `RawgClient.create(apiKeysConfig.RAWG_API_KEY)` en lugar de `new RawgProvider(...)`.
- `searchAndCreateFromRawg` corta antes de llamar cuando el provider esta deshabilitado: la busqueda devuelve solo catalogo local, sin ruido en los logs.
- `startPopulateRawg` valida disponibilidad antes de crear el `Job`, asi que un backend sin key no deja jobs colgados en la tabla.
- `server.ts` emite un warn unico al arrancar cuando falta la credencial.
- `start:dev` usa `--env-file-if-exists`, de modo que el proyecto tambien levanta sin `.env`.

## Mapeo de errores

| Codigo                | Status |
| --------------------- | ------ |
| `RAWG_DISABLED`       | 503    |
| `RAWG_NOT_FOUND`      | 404    |
| `RAWG_RATE_LIMITED`   | 429    |
| `RAWG_REQUEST_ERROR`  | 502    |
| `RAWG_PARSE_ERROR`    | 502    |
| `RAWG_INTERNAL_ERROR` | 500    |

Antes de este cambio el provider no estaba registrado en `global-error-domain.normalizer.ts`, asi que todos sus fallos —incluido un rate limit de RAWG— salian como 500 `INTERNAL_ERROR`.

## Endpoints afectados

Con RAWG deshabilitado responden 503; el resto de la API no se ve afectada.

- `GET /games/rawg-lookup`
- `GET /games/rawg-detail/:rawgId`
- `GET /game-external/rawg/:slug`
- `POST /admin/jobs/populate-rawg`

## Files of interest

- `src/rawg/rawg.provider.ts` — jerarquia completa: base abstracta, implementacion real, implementacion deshabilitada y `create`.
- `src/common/config/api-keys.config.ts` — credencial opcional y `optionalApiKey` reusable.
- `src/rawg/errors/rawg.domain-to-http.mapper.ts` — mapeo de codigos a status.
- `src/games/games.service.ts` — degradacion a catalogo local en la busqueda.
- `docs/context/providers.md` — seccion "Providers opcionales" con el patron completo.

## Commits

- `87c7282` — feat(rawg): keep the app running without a rawg api key
- `8f4970b` — feat(rawg): map provider errors to their own http status
- `136ed77` — docs(providers): document optional providers and rawg error codes
- `f288fae` — docs(api): document rawg error responses in the bruno collection
- `6d5af2a` — chore(scripts): tolerate a missing .env in start:dev
