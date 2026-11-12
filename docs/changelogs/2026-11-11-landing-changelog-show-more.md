# Changelog de la landing con "Ver más"

**Released:** 2026-11-11

## Summary

`/changelog/` armaba las 115 entradas en un solo HTML, y cada release lo hacía más largo. La página ahora se genera con `paginate()` de Astro en tandas de 15 (`/changelog/`, `/changelog/2/` … `/changelog/8/`), todas estáticas. La primera tanda viene en el HTML, y el botón "Ver más novedades" es un enlace a la página siguiente que un script intercepta: la pide con `fetch`, saca sus entradas con `DOMParser` y las agrega debajo, así la lista crece en el mismo lugar sin descargar nada antes de que el usuario lo pida. Sin JS, o con cmd/ctrl+clic, el enlace navega a la página siguiente como cualquier otro. El orden de las entradas pasa a un helper compartido con `changelog.json`, que sigue devolviendo todo.

## Highlights

- `/changelog/` carga las 15 novedades más recientes y "Ver más novedades (N)" agrega las 15 siguientes debajo hasta llegar a la primera.
- Las páginas `/changelog/2/` en adelante son HTML completo: sirven sin JS, a los buscadores y como respaldo del botón.
- `changelog.json` y los enlaces existentes a `/changelog` no cambian.

## Added

- `src/pages/changelog/[...page].astro` reemplaza a `src/pages/changelog.astro`. Con la ruta rest, la página 1 queda en `/changelog/` y el resto en `/changelog/N/`. Desde la página 2 se muestra "Página N de M" con un enlace a las más recientes.
- Script de "Ver más": un flag de carga ignora los clics repetidos mientras hay una petición en curso; las entradas cuyo `id` ya existe en la lista se descartan, por si el sitio se redespliega entre una carga y otra; el foco pasa a la primera entrada nueva; un `role="status"` con `sr-only` anuncia cuántas se cargaron solo a lectores de pantalla; si la petición falla, el mensaje de error se muestra y el botón queda listo para reintentar. Cuando la página pedida ya no tiene botón, el script lo quita.
- `ReleaseCard.astro`: la tarjeta de cada entrada, con `id` igual al del archivo de la colección, `data-release` y `<time datetime>`.
- `utils/releases.ts`: `getReleasesNewestFirst()` y `RELEASES_PER_PAGE`. La constante vive fuera de la página porque `getStaticPaths` se ejecuta aislado y no ve las constantes del frontmatter.

## Changed

- `changelog.json.ts` usa `getReleasesNewestFirst()` en vez de ordenar por su cuenta.
- El sitemap incluye `/changelog/2/` … `/changelog/N/`.

## Files of interest

- `apps/landing/src/pages/changelog/[...page].astro`
- `apps/landing/src/components/ReleaseCard.astro`
- `apps/landing/src/utils/releases.ts`

## Commits

- `8c57f975` — feat(landing): load changelog entries in pages with a show more button
- `1692f966` — refactor(landing): share release sorting between changelog page and json
