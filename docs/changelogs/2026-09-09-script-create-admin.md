# Script de creacion de administradores

**Released:** 2026-09-09

## Summary

Un despliegue nuevo no tenia forma de crear el primer usuario administrador: el registro publico siempre crea usuarios con rol `user` y no hay endpoint para elevar el rol. Se agrega `scripts/create-admin.ts`, un script de provisionamiento que se ejecuta contra la base ya migrada y deja un admin listo. Para poder compilarlo junto al backend se movio el `rootDir` de TypeScript a la raiz del repo, lo que cambia la ruta del entrypoint en `dist`.

## Highlights

- `npm run create:admin <email> [password]` crea un usuario con rol `admin`.
- Si no se pasa password, el script genera una aleatoria que cumple la politica y la imprime una sola vez en el log.
- El username se deriva del email y se valida con las mismas reglas que el registro (4-15 caracteres).
- `scripts/` pasa a estar versionado, compilado y lintado como el resto del codigo.

## Added

- `scripts/create-admin.ts` — valida argumentos con Zod, hashea la password con `password.service`, crea el usuario via `users.service` y luego actualiza su rol a `admin`. Cierra la conexion de Sequelize al terminar y sale con codigo 1 ante cualquier error.
- La password se valida con `PasswordPolicySchema`, el mismo schema que usan registro, login y cambio de password: 8-15 caracteres con minuscula, mayuscula, digito y caracter especial. La generada arma 11 caracteres aleatorios en base64url y les concatena `Aa1!`, con lo que cae en 15 y cumple los cuatro requisitos por construccion.
- Script `create:admin` en `package.json`, que corre el artefacto compilado (`dist/scripts/create-admin.js`).

## Changed

- `tsconfig.json`: `rootDir` pasa de `./src` a `.` y `include` suma `scripts`, para que el script se compile en el mismo build que el backend.
- `eslint.config.mjs`: se quita `scripts` de los ignores.
- `.gitignore`: se quita `scripts/`, que hasta ahora excluia la carpeta entera del repo.

## Migration

- **La ruta del entrypoint compilado cambio.** Con `rootDir` en la raiz, `dist/app.js` pasa a ser `dist/src/app.js`. El script `start` ya apunta a la ruta nueva, pero cualquier Dockerfile, unidad de systemd, `Procfile` o configuracion de PM2 que invoque `node dist/app.js` directamente debe actualizarse.
- El script asume que las migraciones ya corrieron: ejecutar `npm run migrate` antes de `npm run create:admin`.
- La password generada se muestra una unica vez en la salida del script; no queda recuperable despues.
- Una password pasada a mano tiene que cumplir la politica; si no, el script aborta con el error de Zod antes de tocar la base.

## Files of interest

- `scripts/create-admin.ts` — el script completo.
- `tsconfig.json` — cambio de `rootDir` e `include`.
- `package.json` — scripts `create:admin` y `start`.

## Commits

- `456b2e0` — feat(scripts): add create-admin provisioning script
- `caaa347` — fix(scripts): enforce password policy in create-admin
