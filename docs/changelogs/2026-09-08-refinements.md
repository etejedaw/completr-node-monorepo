# Refinamientos de configuracion y estilo

**Released:** 2026-09-08

## Summary

Ajustes menores e independientes acumulados en esta tanda: limpieza de comentarios para alinear el codigo con la convencion de `docs/context/conventions.md`, una simplificacion en el schema de entorno y dos cambios de instalacion de dependencias. Ninguno altera el comportamiento en runtime.

## Changed

- **Comentarios eliminados donde el codigo ya se explica solo.** `docs/context/conventions.md` establece que no se añaden comentarios salvo casos estrictamente necesarios (regex no trivial, workaround de libreria externa, restriccion legal). Se removieron los que solo repetian el nombre de la constante o la funcion en `jobs.service`, los mappers de RAWG, `score-source.constants`, `decode-html-entities.util`, `users-profile.service`, `auth-optional.middleware` y `.env.example`.
- **`CHANGELOG_SOURCE_URL` usa `z.url()` directo.** En Zod 4 `z.url()` es un schema standalone, asi que el `z.string()` que lo precedia era redundante.
- **`bcrypt` se instala sin ejecutar sus install scripts** (`allowScripts` en `package.json`). Reduce la superficie de ejecucion arbitraria en `npm install`.
- **Lockfile regenerado** para reflejar el arbol de dependencias resuelto.

## Files of interest

- `src/common/config/environment.config.ts` — schema de entorno.
- `package.json` — `allowScripts`.

## Commits

- `503bb6a` — style: drop comments that the code already explains
- `975e631` — refactor(config): use standalone z.url for changelog source url
- `2e7ec11` — chore(pkg): disable bcrypt install scripts
- `7e8ad2a` — chore(deps): refresh lockfile
