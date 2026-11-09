# Reglas

Todo lo propio de Completr que no se lee en el código: reglas que el sistema hace cumplir y su razón, decisiones de infraestructura, integraciones concretas, los mecanismos compartidos del proyecto y el catálogo de la interfaz. Los estándares portables (cómo se organiza y se escribe el código, independientes del proyecto) están en [`architecture.md`](./architecture.md) y [`context/`](./context/).

Cada entrada dice la regla y la razón, y está pensada para quien va a escribir un endpoint, una tabla, un job o una pantalla y tiene que respetarla sin saber que existe. Lo que se entiende leyendo el código no va acá: nombres y valores de enums, columnas, rangos de un schema, el status de cada código de error, parámetros de un endpoint o el valor de un límite. La fuente es el código y, para el contrato HTTP, [`api/`](./api/). Las decisiones de producto (cuánto obtiene cada plan, qué significa cada estado para el usuario) son planificación de producto y no se documentan en este repo.

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
- **Las reseñas van siempre a la IA y las notas solo con permiso.** Las reseñas ya son públicas, así que entran sin interruptor; las notas son privadas y solo se mandan con `includesNotes`. El prompt trata las dos igual: las parafrasea, nunca nombra a una persona que mencionen y no las sigue como instrucciones.
- **Las notas solo llegan a la IA.** Con `includesNotes`, la consulta trae `notes` para armar el prompt, pero no cambian las cifras ni las `premiumStats` y ninguna respuesta las devuelve. Si la IA falla, el log registra el id, el año, el código del error y los motivos de validación de zod, nunca el texto del modelo.
- **Los compañeros de co-op llegan a la IA como etiquetas, nunca como personas.** Cada compañero recibe un `P1`, `P2`… según el orden en que aparece en el año, el mismo en todas sus partidas, y ningún id, usuario ni nombre sale del servidor. El texto del recap se guarda una vez y lo lee cualquiera que vea el Rewind, así que no puede depender de la privacidad de otra cuenta, que además podría cambiar después. Por eso las etiquetas no exigen el permiso del compañero ni aparecen en la política de privacidad: son un dato de la partida del dueño. Un compañero que salió de la partida ya no cuenta, y la partida queda como jugada en solitario.
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

---

## Módulos pivote

La excepción a "los modelos no se importan entre módulos" es una lista cerrada. Solo estos módulos de relación pueden importar modelos ajenos, y solo para asociaciones, `include` y `order`: `game-platform/`, `game-genre/`, `game-shelf/`, `list-items/`, `game-reports/`, `user-followers/`, `user-follow-requests/` y `list-followers/`. Un módulo nuevo que lo necesite se suma acá.

---

## Mecanismos compartidos del backend

Lo transversal ya resuelto en `common/` o en un módulo dueño, que no se reimplementa:

- **Búsqueda de texto:** todo param `search` pasa por `common/utils/text-search.util.ts` (sin acentos ni signos, palabras en cualquier orden, orden por relevancia). Ningún service arma su propio `ILIKE`, para que todas las búsquedas se comporten igual.
- **Acciones masivas:** `buildBulkActionQuerySchema`, `validateBulkBodyMiddleware` y `BulkIdsSchema`, con la respuesta `{ action, succeeded, skipped }`.
- **Exportaciones:** `exportFormatNegotiationMiddleware`, `exportFormatAccessMiddleware` y `serializeCsv()`; las columnas de cada recurso viven en su `*.export-row.mapper.ts`.
- **Acceso premium:** los gates consultan `resolvePremiumAccess(user, feature)`, nunca el rol, para que el rol y una concesión temporal den el mismo acceso.
- **Providers con modelo inyectable:** `ia/` (`IaProvider` con `DeepseekModel`) y `mail/` (`MailProvider` con `NodemailerModel`, o `InMemoryMailModel` en tests).
- **Export de datos personales:** un módulo que guarda datos de un usuario expone `find<Recurso>ForDataExport(userId)` y lo suma a `collectPersonalData()` (`data-requests/services/personal-data-export.service.ts`) y a su serializer, para que el export siga completo.

