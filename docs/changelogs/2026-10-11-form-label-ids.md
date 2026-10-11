# Labels de formularios asociados a sus campos

**Released:** 2026-10-11

## Summary

`UiInput` y `UiTextarea` envuelven las primitivas `NgpInput` y `NgpTextarea` de `ng-primitives`, pero no les pasaban el input `id`. La primitiva generaba entonces un id propio (`ngp-input-0`, `ngp-textarea-3`) y pisaba el que declaraba el template. Así, ningún `<label for="...">` con estos componentes apuntaba a su campo: hacer clic en el label no enfocaba el input y los lectores de pantalla no los asociaban. Afectaba a todos los formularios de la app (login, registro, modal del backlog, settings, etc.).

## Fixed

- `UiInput` y `UiTextarea` declaran `id` entre los inputs de su `hostDirectives`, igual que `UiSelect`. El id del template llega a la primitiva y los labels quedan asociados.

## Files of interest

- `apps/web/src/app/shared/ui/input/ui-input.ts`
- `apps/web/src/app/shared/ui/textarea/ui-textarea.ts`

## Commits

- `cce1bd0e` — fix(ui): forward id to input and textarea primitives
