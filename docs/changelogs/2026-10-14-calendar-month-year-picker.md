# Selector de mes y año en los calendarios

**Released:** 2026-10-14

## Summary

`MonthCalendar` gana un selector para saltar directo a un mes y un año, en vez de avanzar mes a mes. My Games y My Shelf le pasan el año más antiguo de sus entradas, así el rango de años empieza donde empiezan tus datos. Es solo frontend.

## Highlights

- Saltar a cualquier mes y año desde el encabezado del calendario.
- El rango de años parte en la entrada más antigua de cada vista.

## Added

- `MonthYearPicker` (`shared/components/month-calendar/month-year-picker`), con pruebas unitarias en `month-year-picker.spec.ts`.
- `backlog-calendar` calcula el año más antiguo entre las fechas de las entradas; `game-shelf-calendar`, el de la fecha de adquisición.

## Changed

- `MonthCalendar` integra el selector en su encabezado y acepta el año mínimo.

## Files of interest

- `apps/web/src/app/shared/components/month-calendar/`
- `apps/web/src/app/features/backlog/backlog-calendar/backlog-calendar.ts`
- `apps/web/src/app/features/game-shelf/game-shelf-calendar/game-shelf-calendar.ts`

## Commits

- `8eff7b9c` — feat(web): add month and year picker to month calendar
- `ef37b846` — feat(backlog): pass earliest entry year to calendar picker
- `faaafa6a` — feat(game-shelf): pass earliest acquired year to calendar picker