---

## Infraestructura y despliegue

- **Despliegue en CapRover detrás de Cloudflare.** Cada app tiene un `captain-definition-<app>` en la raíz del repo.
- **Los logs de producción de la API se escriben en `/usr/app/logs`, montado como volumen** desde la configuración de la app en CapRover, para que sobrevivan a los deploys. La salida estándar es lo que muestra el visor de logs de CapRover.
- **Las imágenes para compartir del Rewind se dibujan en el servidor** (`rewind-share/`, story 1080×1920 y og 1200×630) con satori y resvg. Las plantillas son objetos `{ type, props }` sin JSX y solo admiten flexbox, porque es lo que entiende satori. Las fuentes son los `.woff` estáticos de `@fontsource`, porque satori no lee woff2 ni fuentes variables, y resvg corre con `loadSystemFonts: false` para que el resultado no dependa del sistema. La caché es un LRU en memoria con el hash del JSON del Rewind en la clave; una imagen con portadas que no se pudieron descargar no se guarda, para no dejar fija una versión incompleta.

---

## Integraciones externas

- **Ningún scraper busca, porque el `robots.txt` lo prohíbe:** HowLongToBeat prohíbe `/api` (lo que usa su buscador) y Metacritic `/search`. Solo se piden páginas de detalle con un id de HLTB o un slug de Metacritic ya conocidos.
- **El id de HowLongToBeat se descubre con Wikidata**, porque el buscador de HLTB está vedado. Wikidata publica bajo CC0, admite tráfico automatizado que se identifique y tiene el slug de RAWG (P9968), el id de HLTB (P2816) y la fecha de publicación (P577); en el catálogo, `Game.code` funciona como slug de RAWG.
- **Wikidata tiene su propio cliente HTTP, con throttle más corto (1 s) y un `Retry-After` de hasta 10 minutos en fondo.** Es una API de consultas, no un sitio leído por scraping, así que no espera a la cola de HLTB ni de Metacritic. Wikidata a veces pide esperas de varios minutos aunque se le hayan hecho pocas consultas, y con el tope genérico de 60 s el job fallaba sin reintentar.
- **El throttle de los scrapers (5 s más jitter) es una precaución propia**, no un límite publicado por los sitios.
- **Los scrapers se identifican como `CompletrBot/1.0 (+https://www.completr.app)`.**
- **Ante un 401 de IGDB, el token solo se invalida si sigue siendo el que falló**, para que un 401 tardío no tire uno ya renovado; se reintenta una sola vez.
- **La IA (DeepSeek) reintenta la salida JSON inválida porque DeepSeek respeta la estructura, los obligatorios y los `enum`, pero no `maxLength`.** No se usa `client.responses.parse` del SDK: valida dentro del SDK y deja `null` en una respuesta incompleta, y así no se distinguiría un JSON roto del modelo de un cuerpo HTTP roto.
- **El proveedor de IA está nombrado en la política de privacidad** (`apps/landing/src/content/legal/`, secciones "Where your data goes", "Transfers outside Chile" y "Automated decisions") y en el aviso del diálogo de generación del Rewind. Cambiar de proveedor, de país o de datos enviados exige actualizar ambas versiones de la política y ese aviso en el mismo cambio.

---

## Frontend (web)

### Infraestructura de la web

