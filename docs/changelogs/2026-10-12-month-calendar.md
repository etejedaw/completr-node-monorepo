# Calendario mensual compartido

**Released:** 2026-10-12

## Summary

El calendario del backlog y el de My Shelf compartían una implementación casi idéntica. Se extrae un componente `MonthCalendar` en `shared/components` y ambas vistas lo consumen. Es solo frontend y el comportamiento no cambia.

## Added

- `shared/components/month-calendar`: grilla mensual reutilizable.

## Changed

- `backlog-calendar` usa `MonthCalendar`.
- `game-shelf-calendar` usa `MonthCalendar`.

## Files of interest

- `apps/web/src/app/shared/components/month-calendar/`
- `apps/web/src/app/features/backlog/backlog-calendar/`
- `apps/web/src/app/features/game-shelf/game-shelf-calendar/`

## Commits

- `ed1788b9` — feat(shared): add month calendar component
- `426f7980` — refactor(web): use shared month calendar in backlog calendar
- `a4fc7fb6` — refactor(web): use shared month calendar in game shelf calendar
