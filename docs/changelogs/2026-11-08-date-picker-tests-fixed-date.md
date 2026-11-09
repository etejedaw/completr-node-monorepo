# Fecha fija en los tests que eligen días del calendario

**Released:** 2026-11-08

## Summary

`pickCalendarDate` abre el calendario en el mes actual y avanza mes a mes hasta el día pedido. Los tests que elegían fechas fijas, como marzo de 2026, hacían más clics a medida que pasaba el tiempo. En noviembre, `backlog-modal.platinum.spec.ts` ya superaba el timeout de 5 segundos cuando corría con la suite completa en paralelo. Los tests que eligen días del calendario fijan ahora la fecha del sistema en el mes del día que eligen, con `vi.useFakeTimers({ toFake: ["Date"] })` y `vi.setSystemTime`, como ya hacían otros specs. Así el calendario abre en ese mes y no hay que navegar.

## Fixed

- `backlog-modal.platinum.spec.ts`: "sends dates picked on an empty field as plain days" bajó de unos 2,2 s a 0,46 s y ya no se pasa del timeout en la suite completa.
- `game-shelf-modal.spec.ts`, `platinum-dialog.spec.ts`, `backlog-list.interaction.spec.ts` y `queue-view.interaction.spec.ts`: los tests que eligen un día ya no se vuelven más lentos con cada mes.
- Cada `afterEach` restaura los timers reales con `vi.useRealTimers()`.

## Files of interest

- `apps/web/src/app/shared/ui/date-picker/ui-date-picker.testing.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.platinum.spec.ts`

## Commits

- `f88668f6` — test(web): pin the date in the platinum modal empty-field date test
- `33ba1524` — test(web): pin the date in the remaining calendar date-picking tests
