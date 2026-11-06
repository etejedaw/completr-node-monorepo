# Reglas

Reglas que el sistema hace cumplir y cuyo porqué no se ve leyendo el código. Cada entrada dice la regla y la razón, y está pensada para quien va a escribir un endpoint, una tabla o un job nuevo y tiene que respetarla sin saber que existe.

Lo que se entiende leyendo el código no va acá: nombres y valores de enums, columnas, rangos de un schema, el status de cada código de error, parámetros de un endpoint o el valor de un límite. La fuente es el código y, para el contrato HTTP, [`api/`](./api/). Las decisiones de producto (cuánto obtiene cada plan, qué significa cada estado para el usuario) son planificación de producto y no se documentan en este repo.

---

## Reglas generales

- **Todo orden desempata por `id`.** Un listado ordenado por un campo que puede repetirse (fecha, posición, nombre) agrega `id` en la misma dirección. Sin desempate, dos filas con el mismo valor cambian de orden entre consultas y la paginación repite o salta filas.
- **La visibilidad se filtra en la consulta, no después.** Un listado que oculta filas que quien pide no puede ver lo hace en el `WHERE`, así que `limit`, `total` y la paginación cuentan solo lo visible. Filtrar en memoria dejaría páginas cortas y un `total` que revela cuántas filas ocultas hay.
- **Lo que no se puede ver responde como lo que no existe.** Un recurso ajeno que quien pide no puede ver (una lista privada por la sección de perfil, una promoción que aún no empezó) responde el mismo 404 que uno inexistente. Un 403 confirmaría que existe.
- **Las activities se registran después del commit y solo si algo cambió.** Así un rollback no deja en el feed algo que no pasó, y repetir una operación sin efecto (mismo status, juego ya favorito) no genera ruido.
- **Perder premium nunca borra datos.** Sobre el tope del plan free, lo existente se sigue sirviendo y se puede borrar; solo se bloquea crear o editar (estado `frozen`). El contenido premium ya generado (Rewind) sigue visible.
- **Los jobs, colas y throttles en memoria suponen una sola instancia de la API.** Con varias réplicas habría que mover ese estado a algo compartido: el turnero de IGDB, el throttle de los scrapers, la cola de enriquecimiento al importar y la recuperación de jobs al arrancar dejarían de ser correctos.

---

## Privacidad

- **`notes` del backlog y `email` nunca salen en una respuesta pública**, sea cual sea la visibilidad del dueño. Un endpoint nuevo que reutilice un serializer tiene que comprobarlo.
- **No se revela lo que una sección oculta por un camino lateral.** Sin acceso a la sección `platinum`, el backlog público devuelve `platinum: null` en cada run e ignora el filtro `platinumed_only`, que si no diría qué juegos están platinados. La queue pública numera `position` sobre lo visible, para que los huecos no delaten runs privadas.
- **Una sección de privacidad nueva hereda el nivel de la que hasta entonces la exponía.** `platinumVisibility`, `franchiseVisibility` y `rewindVisibility` se inicializaron en las cuentas existentes con su `backlogVisibility`, porque antes esos datos solo se veían a través del backlog. Arrancar en `public` habría publicado lo que el usuario tenía oculto.
- **Nadie más que el dueño ve el origen de su premium.** Las respuestas públicas calculan `hasPremium` solo con premium completo (rol o concesión `*`): un regalo de una feature no lo activa, y ninguna respuesta pública expone la feature regalada ni su vencimiento. El `premiumAccess` del Rewind llega solo al dueño, así nadie ve si está en una prueba ni hasta cuándo.

---

## Concurrencia

- **Canjear una promoción frente a editarla o revocarla.** El canje lee la promoción con `FOR SHARE` (compatible entre canjes) y la edición y la revocación con `FOR UPDATE`. El canje comprueba las fechas con la hora posterior al bloqueo, así que uno concurrente con una revocación falla o deja un grant ya vencido, nunca uno vigente. El índice único por usuario y oferta resuelve dos canjes simultáneos del mismo usuario.
- **Generar un Rewind.** El cliente manda el `generatedAt` que conoce (`expectedGeneratedAt`); si no coincide, responde 409 sin gastar nada. Los contadores se cambian con la fila bloqueada y la primera generación se apoya en el índice único, así que de dos POST simultáneos gana exactamente uno. La IA nunca se llama dentro de la transacción, para no retener el bloqueo durante una llamada de segundos.
- **El resumen con IA solo se guarda si sigue siendo el pedido vigente**: la fila tiene que seguir `pending` con el mismo `aiRecapRequestedAt`. Una respuesta lenta de una generación anterior no pisa la de una más nueva.
- **La queue se reordena por movimiento, no reenviando la lista.** `PATCH .../position` mueve una entrada dentro de la queue completa del servidor, porque el cliente puede tener entradas ocultas por búsqueda o paginación y perderlas. `PUT` reemplaza la queue entera y solo vale cuando el cliente envía el orden completo.
- **Los jobs interrumpidos se marcan fallidos al arrancar.** Antes de escuchar, `failInterruptedJobs` pasa a `failed` todo job `pending` o `running`: un reinicio o un deploy lo mató, y si no quedaría activo para siempre y bloquearía nuevos jobs de su tipo, porque `startJob` devuelve el que ya está activo.

