# Sin segundo scroll en la vista sin sesión

**Released:** 2026-11-16

## Summary

En la vista sin sesión (`guest-shell`), el contenedor con scroll de la página (`main.page-scroller`) no estaba posicionado. Los elementos `absolute` sin ancestro posicionado, como los `sr-only` de los Rewinds y del perfil público, se ubicaban respecto a la ventana, estiraban el documento y aparecía un segundo scroll que seguía bajando por una zona vacía después del footer. La regla `.page-scroller` de `styles.css` ahora fija `position: relative` para todos los layouts.

## Highlights

- El Rewind, el archivo de Rewinds y el perfil público terminan en el footer también sin sesión.

## Fixed

- `.page-scroller` en `apps/web/src/styles.css`: `position: relative`.
- `docs/rules.md` explica por qué el contenedor debe estar posicionado.

## Files of interest

- `apps/web/src/styles.css`
- `apps/web/src/app/layout/guest-shell/guest-shell.ts`

## Commits

- `5c062d1c` — fix(web): keep absolute elements inside the page scroller so guests get no second scroll
- `90f77d3d` — docs(rules): explain why the page scroller is positioned
