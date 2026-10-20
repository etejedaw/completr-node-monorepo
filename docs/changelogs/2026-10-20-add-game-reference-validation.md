# Datos de Reference en el modal de añadir juego

**Released:** 2026-10-20

## Summary

El modal de backlog dejaba el botón Add deshabilitado sin decir por qué: la plataforma y los datos de Reference (critic score y duración) son obligatorios, pero Reference vivía en una pestaña que no era la que abría por defecto. Ahora todo lo obligatorio queda fuera de las pestañas, el pie del modal dice qué falta y lleva al campo, y los valores de Reference se validan igual en la web y en la API: critic score con tope de 5 y ambos campos con un máximo de 2 decimales.

## Highlights

- Plataforma y Reference arriba del modal; las pestañas quedan solo para Tracking y Notes.
- Línea "Missing: Platform · Critic score · Duration" junto a Add, con enlaces que hacen scroll al campo y le ponen el foco.
- Critic score mayor a 5 se reemplaza por 5 y los decimales se redondean a 2 al escribir, al venir de una fuente y al cargar una entrada en edición.
- La API responde 422 si `score` o `duration` traen más de 2 decimales.

## Added

- `backlog-modal/components/backlog-reference-fields`: sección Reference con ratio en vivo, chips de fuentes, "Report missing", errores inline y modo colapsado con una línea resumen (fuente, duración y ratio) cuando las fuentes la autocompletan.
- `backlog-modal/reference-values.ts`: helpers puros (`toCriticScore`, `roundReferenceValue`, `correctedTypedValue`, `estimatedRatio`, `pickDefaultDuration`) y constantes `MAX_CRITIC_SCORE` y `MIN_REFERENCE_VALUE`, con su spec.
- `backlog-modal/focus-field.ts`: `scrollIntoViewAndFocus`, compartido por el modal y la sección Reference.
- `OptionPicker`: inputs opcionales `invalid` y `describedBy`, que agregan `aria-invalid`, borde `danger` y `aria-describedby` al disparador sin cambiar los usos existentes.
- API: `backlog/schemas/backlog-reference.schema.ts` (`BacklogScoreSchema`, `BacklogDurationSchema`) y `backlog/utils/has-at-most-two-decimals.util.ts`, con tolerancia de punto flotante para aceptar valores como 0.07 o 4.35.

## Changed

- `backlog-modal`: el botón Add sigue deshabilitado con el formulario inválido, pero los errores aparecen al tocar un campo, al pasar el puntero sobre Add o al pulsar un ítem de "Missing". Se eliminó la rama de `onSubmit` que saltaba a la pestaña Reference.
- `step="0.01"` e `inputmode="decimal"` en critic score y duración.
- `register-backlog.schema.ts` y `update-backlog.schema.ts` usan los schemas compartidos de Reference.
- `docs/invariants.md`, `docs/api/backlog/create.yml`, `docs/api/backlog/update.yml` y `docs/context/frontend.md` documentan las reglas y los inputs nuevos.

## Fixed

- El tope de 5 de critic score no se aplicaba: el handler leía el valor anterior al evento de `FormField`. Ahora lee el valor desde el propio evento.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/features/backlog/backlog-modal/components/backlog-reference-fields.ts`
- `apps/web/src/app/features/backlog/backlog-modal/reference-values.ts`
- `apps/api/src/backlog/schemas/backlog-reference.schema.ts`

## Commits

- `d2ba22f6` — feat(backlog): limit score and duration to 2 decimals
- `7f410694` — docs(backlog): document 2 decimals limit on score and duration
- `695a71f6` — feat(web): add invalid and describedBy inputs to option picker
- `6cca3bd0` — feat(web): move reference out of backlog modal tabs and explain missing fields
- `2b450a79` — test(web): cover backlog reference value helpers
- `533323a3` — docs(web): document option picker invalid and describedBy inputs
