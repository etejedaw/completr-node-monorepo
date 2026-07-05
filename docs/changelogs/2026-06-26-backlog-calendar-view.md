# Vista de calendario del backlog

**Released:** 2026-06-26

## Summary

Nueva tercera vista de My Games, a la derecha de Diary y Hardcore: un calendario mensual que muestra cada juego como una barra que abarca su rango `startedAt → finishedAt` (estilo "Calendario" de NocoDB), apilando los solapados por lanes. Está construida sobre el date-picker headless de ng-primitives (`NgpDatePicker`) para la grilla, navegación y accesibilidad; las barras de evento se renderizan encima. El calendario consulta su propia data por mes (filtro de solape `active_from/active_to` del backend) respetando los filtros activos, en vez de depender de las entradas paginadas de la lista.

## Highlights

- Calendario mensual con barras que abarcan el rango de juego, apiladas por lanes; tope de 3 por día con "+N more".
- Fetch por mes con los filtros activos; navegación ‹ › + Today, etiqueta de mes, hoy resaltado, días de otros meses atenuados.
- Modal del día desde "+N more" con todas las entradas; click en una abre el modal de edición.
- Leyenda clicable para mostrar/ocultar estados (toggle local, sin refetch).
- Avisos contextuales: juegos sin fecha ("View in Diary") y truncado del mes (más de 100 entradas).
- Responsive: en móvil, puntos compactos de color por día; tap abre el modal del día. Fin de semana con tinte sutil.

## Added

- `BacklogCalendar` (`features/backlog/backlog-calendar/`): componente standalone OnPush sobre `NgpDatePicker` + `provideDateAdapter(NgpNativeDateAdapter)`, con semana iniciando en lunes.
- Toggle "Calendar" en el selector de vista de `backlog-list`, persistido en `localStorage` (`completr.backlog.viewMode`).
- `active_from`, `active_to` y `undated` en `BacklogFilters`.
- Layout por semana en el componente: asignación de lanes, "+N more", entradas por día (modal), conteo de "sin agendar" y total del mes para el aviso de truncado.

## Changed

- `backlog-list`: extrae `buildBaseFilters()`, guarda los filtros aplicados en `appliedFilters` y se los pasa al calendario; la paginación se oculta en la vista de calendario.

## Files of interest

- `src/app/features/backlog/backlog-calendar/backlog-calendar.{ts,html}`
- `src/app/features/backlog/backlog-list/backlog-list.{ts,html}`
- `src/app/features/backlog/backlog.ts` — `BacklogFilters`

## Commits

- `d4e896f2` — feat(backlog): add calendar view with per-month entry fetching
- `15a3c091` — feat(backlog): show unscheduled count notice in calendar view
- `583de654` — feat(backlog): warn when a calendar month exceeds the fetch limit
- `e6eb8d3f` — feat(backlog): open a day detail modal from the calendar +N more
- `a4112ebc` — feat(backlog): toggle statuses from the calendar legend
- `0ec4b828` — feat(backlog): show compact day dots on mobile in calendar
- `e1b741d7` — feat(backlog): tint weekend cells in the calendar
