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

### [FB-004] Admin game editor muestra exito falso al alcanzar rate limit

- **Fecha:** 2026-04-18
- **Severidad:** alto
- **Estado:** medio
- **Descripcion:** Al editar un juego en el panel admin de games, si el usuario alcanza el rate limit del backend (429 Too Many Requests), el frontend muestra feedback como si el guardado hubiera sido exitoso, pero en realidad no se guardo nada. El usuario cree que sus cambios se aplicaron cuando no fue asi. Esto puede pasar al hacer varias ediciones seguidas o al hacer fetch de RAWG repetidamente.
- **Solucion propuesta:** Manejar el error HTTP 429 en el frontend del admin game editor. Mostrar un mensaje claro al usuario indicando que alcanzo el limite de requests (ej: "Rate limit reached, try again in a moment"). Asegurarse de que el flujo de guardado no muestre confirmacion de exito si el request fallo por cualquier motivo, incluyendo rate limit.

### [FB-005] Admin game editor no permite borrar un score agregado por error

- **Fecha:** 2026-04-18
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Al editar un juego en el panel admin, si el usuario agrega un valor en scores o durations por error y guarda, al volver a editar el juego e intentar borrar ese registro (dejarlo vacio o eliminarlo), el cambio no se persiste al guardar. El score o duration agregado por error queda permanente y no se puede eliminar desde el editor. Probablemente afecta tanto a scores como a durations ya que usan el mismo patron de guardado.
- **Solucion propuesta:** Revisar el flujo de guardado del admin game editor para que soporte eliminacion de scores y durations existentes. Verificar si el PATCH /games/:id acepta enviar un score/duration con valor null o sin el registro para que el backend lo elimine. Si el backend no soporta borrar scores/durations desde el PATCH, considerar agregar endpoints DELETE o aceptar valores vacios como señal de borrado.

### [FB-006] Rate limit demasiado bajo para uso normal

- **Fecha:** 2026-04-18
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** Varios usuarios reportan que les salta el rate limit durante uso normal de la app. Como administrador tambien se alcanza el limite rapidamente al editar juegos o navegar entre vistas. Los limites actuales parecen estar calibrados demasiado bajos para el flujo real de uso, especialmente en sesiones activas donde se hacen varias acciones seguidas (editar, buscar, navegar).
- **Solucion propuesta:** Revisar los limites configurados en rate-limiter-flexible y aumentarlos. Evaluar si admin/moderator deberian tener limites mas altos o estar exentos del rate limit. Considerar diferenciar limites por tipo de endpoint (lectura vs escritura) si no se hace ya.

### [FB-007] Actividad de wishlist no muestra el nombre del juego

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Cuando un usuario agrega un juego a su wishlist, la actividad en el feed muestra solo "Pricila Badilla wants to play" sin indicar que juego. Falta el nombre del juego en el mensaje, dejando la actividad sin contexto util para quien la lee.
- **Solucion propuesta:** Revisar el serializer o la creacion de la actividad de wishlist para asegurar que incluya el target del juego (game name). Verificar si el problema es que no se esta guardando el target en el modelo Activity o si el serializer no lo esta resolviendo al armar el mensaje del feed.

### [FB-008] Recent activity muestra slug en vez de accion legible y omite nombre del juego

- **Fecha:** 2026-04-19
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** En la seccion "Recent Activity" del perfil de un usuario, algunas actividades muestran el slug crudo del tipo de accion (ej: "backlog_not_started") en vez de un texto legible (ej: "wants to play" o "added to backlog"). Ademas, en esas mismas entradas no aparece el nombre del juego, quedando la actividad sin contexto. Otras entradas si muestran correctamente "added to backlog Stray", lo que sugiere que el problema es inconsistente y depende del tipo de actividad o de como se creo el registro.
- **Solucion propuesta:** Revisar el frontend para asegurar que todos los tipos de actividad (backlog_not_started, backlog_playing, backlog_completed, backlog_abandoned, wishlist_added, etc.) se mapean a textos legibles y no se muestran como slugs crudos. Tambien verificar que el target (juego) se este resolviendo correctamente en el serializer del backend para todos los tipos de actividad.

### [FB-009] No hay forma de saber cuando alguien te sigue

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Cuando un usuario A sigue a un usuario B, el usuario B no tiene ninguna forma de enterarse. El sistema de notificaciones esta planeado para Fase 4 y no es prioridad ahora, pero mientras tanto los usuarios no tienen visibilidad de nuevos seguidores.
- **Solucion propuesta:** Como solucion temporal antes del sistema de notificaciones, registrar una actividad en el feed del usuario B cuando alguien lo sigue (ej: "Usuario A started following you"). Esto reutiliza la infraestructura de Activity que ya existe sin necesidad de implementar notificaciones completas.
