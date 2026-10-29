# Flujo del backlog del Rewind sin la importación inicial

**Released:** 2026-10-29

## Summary

En las estadísticas premium del Rewind, "¿Tu backlog creció o se achicó?" contaba como agregadas todas las entradas creadas en cada mes, incluida la importación de la colección al empezar a usar Completr. En un caso real eso daba 544 agregados en abril (516 del mismo día) y un balance anual de +590, contra unos 74 reales. Ahora `countRunsAddedByMonth` deja fuera las entradas creadas el primer día de la biblioteca, el día de la entrada más antigua del usuario (UTC). El criterio no depende de la fecha de registro de la cuenta. Las estadísticas se guardan al generar, así que un Rewind ya generado lo muestra corregido al regenerarlo.

## Fixed

- `backlogService.countRunsAddedByMonth` excluye el primer día de la biblioteca. Test de integración con una importación, un agregado posterior en el mismo mes y otro en julio.

## Commits

- `d4a6d4f6` — fix(backlog): leave the library's first day out of the runs added per month
- `a810a07c` — docs(api): document that the backlog flow skips the initial import day
