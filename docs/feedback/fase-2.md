# Feedback de usuarios — Fase 2 (MVP Amigos)

> Feedback recopilado de amigos usando la app en produccion (web.completr.app).
> Cada item incluye: descripcion, severidad y solucion propuesta o aplicada.

---

## Convenciones

| Severidad | Significado                               |
| --------- | ----------------------------------------- |
| critico   | Bloquea uso normal, hay que arreglarlo ya |
| alto      | Afecta experiencia pero se puede usar     |
| medio     | Molesto, no urgente                       |
| bajo      | Nice to fix, cosmetico o menor            |

| Estado      | Significado            |
| ----------- | ---------------------- |
| pendiente   | Sin empezar            |
| en progreso | Trabajando en ello     |
| resuelto    | Fix deployado          |
| descartado  | No se va a implementar |

---

## Feedback

<!--
Formato por item:

### [ID] Titulo corto
- **Fecha:** YYYY-MM-DD
- **Severidad:** critico | alto | medio | bajo
- **Estado:** pendiente | en progreso | resuelto | descartado
- **Descripcion:** que paso, como reproducirlo
- **Solucion:** que se hizo o que se planea hacer
-->

### [FB-001] Campos score/duration confusos al crear backlog

- **Fecha:** 2026-04-16
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** Al agregar un juego al backlog, si el juego no tiene score o duration precargados (de Metacritic/HLTB/RAWG), los usuarios no entienden que esos campos son el puntaje promedio de critica y la duracion estimada del juego. Los confunden con su puntaje personal o su tiempo de juego. Esto pasa especialmente con usuarios nuevos que no conocen la app.
- **Solucion propuesta:** Agregar placeholders descriptivos en los inputs (ej: "Metacritic/OpenCritic avg." y "HowLongToBeat estimate (hrs)"). Tambien agregar tooltips o texto de ayuda debajo de los campos explicando que son datos de referencia, no personales. El puntaje personal se registra despues en userRating y el tiempo real en realDuration.

### [FB-002] Login muestra error de schema en vez de "invalid credentials"

- **Fecha:** 2026-04-16
- **Severidad:** alto
- **Estado:** medio
- **Descripcion:** Si un usuario ingresa una password que no cumple las reglas de formato (ej: sin mayuscula, sin numero, muy corta), Zod rechaza el schema antes de que llegue al servicio de login. El usuario ve "Invalid request schema" en la pantalla de login, un mensaje tecnico que no le dice nada. Deberia ver "Invalid email or password". En login no importa si la password cumple reglas o no — solo importa si las credenciales son correctas.
- **Solucion propuesta:** Crear un schema separado para login que solo valide que email y password no estan vacios (sin reglas de formato de password). Las reglas de password (mayuscula, numero, largo minimo, etc.) solo aplican en registro y cambio de password. Alternativa: en el login schema usar z.string().min(1) para password en vez del schema con reglas.

### [FB-003] Login muestra "Invalid request schema" con email sin TLD

- **Fecha:** 2026-04-16
- **Severidad:** alto
- **Estado:** bajo
- **Descripcion:** Si un usuario ingresa un email tipo "name@domain" (sin .com o similar), Zod rechaza el schema y el usuario ve "Invalid request schema". El mensaje no le dice nada util. Deberia mostrar algo como "Email no valido" o "Invalid email format".
- **Solucion propuesta:** Mejorar el manejo de errores de validacion en el frontend para login. En vez de mostrar el mensaje generico del backend ("Invalid request schema"), parsear los errores de Zod y mostrar mensajes especificos por campo (ej: "Email no valido"). Alternativamente, validar formato de email en el frontend antes de enviar el request. Esto aplica a login — en registro ya deberia haber validacion client-side.
