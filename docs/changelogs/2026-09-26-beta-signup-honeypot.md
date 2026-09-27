# Honeypot del formulario de beta validado en el servidor

**Released:** 2026-09-26

## Summary

El formulario de inscripción a la beta de la landing tiene un campo oculto `website` como honeypot, pero solo se revisaba en el navegador: si venía lleno, el script cortaba el envío. Un bot que hace el `POST` directo al endpoint se saltaba ese chequeo, porque la URL está en el HTML. Ahora el formulario manda el campo en el body y el servicio que recibe la inscripción decide qué hacer con él.

## Changed

- `BetaSignupForm.astro` envía `{ email, website }` en vez de `{ email }`. Una persona lo manda vacío.
- El script ya no corta el envío cuando el honeypot viene lleno. Con cualquier respuesta `ok` redirige a `/gracias`, así un bot no distingue si lo descartaron.

## Files of interest

- `apps/landing/src/components/BetaSignupForm.astro` — formulario y script de envío.

## Commits

- `9f8f0510` — fix(landing): send beta signup honeypot to the server
