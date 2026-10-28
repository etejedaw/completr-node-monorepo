# Rewind anual

**Released:** 2026-10-28

## Summary

Rewind es el resumen anual de un usuario al estilo Spotify Wrapped o Steam Replay: qué terminó, qué dejó, qué empezó y los destacados del año. Lo calcula el módulo nuevo `rewind` de la API a partir de las runs fechadas del backlog, con funciones puras que reciben "hoy" como parámetro para poder probar la ventana sin depender del reloj. Un usuario tiene Rewind desde el año en que se registró, solo para años con datos, y el año en curso se abre el 1 de diciembre. Del 1 de diciembre al 31 de enero el perfil muestra el Rewind del año como sección destacada; fuera de esa ventana queda una fila con los años anteriores. La visibilidad tiene su propia sección de privacidad, `rewindVisibility`, heredada del backlog en las cuentas existentes, y quien no es el dueño ve el Rewind calculado solo con runs públicas. La web suma la página de detalle, el archivo de años y un lenguaje visual propio: año con degradado y odómetro, una persona que resume el año, tonos por bloque y revelado escalonado que respeta `prefers-reduced-motion`.

## Highlights

- `GET /users/:username/rewinds` y `GET /users/:username/rewinds/:year`, con auth opcional y la privacidad de `profile` y `rewind`.
- Persona del año (`trophy-hunter`, `marathoner`, `short-and-sweet`, `finisher`, `genre-explorer`, `picky-player`, `steady-player`), elegida por la primera regla que se cumple en ese orden.
- Detalle `/user/:username/rewind/:year` con hero, tally, highlights en bento y línea de tiempo por mes; archivo `/user/:username/rewind`.
- Sección destacada en el perfil durante la ventana y fila compacta de años fuera de ella.

## Added

- Migración `20261028173504-add-rewindvisibility-to-users.js`: columna `"rewindVisibility" "enum_Users_visibility" NOT NULL DEFAULT 'public'`, inicializada con `"backlogVisibility"`. Sección `rewind` en `VISIBILITY_SECTIONS` y `access.rewind` en el perfil.
- Módulo `apps/api/src/rewind/`: service, controller, routes, serializer, errores en tres capas (`REWIND_NOT_FOUND` 404) y cálculos puros en `utils/` (totales, finish rate, nota promedio, géneros y plataformas jugados, top 3 de géneros y plataformas, mejor nota, mejor ratio personal, más largo y más corto, primero y último del año, mes con más terminados, racha de meses y persona).
- Consultas nuevas en otros módulos: `findDatedRunsByUserId` en backlog, `countPlatinumsByUserIdAndYear` en game-platinum y `findGenresByGameIds` en game-genre.
- Variable `REWIND_TODAY` (fecha ISO) que reemplaza "hoy" en el Rewind fuera de producción, para probar la ventana antes de diciembre.
- Contrato compartido `rewind.interface.ts` en la API y `rewind.model.ts` en la web.
- Web: feature `rewind` con `RewindService`, páginas de detalle y archivo, y los componentes `RewindTally`, `RewindHighlights`, `RewindFinishedGames`, `RewindShareActions`, `RewindYearCard`, `RewindMoreYears`, `RewindYearOdometer` y `RewindPersonaRank`; helpers `rewind-persona`, `rewind-tone`, `rewind-motion` y la directiva `appRewindReveal`.
- Perfil: `ProfileRewindSpotlight` y `ProfileRewinds`; opción "Rewind" en Settings › Privacy.
- Bruno: `docs/api/rewind/` con los dos endpoints, y `rewindVisibility` en `update-me.yml` y `get-by-username.yml`.

## Changed

- `ExportService` expone `saveFile` para descargar un `Blob` en memoria (lo usa la descarga de la imagen del Rewind).
- Las portadas de un año se deduplican por imagen y priorizan los juegos con portada, para no repetir arte cuando dos juegos del catálogo comparten `coverUrl`.

## Fixed

- El tally oculta Started y Platinums cuando valen 0, el bento no deja huecos en ninguna combinación de tarjetas y el texto secundario del Rewind usa `fg-secondary` para cumplir 4.5:1.

## Migration

- Correr `npm run migrate:prod` (y `npm run migrate:dev` en local) para agregar `rewindVisibility`. Sin la columna, cargar un usuario falla.

## Files of interest

- `apps/api/src/rewind/rewind.service.ts`
- `apps/api/src/rewind/utils/build-rewind.util.ts`
- `apps/api/src/rewind/utils/choose-rewind-persona.util.ts`
- `apps/api/src/rewind/rewind.interface.ts`
- `apps/web/src/app/features/rewind/rewind-detail/rewind-detail.ts`
- `apps/web/src/app/features/public-profile/components/profile-rewind-spotlight.ts`
- `docs/invariants.md`

## Commits

- `4e2bcc2b` — feat: add rewind contract types and service signatures
- `193e35c7` — feat(api): add rewind visibility section inherited from the backlog
- `f8849875` — feat(api): add dated runs, genres by game and yearly platinum count queries
- `02368e31` — feat(api): serve yearly rewinds with pure calculations and viewer privacy
- `460b355b` — test(api): cover rewind calculations, window boundaries and endpoints
- `d0f43cbe` — docs(api): document rewind endpoints and rewind visibility
- `5398a1fb` — docs: document rewind rules, window and visibility
- `fa5893ef` — feat(web): add rewind privacy section
- `9bcf4fc8` — refactor(web): expose export service file saving for in-memory blobs
- `12f267de` — feat(web): add rewind detail and archive pages with share image actions
- `187dcf24` — feat(web): show rewind spotlight and past rewinds on the public profile
- `f484f345` — docs: document rewind web components and share image flow
- `df5a4338` — fix(api): skip repeated cover art and prefer games with covers in rewinds
- `e6f5b79e` — fix(web): hide zero started and platinum rows in the rewind tally
- `f88de1da` — fix(web): fill the rewind highlights grid and pair small cards on mobile
- `289e1639` — feat(web): show finished games as a compact monthly timeline
- `4494b35d` — feat(web): place the rewind share preview beside the results on desktop
- `a0fce68c` — fix(web): raise rewind secondary text to accessible contrast
- `112d91c5` — feat: extend rewind contract with persona, rates, streak and top lists
- `2f0d913d` — feat(api): add rewind_today override for the rewind date outside production
- `f40907a8` — feat(rewind): limit years to sign-up and add persona, rates, streak and top lists
- `10b5125b` — test(rewind): cover sign-up years, rewind_today and the new rewind fields
- `8885b1fa` — docs(rewind): document sign-up years, persona and the new rewind fields
- `9a4c0238` — feat(web): add persona to rewind year summaries
- `484a4f06` — feat(web): add rewind persona copy, colour tones and reveal motion
- `b4a900c4` — feat(web): add rewind year odometer and persona rank
- `20d0fd4a` — feat(web): colour the rewind tally and add finish rate and average rating
- `3c7b7a2f` — feat(web): redesign rewind highlights with colour cards, firsts, streak and podiums
- `3d96a651` — feat(web): roll the year and show the persona in the rewind hero
- `f300b847` — feat(web): show persona and year colour on rewind year cards
- `674add44` — feat(web): colour the profile rewind spotlight and open its cover fan on view
- `cf569885` — docs(web): document rewind colour tones and motion
