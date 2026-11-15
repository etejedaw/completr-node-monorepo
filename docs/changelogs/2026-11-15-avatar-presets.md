# Avatares solo de la lista de presets

**Released:** 2026-11-15

## Summary

El avatar de un usuario solo puede ser uno de los 15 presets que ofrece la web, o ninguno. La API aceptaba cualquier texto en producción y, después de la auditoría, cualquier URL `http(s)`: una imagen alojada en un servidor ajeno la pediría el navegador de cada persona que ve el perfil, el feed o una reseña. Además, la vista previa del perfil volvía a mostrar la inicial al quitar el avatar, que antes quedaba como un círculo vacío.

## Fixed

- `AvatarUrlSchema` acepta solo las rutas de `AVATAR_PRESET_PATHS` (`common/constants/avatar.constants.ts`, de `/avatars/completr_profile_01.png` a `_15.png`); una URL externa o un preset fuera de rango responde 422 `COMMON_SCHEMA_INVALID`. `PATCH /users/me` sigue aceptando `null`.
- `UiAvatar` se vuelve a montar cuando cambia `src`. Al pasar de una foto cargada a ninguna, el estado de `ngpAvatar` quedaba en `loaded` y la inicial seguía oculta (`display: none`), así que la vista previa de Settings → Profile mostraba solo el fondo.

## Changed

- Documentación: `docs/rules.md` documenta que el avatar es un preset o ninguno, con su razón y dónde vive la lista; Bruno actualiza `users/update-me.yml` y `auth/register.yml`.

## Migration

- `20261115165429-clear-non-preset-avatars-in-users.js` pone en `NULL` todo `avatarUrl` que no sea un preset válido; esas cuentas pasan a mostrar su inicial. El `down` no restaura nada, porque los valores borrados no se conservan.

## Commits

- `9898d077` — fix(api): accept only the preset avatars and clear any other stored avatar
- `2a973993` — test(api): reject external and out of range avatars
- `d1863193` — fix(ui): show the avatar initial again when its photo is removed
- `091f9c27` — docs: document preset only avatars and reword the initial avatar release note