- **`/share/*` se sirve bajo el dominio de la web y el nginx de la web hace proxy a la API.** La página de vista previa y las imágenes del Rewind se comparten como enlaces del dominio de la web. En producción el `location ^~ /share/` de `nginx.conf` reenvía a la API; la URL interna sale de la variable de entorno `API_UPSTREAM` (con esquema, sin ruta; por defecto `https://api.completr.app`), que la imagen de nginx sustituye en `/etc/nginx/templates/default.conf.template` al arrancar. En local `ng serve` usa `proxy.conf.json`, que manda `/share` a `http://localhost:3002`.
- **En producción `API_UPSTREAM` apunta al contenedor interno de la API** (`http://srv-captain--<app-de-la-api>:<puerto>`). Con el valor por defecto el pedido vuelve a salir por Cloudflare, que reemplaza `cf-connecting-ip` por la IP del propio servidor, y todas las visitas a `/share/` comparten un solo cupo de rate limit.
- **El proxy de `/share/` reenvía `X-Real-IP` tal como lo escribió el nginx de CapRover (`$http_x_real_ip`) en lugar de pisarlo.** La API lo usa para decidir si confía en `cf-connecting-ip` (ver [Rate limiting](#rate-limiting)).
- **`ngsw-config.json` excluye `/share/**` de `navigationUrls`.** Si no, el service worker respondería esos enlaces con el `index.html`.
- **El `postbuild` estampa el service worker con `scripts/stamp-service-worker.mjs`.** Un service worker usa la CSP que venía con su script al instalarse, y el navegador solo lo reinstala si `ngsw-worker.js` cambia byte a byte. Angular genera ese archivo idéntico en cada build mientras no cambie su versión, así que un cambio en `security-headers.conf` no llegaría a los clientes que ya tienen el worker. El script agrega al final `self.completrBuildFingerprint = "<hash>";`, con un hash del worker, de `ngsw.json`, de `security-headers.conf` y de `nginx.conf`: cambia cuando cambia la app o los headers y es estable si no cambia nada. `ngsw.json` no incluye el worker en su tabla de hashes, así que modificarlo después del build no rompe la verificación.
- **Al detectar un worker nuevo, `app.ts` lo activa y recarga la página.** Escucha `VERSION_READY` de `SwUpdate` y revisa si hay actualización cada 5 minutos y cada vez que la ventana recupera el foco.
- **What's new (`GET /changelog`) y Privacy (`GET /privacy`) muestran contenido que vive en la landing y que la API reexpone** (ver [Landing](#landing)). Para cambiar esos textos no se toca `apps/web`.
- **El login de la API tiene rate limit estricto (`authLimiter` en `apps/api/src/common/config/rate-limiter.config.ts`).** Los scripts de verificación visual inician sesión una sola vez y recorren los viewports en la misma sesión.
- **Las portadas de RAWG se piden a 420 de ancho como mínimo (`CoverUrlPipe` acepta 420, 640 y 1280).** `media.rawg.io` solo tiene generados de antemano esos tres tamaños; cualquier otro puede redirigir con 307 a `api.rawg.io`, que lo genera al vuelo, es inestable y por eso también está en la CSP. `GamePoster` cae a la URL original si la imagen falla y, si tampoco carga, al degradado con el título.

### Producto en la interfaz

- **El dorado (`premium`) marca el premium completo efectivo, venga del rol o de una concesión temporal; el platino (`admin`) queda para el rol Admin.** Anillos e insignias salen de `avatarRing` y `elevatedRoleBadge` (`core/utils/`). Así la interfaz no mezcla cuenta de pago con rol de administración.
- **`premium` se reserva a Premium: insignias, listones, contadores de tope y `toast.premium`.** El amarillo no se usa fuera de Premium, para que el dorado siga significando algo.
- **`admin` es el platino del rol Admin: insignia de rol (`bg-admin-metal text-admin`), anillo y halo del avatar, y sección Admin del menú.** No se usa en ninguna otra parte. `nav-admin` apunta a `admin`.
- **`platinum` es el trofeo de platino de un juego (`PlatinumTrophy` y título de la ficha).** Es un cian hielo que en cada tema se mantiene distinto de `admin`, `premium`, `playing` y `brand`, para que ningún par se confunda.
- **`rating` es igual a `brand` y `playing` es distinto de `brand` en cada tema.** Las notas se leen como acento de marca; el estado Playing tiene que distinguirse de él.
- **Una vista que depende de una feature premium consulta `AuthService.hasPremiumFeature(feature)`, no `isPremium`.** Así un regalo de esa feature la desbloquea sin dar premium completo.
- **Los regalos premium se canjean con `GiftOfferCard` dentro de la sección de su feature, nunca en un modal.** Angular no decide elegibilidad ni duración: lo dice la API (`GET /users/me/gift-offers`).
- **`toast.premium` se llama solo desde el interceptor de errores y desde `UiPremiumBadge`.** Los 402 (topes del plan free) los avisa `errorInterceptor`; las pantallas no repiten ese toast y consultan `isToastedByErrorInterceptor(status)`.
- **El Rewind es la única página bilingüe de la app.** Se muestra en `rewind.language` para todos los que la ven; los textos viven en `REWIND_COPY`, tipado como `Record<RewindLanguage, RewindCopy>` para que una clave que falte en un idioma no compile, y fechas y números salen de `Intl`.
- **El Rewind tiene su paleta propia con tokens existentes (`rewind-tone.ts`).** El dorado se reserva al marco de las secciones premium. Todo su movimiento se apaga con `prefers-reduced-motion` y nada queda en bucle.
- **Selección masiva solo en las tablas Hardcore propias (My Games, My Shelf, Platinums), solo con la casilla.** El clic en la fila sigue abriendo el editor. Los predicados de elegibilidad son funciones puras compartidas con la tabla y la tarjeta del Diary (`shared/utils/backlog-eligibility.ts`), no se reescriben por página.
- **La ventana de Undo es una sola para toda la app (`UNDO_WINDOW_MS`, 5 segundos) y no se configura por pantalla.** Una ventana distinta por pantalla haría impredecible cuánto tiempo hay para deshacer.

### Búsqueda contextual

- **En el shell autenticado hay una sola barra de búsqueda: la superior es a la vez la global y el filtro de la página.** Una página que filtra su lista monta `app-page-search` (con `scopeLabel`, el nombre de la sección tal como lo ve el usuario) en vez de `ui-search-bar`; la página sigue siendo dueña de su estado (señal, debounce, query params) y el componente solo reenvía. Dos buscadores a la vez confunden cuál filtra qué.
- **`Layout` provee `PageSearchScope` (no es `root`): hay un alcance a la vez y gana el último registrado.** Fuera del `Layout` (visitante, specs con `TestBed`) `app-page-search` dibuja el `ui-search-bar` de siempre.
- **Los buscadores dentro de un diálogo, una hoja o un paso de "agregar" usan `ui-search-bar`, no `app-page-search`.** No filtran la página. Las páginas sin lista que filtrar (Feed, ficha de un juego) tampoco montan `app-page-search`.

### Ubicación de controles en hero y barra

- **En `[heroActions]` van las acciones que crean o cambian datos (Add game, Create list, Track saga, New view, Reorder, Surprise me): como máximo una primaria y una secundaria, y el resto en un `ActionMenu` `⋯` (`placement="hero"`, `iconOnly`).** El lugar de un control lo decide si cambia datos o solo la vista.
- **Si varias acciones del mismo tipo compiten por ser la primaria, van juntas en un `ActionMenu` con `variant="primary"`** (Run job en Admin → Jobs).
- **Refresh solo recarga la vista.** Va al final de la barra si la vista tiene una y, si no, como botón de ícono en el hero (Admin → Jobs, Promotions y Reports), para no crear una barra vacía. El "Add game" de admin en Browse va arriba de la barra, junto al título o bajo el carrusel.
- **La ficha de un juego sigue la misma regla en `GameLibraryActions`.** La acción primaria es My Games (o la última run), la secundaria Favorite, y Up Next, Want to Get, My Shelf y Lists van en un `ActionMenu` "More library actions" (`size="lg"`) cuyos ítems muestran dónde ya está el juego ("In Up Next", "On My Shelf", "In 2 lists") con el color de la sección (`iconClass`).
- **En Feed, el selector "Show" va en `LibraryToolbar`, alineado con el ancho del feed.** Debajo del título van las pestañas de alcance (estados, plataformas, Created / Following).
- **En la barra va lo que solo cambia cómo se ve la lista, siempre en este orden: búsqueda, vista guardada, filtros, orden, modo de vista, Export.**

### Reutilización entre vista propia y pública

- **Si una vista pública reutiliza la propia, el cambio en un componente compartido llega solo a las dos, pero la estructura de página puede seguir duplicada.** Al cambiar una, se revisan ambas.

| Dato                      | Vista dueña                                 | Componentes                                                   | La reutilizan                                                                                                                                           |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entradas de la biblioteca | My Games (Diary y Hardcore)                 | `BacklogEntryCard`, `BacklogTable`, `BacklogStatusPills`      | Biblioteca pública (`user-backlog`), con `readonly`                                                                                                     |
| Colecciones de portadas   | My Shelf, Want to Get, Favorites            | `LibraryPage`, `CoverGrid`, `GameCoverCard`, `LibraryToolbar` | `ProfileCollectionPage` (`/user/:u/favorites`, `/wishlist`, `/game-shelf`)                                                                              |
| Up Next                   | `/queue`                                    | `QueueBrowser`, `QueueRow`, `QueueNextCard`                   | `/user/:u/queue` y el carrusel del perfil, con `readonly`                                                                                               |
| Listas                    | `/lists` y el detalle                       | `ListCard`, `ListItemRow`, `ProgressMeter`                    | Browse, la sección Lists del perfil y `/user/:u/lists` (`UserLists`, pestañas Created / Following con `?tab=following`)                                 |
| Sagas                     | `/franchises` (Discover)                    | `FranchiseCard`                                               | Ninguna por ahora; el detalle `/franchises/:code` usa `CoverGrid`                                                                                       |
| Reseñas                   | Reseñas del juego                           | `ReviewCard`, `RatingDistribution`                            | Sección Reviews del perfil y `/user/:u/reviews`                                                                                                         |
| Fechas en un mes          | Calendarios de My Games y My Shelf          | `MonthCalendar`                                               | Cualquier vista nueva con fechas                                                                                                                        |
| Encabezado de página      | Todas las páginas de biblioteca             | `LibraryHero`                                                 | Feed, Help, What's new, About, perfil público                                                                                                           |
| Selección masiva          | Hardcore de My Games, My Shelf y Platinums  | `injectRowSelection`, `BulkActionBar`, `SelectionCell`        | Ninguna: la biblioteca pública y toda tabla `readonly` o no `selectable` no muestran casillas                                                           |
| Rewind anual              | `/user/:u/rewind/:year` y `/user/:u/rewind` | `RewindYearCard`, `RewindShareActions`, `RewindTally`         | Perfil: `ProfileRewindSpotlight` (del 1 de diciembre al 31 de enero) y `ProfileRewinds` (fila compacta fuera de esa ventana), ambas con `access.rewind` |

### Catálogo de componentes compartidos

Antes de crear uno nuevo, se reutiliza uno de estos. Los inputs están en el código; acá va para qué sirve cada uno y su regla de uso.

- **`UiDialog`, `UiBottomSheet`, `UiDrawer` (`shared/ui/`):** `UiDialog` es el único diálogo de la app (hoja inferior en mobile, modal en escritorio); no se usan `ngpDialog` ni overlays propios. `UiDrawer` es el cajón lateral de escritorio. Los tres comparten los tonos de `shared/ui/tone/ui-tone.ts`.
- **`uiButton`, `uiIconButton`:** botones. Se usa una variante (`glass` sobre un héroe, `link` dentro de una frase, `premium` solo en acciones premium) en vez de pisar estilos con clases.
- **`UiBadge`, `UiCountBadge`, `BacklogStatusBadge`:** insignias de estado, rol y contadores. No se arman pastillas a mano.
- **`ChipGroup` / `button[appFilterChip]`:** chips de filtro; también los usan `PlatformFilter` y `BacklogStatusPills`. No se arman pastillas de filtro a mano.
- **`OptionPicker`:** elegir una opción; menú en escritorio, hoja inferior en mobile.
- **`BacklogStatusPicker`:** cambia el estado de una entrada del backlog. Maneja su propio apilamiento: las vistas no le ponen `z-*`.
- **`ActionMenu`:** agrupa acciones (menú en escritorio, hoja en mobile), también el ⋮ por fila. Un ítem de navegación usa `link`, no `router.navigate` en `selected`.
- **`UiSearchBar`, `app-page-search`:** búsqueda. Las vistas no le cambian alto ni tipografía, solo layout (ver "Búsqueda contextual").
- **`UiFiltersButton`, `FilterSection`, `RangeInputs`:** botón Filters de las barras, grupo de un panel de filtros y par mínimo / máximo.
- **`UiTable`, `SelectionCell`, `BulkActionBar`:** tablas (Admin, Hardcore, My Shelf, Platinums), selección por casilla y barra de acciones masivas. No se pisan las cabeceras con `!`.
- **`UiDatePicker`, `UiFieldLabel`, `UiFieldError`:** fechas, etiquetas y errores de formulario.
- **`UiAlert`:** aviso en línea. Para confirmaciones con botones se usa un diálogo.
- **`UiEyebrow`:** títulos de sección y etiquetas que no son de un campo.
- **`UiEmptyState`, `UiNoMatches`, `UiPlainEmptyState`:** estado vacío ilustrado, "sin resultados" y vacío plano.
- **`UiCheckbox`, `SegmentedControl`, `ViewModeToggle`:** casilla, control segmentado y selector de vista.
- **`UiAvatar`, `UiPremiumBadge`, `AppLogo`:** avatar con anillo según el premium efectivo, listón Premium y marca.
- **`ui-skeleton`:** esqueleto de carga; el tamaño se da en el host (`class="h-16 w-24 rounded-md"`).
- **`LibraryHero`, `LibraryToolbar`, `LibraryPage`:** encabezado, barra fija y cuerpo de las páginas de biblioteca y colección.
- **`GamePoster`:** portada 2:3 con fallback generativo. Se usa siempre en vez de un `<img>` de portada.
- **`CoverGrid`, `GameCoverCard`, `PosterShelf`:** grillas y carruseles de portadas.
- **`BacklogEntryCard`, `BacklogTable`, `BacklogStatusPills`:** tarjeta del Diary, tabla Hardcore y filtro por estado.
- **`QueueBrowser`:** cuerpo de Up Next, propio y público.
- **`MonthCalendar`:** calendario mensual de cualquier vista con fechas.
- **`RatioSummary`, `StarRating`, `RatingDistribution`:** ratio estimado frente al personal (el componente para mostrarlo), estrellas y distribución de notas.
- **`ProgressMeter`, `ListCard`, `ReviewCard`, `FranchiseCard`:** progreso, tarjetas de lista, reseña y saga.
- **`GameSearchStep`, `SelectedGameRow`:** paso de búsqueda del catálogo dentro de un diálogo.
- **`PlatformFilter`:** pastillas de plataforma con contador (My Shelf, Want to Get).
- **`ExpandableText`:** texto con "Read more" que solo aparece si el texto se corta.
- **`UnfollowConfirmDialog`, `DialogDeleteAction`, `ActivityDeleteButton`:** confirmar "Unfollow", borrar desde el pie de un diálogo de edición y borrar una actividad propia.
- **`ExportActions`:** botón "Export" (CSV / JSON) de una colección propia; descarga lo mismo que muestra la vista.
- **`GiftOfferCard`:** canje de un regalo premium dentro de la sección de su feature.
- **`ProfileBackdrop`, `ProfileCollectionPage`:** fondo del hero del perfil y página de colección pública.
- **`PageToc`, `InfoPageLinks`, `AttributionFooter`:** índice de páginas largas, pie de páginas informativas y pie de atribución.
- **`ErrorPage`:** base de `/403`, `/404` y la ruta comodín.
- **`StatsCard`, `CompletionsChart`, `StatusBreakdown`:** stats de una vista guardada.
- **`RewindYearCard`, `RewindShareActions`, `RewindTally`, `RewindPersonaRank`, `RewindAiRecap`, `RewindPremiumStats`:** piezas del Rewind anual.
- **`injectRowSelection`, `injectBulkRunner`, `injectBulkRemoval`:** selección de filas (se reinicia sola cuando cambian los ids) y ejecución de lotes masivos con borrado con Undo.
- **`injectBodyPortal()`:** mueve un overlay a `body` (un `fixed` dentro de una barra con `backdrop-blur` queda anclado a la barra).
- **`injectGameSearch()`, `injectBacklogQuickAdd()`, `injectFollowActions()`, `injectFranchiseTracking()`, `injectLibraryPosters()`:** búsqueda del catálogo con debounce; agregar a My Games o editar la entrada existente desde cualquier grilla; Follow / Unfollow con confirmación; Track / Tracking de una saga; portadas recientes para el `LibraryHero` de páginas que no cargan juegos.
- **`ExportService`, `injectExportDownload()`:** toda descarga de archivos pasa por ellos. `ExportService` pide el formato por el header `Accept`, toma el nombre de `Content-Disposition` y descarga con un `<a download>` temporal; un `Blob` en memoria usa `ExportService.saveFile`.
- **`ViewportService`, `PointerService`:** `isMobile` (menos de 768px) e `isCoarse` como señales.
- **`appInView`, `appSwipeActions`:** intersección con el viewport; deslizar en mobile.
- **`password-policy.ts`:** requisitos de contraseña con la política real de la API.
- **`pickCalendarDate` (`shared/ui/date-picker/ui-date-picker.testing.ts`):** en specs, elige una fecha como un usuario.

### Tests

- **`errorInterceptor` guarda `isRefreshing` a nivel de módulo.** Todo test que dispare un 401 debe terminar el refresh (`next` + `complete`, o `error`) para no contaminar al siguiente.

---

## Landing

- **El changelog público mezcla dos idiomas por entrada: `tag`, `title` y `highlights` en inglés (como la UI de la app) y `landing.pitch` en español (como la landing).** Los `highlights` solo se ven en la app y el `pitch` solo en la landing, porque la API reexpone `/changelog.json` en `GET /changelog` y `apps/web` lo muestra en "What's new".
- **El changelog público (`src/content/releases/`) es distinto de `docs/changelogs/`, que es técnico y referencia commits.** El nombre de cada entrada sigue `YYYY-MM-DD-NN-<slug>.md` y `order` desempata las del mismo día.
- **La API lee el changelog de `CHANGELOG_SOURCE_URL`** (por defecto `http://localhost:4321/changelog.json`, la landing en desarrollo; en producción `https://www.completr.app/changelog.json`) y guarda la respuesta 5 minutos; se reinicia para ver al instante una entrada nueva. Si la landing no está corriendo, `GET /changelog` responde 503.
- **`/changelog.json` y `/privacy.json` se sirven con `Access-Control-Allow-Origin: *`.** Otros orígenes (la web, la API) tienen que poder leerlos.
- **La política de privacidad vive solo en la landing (`src/content/legal/`: `privacy-es.md` y `privacy-en.md`), y la web la muestra vía la API.** La versión en español se publica en `/privacy` y la inglesa solo como `/privacy.json`. La API la reexpone en `GET /privacy` (variable `PRIVACY_SOURCE_URL`, por defecto `http://localhost:4321/privacy.json`; en producción `https://www.completr.app/privacy.json`) con la misma caché de 5 minutos.
- **La política se edita en los dos archivos a la vez, con la misma `version`, la misma `updated` y los mismos `id` de sección en el mismo orden.** Los enlaces directos como `/privacy#cookies` tienen que apuntar a la misma sección en la landing y en la app.
- **`cookie` está declarado en `apps/landing/package.json` aunque el código no lo importa.** El bundle de prerender de Astro lo resuelve desde `apps/landing`, y sin esa declaración npm deja en la raíz el `cookie@0.x` de Express, que no tiene los exports que Astro espera. Quitarlo rompe el build de la landing.