---

## Grants y promociones premium

- **Revocar no borra.** Revocar pone `expiresAt` en el instante actual y conserva la fila. Una concesión vencida o revocada es historial de solo lectura: para devolver el acceso se crea una nueva, así el historial dice qué acceso tuvo el usuario y cuándo.
- **Las ofertas canjeables salen solo de `PremiumPromotions`**, que se crean desde Admin. No hay ofertas fijas en código ni migraciones que siembren acceso: una prueba de un mes también es una promoción.
- **El tipo de acceso del Rewind se guarda con el contenido.** `premiumAccessKind` (`gift` o `premium`) se fija al escribir el `aiRecap` o las `premiumStats`, porque el distintivo tiene que seguir siendo correcto cuando el regalo vence y el acceso del dueño ya no se puede resolver.

---

## Scores y duraciones

- **Tres copias del mismo dato, a propósito.** `GameScore` / `GameTime` son el catálogo global; `GameShelf` es la copia editable del usuario y decide el ratio de su backlog; `ListItem` congela el valor de la fuente declarada por la lista al agregar el juego. Así lo que ven los seguidores de una lista no cambia cuando cambia el catálogo, hasta que el dueño la refresca, y lo que el usuario ajusta en su estantería no altera el catálogo.
- **Un fallo de una fuente externa nunca borra ni pisa un valor guardado.** `not_found`, `ambiguous`, `no_data` y `failed` dejan todo como estaba, y una fuente puede actualizarse aunque otra falle.
- **El borrado físico de un juego comprueba el uso con consultas explícitas**, no con el `ON DELETE` de las FKs. Una tabla nueva con datos de usuario que apunte a `Games` tiene que sumarse a esa comprobación (`GAME_IN_USE`); si no, el juego se borra y la cascada se lleva sus filas.
- **En un split, la etiqueta es lo único que distingue a las variantes** que comparten external id en la búsqueda, la ficha y el backlog. Por eso dos etiquetas iguales (sin distinguir mayúsculas ni espacios) o en blanco se rechazan: si no, un usuario podría registrar su run en la variante equivocada y afectar su ratio y el progreso de sus listas.

---

## Datos externos

- **El refresco individual tiene un plazo de 45 s** (`EXTERNAL_DATA_REFRESH_DEADLINE_MS`), por debajo del `proxy_read_timeout` de 60 s del nginx de producción y de los 100 s de Cloudflare. Sin plazo, un refresco que espera detrás del job o de la cola y suma reintentos pasa de 60 s: el proxy corta y el cliente ve un error genérico mientras el servidor sigue trabajando. Al vencer, lo no terminado queda `EXTERNAL_DATA_DEADLINE_EXCEEDED`, la respuesta lleva lo que sí terminó y ninguna respuesta tardía se escribe.
- **IGDB admite 4 requests por segundo.** Todas sus requests (refresco individual, job y cola de importación) pasan por un mismo turnero que deja al menos 275 ms entre una y otra. El provider no limita la frecuencia por sí mismo: quien lo llama tiene que pasar por el turnero.
- **El job `populate_external_data` distingue fallos del juego de fallos de la fuente.** Ante `not_found`, `ambiguous` o `no_data` sigue con el siguiente. Ante un error que afectaría a todos los juegos (rate limit, bloqueo, una página que cambió de estructura, credenciales de IGDB que faltan o no sirven) se detiene, porque fallaría igual con todos los juegos que quedan. Un error de Wikidata no detiene el job: pausa la búsqueda de ids de HLTB por el resto de la corrida, y los juegos que ya tienen id siguen.
- **Los intentos fallidos se recuerdan por juego y fuente** (`ExternalDataAttempts`) para que el job no vuelva a consultar enseguida un juego que la fuente no conoce. Solo se registran los resultados que dependen del juego: un rate limit, un bloqueo o un error de credenciales no dice nada del juego y no lo pone en espera. El refresco individual ignora la espera.
- **El enriquecimiento al importar vive en memoria** y se pierde al reiniciar la API. No hace falta persistirlo: lo que quedó pendiente lo recupera el job `populate_external_data`.

