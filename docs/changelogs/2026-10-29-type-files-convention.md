# Tipos en archivos de tipos

**Released:** 2026-10-29

## Summary

Había interfaces y tipos declarados dentro de services, controllers, utils, templates, serializers y componentes, en 45 archivos de la API y 133 de la web. Ningún doc lo prohibía: `docs/architecture.md` solo ubicaba los tipos compartidos de `common/interfaces/` y los contratos de los providers, y la anatomía de un módulo en `docs/context/modules.md` no tenía archivo de tipos. El cambio es un refactor sin efecto en el comportamiento: mueve cada declaración a un archivo de tipos, ajusta los imports y deja la regla escrita.

## Highlights

- API: `*.interface.ts` contiene solo `interface`, `*.types.ts` solo alias `type` y las constantes que vivían en un `*.interface.ts` pasan al `<módulo>.constants.ts` con su tipo derivado al lado.
- Web: lo compartido sigue en `core/models/`, y el resto de las `interface` y los alias de objeto va en un `<archivo>.model.ts` junto a quien lo usa (319 tipos en 133 archivos nuevos).
- La regla queda en `docs/context/modules.md` (anatomía del módulo), `docs/context/frontend.md`, `docs/context/conventions.md` y una línea en `docs/architecture.md`.

## Changed

- `rewind.service.ts` deja de declarar `RewindViewerContext`, `RecapRequest`, `RecapSources` y `RecapContent`. Pasan a `rewind-record.interface.ts` y `rewind-generation.interface.ts`, y las entradas de los utils del Rewind a `rewind-build.interface.ts`.
- `REWIND_PERSONA_CODES`, `REWIND_LANGUAGES`, `REWIND_INSIGHT_KINDS` y `REWIND_AI_RECAP_STATES` pasan de `rewind.interface.ts` a `rewind.constants.ts`, y `RewindImageFormat` a `rewind-share.constants.ts`.
- `common/`:
    - errores en `common/errors/errors.interface.ts`;
    - interfaces compartidas en `common/interfaces/`;
    - alias en `common/types/`. `export-format.interface.ts` y `export-row.interface.ts` pasan a ser `.types.ts`.
- Archivos de tipos nuevos por módulo en la API: backlog, coop-runs, franchises, game-genre, game-platinum, games, ia, list-items, lists, queue, rewind-recap, rewind-share, user-follow-requests y users.
- Web: `features/public-profile/services/types.ts` pasa a `types.model.ts`.

## Migration

- Al agregar tipos nuevos en la API, una `interface` va en `<módulo>.interface.ts` o `<módulo>-<tema>.interface.ts` y un alias `type`, en `<módulo>.types.ts`. Excepciones: tipos derivados de una constante (`(typeof X)[number]`), `z.infer` junto a su schema, DTOs, lo que un modelo Sequelize necesita para su clase y los `.d.ts`.
- En la web, un tipo local va en el `.model.ts` hermano del archivo que lo usa; los specs pueden declarar tipos de prueba.

## Files of interest

- `docs/context/modules.md`
- `docs/context/frontend.md`
- `apps/api/src/rewind/rewind-generation.interface.ts`
- `apps/api/src/rewind/rewind.constants.ts`

## Commits

- `6c48b30d` — refactor(api): move interfaces and type aliases into dedicated interface and types files
- `4b06cb64` — docs(api): document interface and types files in module anatomy
- `7d098611` — refactor(web): move interfaces and object types into model files
- `46e7189d` — docs(frontend): document where model types live