---

## Rewind

- **Las cifras se calculan en vivo, con la privacidad de quien mira.** Lo que se guarda en `Rewinds` es la activación de cada año, el idioma y la parte premium. Por eso un año que solo tiene runs privadas no existe para un visitante aunque esté generado, e `includesPrivateRuns` cambia solo la entrada de la IA y de las estadísticas premium, nunca las cifras en vivo.
- **Nadie más que el dueño ve un año hasta que este lo genera.** El dueño decide qué se publica y en qué idioma.
- **Los datos importados no cuentan como actividad del año.** Los años anteriores al registro de la cuenta no existen (son historial importado). Las runs agregadas por mes excluyen el primer día de la biblioteca, que suele ser la importación inicial y llenaría el gráfico de "agregados" de golpe. En la entrada de la IA, `daysInBacklog` es `null` si la run se agregó después de empezarla, porque entonces `createdAt` no dice cuánto esperó, y los cierres del 1 de enero sin `startedAt` quedan fuera de los patrones.
- **Las notas solo llegan a la IA.** Con `includesNotes`, la consulta trae `notes` para armar el prompt, pero no cambian las cifras ni las `premiumStats` y ninguna respuesta las devuelve. Si la IA falla, el log registra el id, el año, el código del error y los motivos de validación de zod, nunca el texto del modelo.
- **La IA recibe cálculos, no datos crudos para que calcule.** Comparaciones, ritmos y patrones los calcula el código (`build-rewind-recap-content.util.ts`) y el modelo solo los interpreta; un cálculo nuevo se agrega ahí, no se le pide al prompt.

---

## Export y datos personales

- **CSV sin inyección de fórmulas.** Un texto que empieza con `=`, `+`, `-`, `@`, tab o CR se prefija con `'`: una hoja de cálculo lo ejecutaría como fórmula al abrir el archivo.
- **El export de datos personales nunca incluye secretos**: ni el hash de la contraseña, ni el token de las sesiones, ni tokens de un solo uso. Un `find*ForDataExport` nuevo tiene que respetarlo.
- **`POST /auth/forgot-password` no revela si una cuenta existe.** Responde siempre 204 y envía el correo en segundo plano, así que ni el status ni el tiempo de respuesta dicen si el email está registrado.

---

## Borrado de cuenta

Borrar una cuenta (desde Admin o al completar una solicitud de borrado de datos) es físico y definitivo, a diferencia de desactivarla.

- **Toda tabla con datos de un usuario lleva `ON DELETE CASCADE` desde `Users`**, o `SET NULL` si la fila tiene que sobrevivir anónima. Sin `ON DELETE`, el borrado falla con `23503` y la API responde 500.
- **Las actividades ajenas que apuntan a la cuenta se borran a mano.** La cascada de `ActivityUsers.targetUserId` solo borraría la fila intermedia y dejaría en el feed de otros una actividad sin objetivo, así que `deleteAccount()` las borra explícitamente en la misma transacción.
- **Lo que es registro sobrevive sin autor.** `AuditLogs.userId`, `DataRequests.userId` y `resolvedById`, y `UserInvitations.invitedById` usan `SET NULL`: la auditoría y las solicitudes resueltas se conservan aunque la cuenta ya no exista. Una cuenta admin no se puede borrar, así que solo moderadores o cuentas degradadas dejan entradas sin autor.

---

## Rate limiting

- **La clave del límite es la IP real del cliente**, resuelta por `resolveClientIp`. Primero toma el peer: `x-real-ip` si es válida o, si no, la IP del socket. Solo si ese peer está en los rangos de Cloudflare se confía en `cf-connecting-ip`; así quien se conecta directo al servidor no puede cambiar de clave inventando esa cabecera. `x-forwarded-for` no se usa.
- **`x-real-ip` es confiable porque la API solo se alcanza a través de un proxy que la pisa**: el nginx de CapRover la escribe con `$remote_addr` y el nginx de la web, que hace proxy de `/share/`, reenvía la que recibió. Si la API se expone sin ese proxy, un cliente podría elegir su clave.
- **Los rangos de Cloudflare están copiados a mano** en `cloudflare-ip-ranges.config.ts` desde https://www.cloudflare.com/ips-v4 y https://www.cloudflare.com/ips-v6, y no se actualizan solos. Si Cloudflare suma un rango, el tráfico que llegue desde él queda agrupado por la IP del edge hasta que se actualice el archivo.
