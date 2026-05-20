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
- **Estado:** resuelto
- **Descripcion:** Al agregar un juego al backlog, si el juego no tiene score o duration precargados (de Metacritic/HLTB/RAWG), los usuarios no entienden que esos campos son el puntaje promedio de critica y la duracion estimada del juego. Los confunden con su puntaje personal o su tiempo de juego. Esto pasa especialmente con usuarios nuevos que no conocen la app.
- **Solucion:** Modal rediseñado con dos secciones explicitas: "Reference data" (Critic Score + Duration con placeholders descriptivos y tooltips info clickeables) y "Your tracking" (My Rating + Real Duration + Status + Notes). Ratio computed en vivo visible en el header de Reference data con tooltip explicando la formula. Botón "Report missing" cuando el juego no tiene sources, que crea un GameReport con category `missing_score` o `missing_duration`.

### [FB-002] Login muestra error de schema en vez de "invalid credentials"

- **Fecha:** 2026-04-16
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Si un usuario ingresa una password que no cumple las reglas de formato (ej: sin mayuscula, sin numero, muy corta), Zod rechaza el schema antes de que llegue al servicio de login. El usuario ve "Invalid request schema" en la pantalla de login, un mensaje tecnico que no le dice nada. Deberia ver "Invalid email or password". En login no importa si la password cumple reglas o no — solo importa si las credenciales son correctas.
- **Solucion:** Resuelto en frontend. Quitados los Validators.email y Validators.minLength del form de login (cualquier valor no vacio se envia). El handler de error mapea status 400/401/422 a "Invalid email or password.", y cualquier otro error a "Login failed. Please try again." Backend intacto: el schema sigue siendo el mismo, pero el usuario nunca ve el mensaje tecnico.

### [FB-003] Login muestra "Invalid request schema" con email sin TLD

- **Fecha:** 2026-04-16
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Si un usuario ingresa un email tipo "name@domain" (sin .com o similar), Zod rechaza el schema y el usuario ve "Invalid request schema". El mensaje no le dice nada util. Deberia mostrar algo como "Email no valido" o "Invalid email format".
- **Solucion:** Resuelto junto con FB-002. Cualquier error de validacion (422) o credenciales (401) en login muestra "Invalid email or password." en lugar del mensaje tecnico de Zod.

### [FB-004] Admin game editor muestra exito falso al alcanzar rate limit

- **Fecha:** 2026-04-18
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Al editar un juego en el panel admin de games, si el usuario alcanza el rate limit del backend (429 Too Many Requests), el frontend muestra feedback como si el guardado hubiera sido exitoso, pero en realidad no se guardo nada. El usuario cree que sus cambios se aplicaron cuando no fue asi. Esto puede pasar al hacer varias ediciones seguidas o al hacer fetch de RAWG repetidamente.
- **Solucion:** Manejo explicito de 429 en los tres handlers de error del admin game editor (create, update, save scores/times). Mensaje inline claro "Rate limit reached. Changes were NOT saved. Try again in a moment." que reemplaza al genérico. Toast global de 429 desde el interceptor sigue activo. Toast de éxito agregado solo en el path 2xx.

### [FB-005] Admin game editor no permite borrar un score agregado por error

- **Fecha:** 2026-04-18
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** Al editar un juego en el panel admin, si el usuario agrega un valor en scores o durations por error y guarda, al volver a editar el juego e intentar borrar ese registro (dejarlo vacio o eliminarlo), el cambio no se persiste al guardar. El score o duration agregado por error queda permanente y no se puede eliminar desde el editor. Probablemente afecta tanto a scores como a durations ya que usan el mismo patron de guardado.
- **Solucion:** Agregados endpoints `DELETE /game-scores/:gameId/:source` y `DELETE /game-times/:gameId/:source` (auth moderator, devuelven 204 o 404 si no existe). El admin game editor compara las sources que tenia el juego al cargar contra las sources que quedan al guardar y dispara los DELETEs correspondientes dentro del mismo `forkJoin` del save. La UI ya tenia botones remove en cada entry; ahora la accion se propaga al backend.

### [FB-006] Rate limit demasiado bajo para uso normal

- **Fecha:** 2026-04-18
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Varios usuarios reportan que les salta el rate limit durante uso normal de la app. Como administrador tambien se alcanza el limite rapidamente al editar juegos o navegar entre vistas. Los limites actuales parecen estar calibrados demasiado bajos para el flujo real de uso, especialmente en sesiones activas donde se hacen varias acciones seguidas (editar, buscar, navegar).
- **Solucion:** Subidos `userLimiter` y `publicLimiter` de 50/100 a 300 requests/min cada uno. `authLimiter` y `registerLimiter` se mantienen (anti brute-force). El middleware ahora exenta a `admin` y `moderator` cuando `request.locals.user` está presente; routes de games reordenadas para que `authMiddleware` corra antes del `rateLimiterMiddleware` y la exención tome efecto en los endpoints sensibles del panel admin.

### [FB-007] Actividad de wishlist no muestra el nombre del juego

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** Cuando un usuario agrega un juego a su wishlist, la actividad en el feed muestra solo "Pricila Badilla wants to play" sin indicar que juego. Falta el nombre del juego en el mensaje, dejando la actividad sin contexto util para quien la lee.
- **Solucion:** Dos cambios complementarios: (1) la wishlist nunca registraba actividad — agregado tipo `wishlist_added` y `activityService.record` en `wishlist.controller.postWishlist`, con el `gameId` extraído del Backlog asociado. (2) Las actividades `backlog_not_started` (PATCH de backlog a not_started) tampoco creaban target porque el tipo faltaba en `GAME_TYPES` del activity.service — agregado al enum y a la lista. Ahora ambas actividades incluyen el nombre del juego y link.

### [FB-008] Recent activity muestra slug en vez de accion legible y omite nombre del juego

- **Fecha:** 2026-04-19
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** En la seccion "Recent Activity" del perfil de un usuario, algunas actividades muestran el slug crudo del tipo de accion (ej: "backlog_not_started") en vez de un texto legible (ej: "wants to play" o "added to backlog"). Ademas, en esas mismas entradas no aparece el nombre del juego, quedando la actividad sin contexto. Otras entradas si muestran correctamente "added to backlog Stray", lo que sugiere que el problema es inconsistente y depende del tipo de actividad o de como se creo el registro.
- **Solucion:** Mapping de actividades centralizado en `shared/utils/activity-labels.ts` (label, icon, dotClass) y aplicado desde feed, public-profile y profile-view. Agregado mapeo de `backlog_not_started` y fallback legible "did something" para tipos desconocidos (en lugar del slug crudo). El target del juego ahora se crea correctamente desde el backend (ver FB-007).

### [FB-009] No hay forma de saber cuando alguien te sigue

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** Cuando un usuario A sigue a un usuario B, el usuario B no tiene ninguna forma de enterarse. El sistema de notificaciones esta planeado para Fase 4 y no es prioridad ahora, pero mientras tanto los usuarios no tienen visibilidad de nuevos seguidores.
- **Solucion:** Agregado tipo `user_followed_by` en `ACTIVITY_TYPES` y `USER_TYPES`. Cuando A sigue a B, `user-followers.controller` ahora registra dos actividades: `user_followed` para A (existente) y `user_followed_by` para B con target=A (nueva). B la ve en su feed como "A started following you" con link al perfil de A. Reusa la infra de Activity sin tablas nuevas — solución intermedia hasta el sistema de notificaciones de Fase 4.

### [FB-010] Backlog propio no tiene paginacion y carga demasiados registros

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** El backlog propio (GET /users/me/backlog) carga todos los registros de una vez, lo que se vuelve lento cuando un usuario tiene muchos juegos. El backlog publico de otro usuario ya tiene paginacion con limit/offset (max 50), pero el propio no. Con usuarios que tienen 100+ entradas la tabla se siente pesada.
- **Solucion:** Paginacion aplicada a backlog, game-shelf, wishlist y favorites propios (limit 100). PaginationQuerySchema global subido de max 50 a max 100. Servicios devuelven `{ rows, total }`, controllers exponen `total` en el payload. Frontend: componente compartido `<ui-pagination>` en `shared/ui/pagination/` con botones prev/next, contador "X–Y of N". Aplicado en backlog-list, game-shelf-list, wishlist-view y favorites-view.

### [FB-011] Lists y saved views sin paginacion

- **Fecha:** 2026-04-19
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** Las vistas de listas propias (GET /lists/me) y saved views (GET /users/me/saved-filters) cargan todos los registros sin paginacion. Aunque es poco probable que un usuario tenga muchas entradas (free tiene limite de 5), conviene tener paginacion por consistencia y para usuarios premium con listas ilimitadas.
- **Solucion:** Paginacion con limit 25 aplicada a GET /lists/me y GET /users/me/saved-filters (backend acepta limit/offset, devuelve total). Frontend: `<ui-pagination>` en list-overview y saved-filters-view.

### [FB-012] Notas del backlog visibles en perfil publico de otro usuario

- **Fecha:** 2026-04-19
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** La columna de notas del backlog es visible cuando un usuario ve el perfil o backlog publico de otro usuario. Las notas son personales y pueden contener comentarios privados que el usuario no espera que otros vean.
- **Solucion:** Decisión: las notas son siempre privadas (no hay toggle de público). Agregado `backlogPublicSerializer` que omite `notes`. `getUserBacklog` y `usersController.getProfile` (cuando no es self) usan el serializer público. El frontend ya tenía guard `@if (entry.notes)` así que la columna desaparece automáticamente al venir undefined desde el backend.

### [FB-013] Login no redirige a la URL original despues de autenticarse

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** Si un usuario no logueado accede a una URL protegida (ej: https://web.completr.app/games/chrono-trigger), el authGuard lo redirige al login. Pero al iniciar sesion, lo manda al feed (ruta por defecto) en vez de a la pagina que intento visitar originalmente. Esto obliga al usuario a navegar de nuevo a donde queria ir.
- **Solucion:** `authGuard` ahora redirige a `/login?returnUrl=<URL original>` (state.url). `Login` lee el query param y `navigateByUrl(returnUrl)` tras login exitoso. Se valida que `returnUrl` empiece con `/` y no con `//` para evitar open redirects a dominios externos; fallback a `/backlog`.

### [FB-014] Progreso de listas solo cuenta completados, no abandonados

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** La barra de progreso en listas (getListProgress) solo cuenta backlogs con status "completed". Los juegos abandonados no se contabilizan, pero deberian contar como progreso ya que el usuario ya paso por ese juego (lo jugo y decidio dejarlo).
- **Solucion:** `getListProgress` en `lists.service.ts` ahora cuenta backlogs con status `completed` o `abandoned` usando `Op.in`. Frontend sin cambios: el label "completed/total" sigue siendo válido y los abandoned suman al numerador.

### [FB-015] No existe opcion "PC" generica al agregar juego al backlog o shelf

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** Al agregar un juego al backlog o al game shelf, el selector de plataformas solo muestra las tiendas especificas (Steam, GOG, Epic, etc.) pero no hay una opcion "PC" generica. Hay juegos antiguos que no estan disponibles en ninguna tienda digital (ej: Wolfenstein 2009 que fue removido de venta) y el usuario los tiene como ISOs o copias fisicas de PC. Sin la opcion PC generica no hay forma de registrarlos con la plataforma correcta.
- **Solucion:** Migración `20260519145351-seed-pc-platform` crea la plataforma `pc` (name "PC", abbreviation "PC", manufacturer "Generic"). Backfill: a todo juego con una store PC (Steam/GOG/Epic/EA/Origin/Battle.net) se le agrega también el vínculo a "PC" en GamePlatforms. `rawg-platform.map.ts` ahora incluye `pc` al expandir el slug RAWG `pc`, así juegos nuevos importados quedan con la plataforma genérica además de las tiendas.

### [FB-016] Seccion "Latest Completr Lists" en games-browse sigue mostrando placeholder

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** En la pagina de games (/games), la seccion "Latest Completr Lists" todavia muestra el placeholder "Coming soon..." a pesar de que el sistema de listas ya esta implementado y hay listas creadas. Los usuarios ven una seccion vacia que deberia estar mostrando contenido real.
- **Solucion:** Resuelto en commits posteriores al reporte. `games-browse` tiene dos secciones reales: "Completr Official" (alimentada por `GET /lists/official`, listas creadas por admin) y "Latest Lists" (`GET /lists/recent`, listas públicas de usuarios). Ambas se renderizan solo si hay datos, sin placeholder.

### [FB-017] Flash de placeholders al cargar games-browse

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** Al entrar a la pagina de games (/games), se muestra brevemente el placeholder "Coming soon..." y los textos estaticos antes de que carguen los datos reales (secciones Latest Added, Top Rated, etc.). Se produce un flash visible donde la pagina se ve incompleta por un instante antes de renderizar el contenido.
- **Solucion:** Los placeholders "Coming soon" ya habían sido removidos en commits posteriores; secciones ahora condicionadas con `@if (data.length > 0)`. Agregado `isInitialLoad` signal en `games-browse` que muestra "Loading games..." mientras se carga la primera petición (`loadLatest`). Cuando termina, las secciones reales aparecen sin flash de página vacía.

### [FB-018] No hay forma de reportar bugs generales ni ver estado de reportes

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** diferido
- **Descripcion:** Los usuarios solo pueden reportar errores en juegos (GameReport), pero no tienen forma de reportar bugs generales de la app (ej: un boton que no funciona, un error de UI, una feature rota). Ademas, no pueden ver el estado de los reportes que ya enviaron (ni de juegos ni generales), asi que no saben si su reporte fue recibido, aprobado o rechazado.
- **Decisión (2026-05-19):** Postergado a Fase 3+. La parte de "ver estado de reportes" se cubrirá naturalmente cuando entre el sistema de notificaciones (Fase 4) — admin puede notificar al user cuando se resuelve su reporte. Para reportes generales (no de juegos) sigue pendiente; mientras tanto el flujo actual de GameReport ya cubre el caso más común (datos de juegos).

### [FB-019] Feed de actividad sin paginacion

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** El feed de actividad (GET /feed) carga todas las actividades de una vez. Si un usuario sigue a mucha gente, el feed crece rapidamente y carga demasiada informacion innecesaria. No tiene sentido mostrar todo el historial de actividad de golpe.
- **Solucion:** Paginacion con limit 25 aplicada a GET /feed. `activityService.getFeed` ahora devuelve `{ rows, total }` con findAndCountAll. Frontend: `<ui-pagination>` en feed-page con prev/next.

### [FB-020] Boton de favoritos en game detail poco visible

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** La estrella de favoritos en el banner del game detail no se nota lo suficiente. Los usuarios no se dan cuenta de que desde ahi pueden agregar un juego a favoritos. El icono se pierde sobre la imagen de fondo y no transmite que es interactivo.
- **Solucion:** El botón ahora es más prominente: tamaño 56×56 (antes 44×44), borde visible blanco/40 (warning cuando favorita), fondo más opaco (0.65), sombra externa, ícono más grande con `drop-shadow`, y `star_border` outline cuando no está marcada vs `star` filled cuando sí. El cambio entre outline/filled comunica claramente el estado y hace evidente que es interactivo.

### [FB-021] Flujo de creacion de juego desde RAWG no incluye externalIds en el DTO

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** Cuando se crea un juego via busqueda con fallback a RAWG, el RAWG ID se guarda con una llamada separada a gameExternalService.create() en vez de pasarlo como parte del externalIds del registerGame DTO. Esto es inconsistente con el flujo de PATCH /games/:id que si acepta externalIds. Ademas, no hay forma de agregar el Steam ID u otros sources al momento de crear el juego desde el frontend ni desde el endpoint de busqueda.
- **Solucion propuesta:** Incluir externalIds en el flujo de creacion desde RAWG (pasar rawgId como parte del DTO en vez de llamar a gameExternalService aparte). En el frontend del admin game editor, tanto en creacion como en edicion, agregar campos para IDs externos (RAWG, Steam, etc.) que se envien como externalIds en el body del request.

### [FB-022] Busqueda de juegos demasiado literal

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** La busqueda de juegos es demasiado literal y no tolera variaciones comunes. Por ejemplo, buscar "fear" no encuentra "F.E.A.R." porque el titulo tiene puntos entre las letras. Lo mismo puede pasar con caracteres especiales, acentos, numeros romanos vs arabigos, etc. Esto afecta tanto la busqueda local como la experiencia del usuario al agregar juegos.
- **Solucion propuesta:** Mejorar la busqueda local para que sea mas tolerante: normalizar el query y los titulos removiendo puntos, caracteres especiales y acentos antes de comparar. Considerar usar ILIKE con wildcards o funciones de similitud de PostgreSQL (pg_trgm, unaccent). En RAWG el problema es menor porque su API ya maneja fuzzy matching.

### [FB-023] RAWG agrupa juegos que deberian ser registros separados

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** En RAWG algunos juegos aparecen agrupados como un solo registro cuando en realidad son juegos distintos. Por ejemplo, Pokemon Perla y Pokemon Diamante son dos juegos diferentes, pero en RAWG aparecen como "Pokemon Perla/Diamante" en un solo entry. Esto causa problemas porque en Completr cada juego deberia ser un registro independiente. Ademas, con la regla de unique constraint en GameExternal (un solo externalId por source+game), no se puede mapear el mismo registro de RAWG a dos juegos distintos. Tambien afecta al backlog: si un usuario quiere trackear ambos juegos por separado no puede porque solo existe uno en la DB.
- **Solucion propuesta:** Buscar alternativas para manejar este caso. Opciones a evaluar: (1) permitir crear juegos manualmente sin RAWG y vincularlos como variantes, (2) agregar un campo "variant" o "edition" al juego para diferenciar versiones del mismo registro RAWG, (3) permitir multiples juegos con el mismo externalId de RAWG (relajar el unique constraint), (4) usar otra fuente (IGDB, Steam) como fuente primaria para estos casos.

### [FB-024] Faltan filtros por fuente de datos en el panel admin de games

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** En el panel admin de games no hay filtros para identificar juegos que les faltan datos de fuentes especificas. Por ejemplo, no se puede filtrar para ver juegos que no tienen score de RAWG o Metacritic, ni los que no tienen duracion de HLTB. Esto dificulta la tarea de enriquecer el catalogo ya que no hay forma de saber cuales juegos necesitan datos.
- **Solucion propuesta:** Agregar filtros al panel admin de games (y al endpoint GET /games) para filtrar por ausencia de scores o times de fuentes especificas. Ej: no_scores=rawg,metacritic (juegos sin score de esas fuentes), no_times=hltb (juegos sin duracion HLTB). Esto permite al admin identificar y completar datos faltantes.

### [FB-025] No existe plataforma "Browser" para juegos de navegador

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Hay juegos que son exclusivos de navegador web (ej: DragonFable) y no existe una plataforma "Browser" o "Web" en la lista de plataformas disponibles. Los usuarios no pueden registrar estos juegos con la plataforma correcta porque ninguna de las opciones existentes (Steam, GOG, consolas, etc.) aplica.
- **Solucion propuesta:** Crear la plataforma "Web Browser" via POST /platform con un code como "web-browser" y manufacturer "Web". Tambien actualizar el mapeo de plataformas RAWG (rawg-platform.map.ts) para mapear el slug "web" de RAWG a esta nueva plataforma, de modo que juegos de navegador importados desde RAWG se vinculen automaticamente.

### [FB-026] Campo Edition en Game Shelf deberia ofrecer opciones predefinidas

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** El campo "Edition" en Game Shelf es un cuadro de texto libre. Los usuarios esperan opciones predefinidas porque con texto libre cada persona escribe lo mismo de formas distintas (ej: "estandar", "stander", "ESTANDARD", "Standard"). A mayor escala de usuarios esto genera un millon de variantes para el mismo valor, haciendo el campo inutil para filtrar o agrupar.
- **Solucion:** Solo frontend. En `game-shelf-modal` se agregaron chips de sugerencia debajo del input Edition con los valores canonicos: Standard, Deluxe, GOTY, Collector's, Definitive, Complete, Digital, Physical. Click rellena el input con el valor exacto y resalta el chip activo (`bg-brand/15 border-brand text-brand`). El input sigue aceptando texto libre — los chips son solo una conveniencia. Backend intacto: el campo sigue siendo string sin restriccion.

### [FB-027] Usuarios confunden Wishlist con la wishlist de Steam/tiendas

- **Fecha:** 2026-04-22
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** Los usuarios asocian "Wishlist" con el concepto de tienda (Steam, PSN, etc.): juegos que quieren comprar. La wishlist actual de Completr es una cola priorizada de juegos del backlog que el usuario quiere jugar pronto, un concepto completamente distinto. Esto genera confusion y preguntas como "la wishlist se puede conectar con la API de Steam?". El nombre actual no comunica la funcion real del feature.
- **Solucion propuesta:** Dos cambios: (1) Renombrar la wishlist actual a un nombre que refleje su funcion de cola de juego. Nombre elegido: "Queue". El rename implica cambios en backend (modelo, rutas, serializers, campo isWishlistPublic en User), frontend (componentes, servicios, sidebar, rutas) y documentacion. (2) Crear un nuevo modulo "Wishlist" real que represente juegos que el usuario quiere comprar/obtener. Este nuevo wishlist apuntaria a Game (no a Backlog, porque el usuario aun no tiene el juego). Modelo similar a Favorites: Wishlist(id, user_id, game_id, position, added_at). A futuro podria conectarse con APIs de tiendas (Steam, PSN, eShop) para notificar al usuario cuando un juego de su wishlist este en oferta.

### [FB-028] Boton "Add Game" en backlog se confunde con crear un juego

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** El boton "Add Game" en la vista del backlog confunde a los usuarios porque suena a crear un juego nuevo en el catalogo, no a agregarlo al backlog. Ademas, el boton esta en la pantalla de backlog y no en la de games, lo que refuerza la confusion ("por que Add Game no esta en Games?"). La accion real es agregar un juego existente al backlog del usuario.
- **Solucion:** Renombrado el botón en `backlog-list.html` de "+ Add Game" a "+ Add to Backlog". Por consistencia, el equivalente en `game-shelf-list.html` también se renombró a "+ Add to Shelf".

### [FB-029] Busqueda de juegos no muestra indicador de carga al buscar en RAWG

- **Fecha:** 2026-04-22
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Cuando el usuario busca un juego que no esta en la base de datos local, la busqueda hace fallback a RAWG para traer resultados externos. Durante ese tiempo de espera no hay ningun indicador visual de que la app sigue buscando. El usuario ve los resultados locales y luego el dropdown se queda quieto hasta que de repente se actualiza con los resultados de RAWG. Ejemplo: al buscar "RE9", primero aparecen los otros RE locales, pero al escribir el "9" la lista se queda congelada un rato hasta que RAWG responde. El usuario no sabe si la app se colgo o si esta cargando.
- **Solucion:** Busqueda en dos etapas en los cuatro lugares con fallback a RAWG (backlog-modal, game-shelf-modal, list-detail, games-browse). Frontend: nuevo metodo `gamesService.searchLocal()` que pega a `/games/search?local_only=true`. El observable primero pide local — instantaneo, muestra "Searching..."; si retorna 0 resultados, dispara una segunda llamada al endpoint normal (que cae a RAWG en el backend) y cambia el indicador a "Searching online..." con icono `autorenew` animado en color brand. El global-search del topbar usa `local_only=true` por diseno (no cae a RAWG), por lo que no necesita el indicador. Backend no requirio cambios — el schema ya soportaba `local_only`.

### [FB-030] Resultados de busqueda no distinguen DLCs de juegos base

- **Fecha:** 2026-04-22
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** Cuando el usuario busca un juego en el dropdown (backlog modal, game shelf, etc.), los resultados no diferencian visualmente entre juegos base y DLCs. Si un juego tiene DLCs con nombres similares al base, el usuario puede seleccionar el DLC por error sin darse cuenta.
- **Solucion:** El backend ya exponia `isDlc` en `gameSerializer`. En los tres dropdowns de busqueda de juego (backlog-modal, game-shelf-modal, list-detail) se renderiza un badge `DLC` inline al lado del titulo con estilo `bg-warning/15 text-warning` cuando `game.isDlc` es true. Se probo agregar tambien un toggle "Hide DLCs" pero se descarto por preferencia de UX — solo queda el badge. Backend sin cambios.

### [FB-031] Orden del sidebar no refleja el flujo logico del usuario

- **Fecha:** 2026-04-22
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** El orden actual de las secciones en el sidebar no sigue una progresion logica. Un usuario sugirio reordenar Game Shelf, Backlog y Wishlist para reflejar la relacion del usuario con un juego: "tengo y jugue" (Game Shelf), "tengo y no jugue" (Backlog), "no tengo y quiero" (Wishlist). Este orden cuenta una historia natural de la coleccion del usuario.
- **Solucion:** Sidebar reorganizado en dos grupos con headers sutiles: "My collection" (Backlog → Game Shelf → Wishlist) y "Personal lists" (Favorites → Saved Views → Lists). Sin renombrar Wishlist (FB-027 pendiente). Además, rediseño visual completo: ribbon vertical brand como indicador activo, padding cómodo, sección de perfil integrada al flow (sin card pegada).

### [FB-032] Busqueda de usuarios limitada y sin vista dedicada

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** La busqueda de usuarios solo existe dentro del buscador global del feed y es muy basica (solo busca por username). No hay una vista dedicada para descubrir usuarios. Si alguien quiere encontrar a un amigo pero no sabe su username exacto, no tiene forma de buscarlo por nombre o correo. Tampoco hay forma de descubrir usuarios nuevos de la comunidad.
- **Nota adicional:** Un usuario pregunto "en el feed debo poner su nombre de usuario, no? cual es?" — ni siquiera sabia cual era el username de la persona que queria buscar. Esto refuerza la necesidad de una forma mas accesible de encontrar usuarios y tambien sugiere que el username propio no es lo suficientemente visible en la app para que los usuarios lo compartan facilmente.
- **Solucion propuesta:** Crear una vista dedicada de usuarios (/users o /community) con: (1) seccion de usuarios destacados o aleatorios para descubrir gente nueva, (2) buscador que permita buscar por username, nombre o email. En el backend, ampliar GET /users/search para aceptar busqueda por name ademas de username. No buscar por email directamente por privacidad — en su lugar, permitir busqueda exacta de email (match completo, no parcial) como forma de encontrar a alguien que te compartio su correo.

### [FB-033] Ports con experiencias muy diferentes se tratan como el mismo juego

- **Fecha:** 2026-04-22
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** Algunos ports de juegos son experiencias considerablemente diferentes del original (ej: RE2 en N64 fue una hazaña tecnica con diferencias notables vs la version de PS1, Starcraft en consola es un RTS con control de gamepad). RAWG y otras fuentes tratan estos ports como un solo registro, pero si un usuario hace una review, su experiencia puede ser completamente distinta segun la plataforma en la que jugo. Actualmente las reviews son por juego (unique userId+gameId), no por plataforma. El backlog si permite trackear el mismo juego en distintas plataformas, pero la review y el rating no distinguen en cual se jugo.
- **Solucion propuesta:** No es urgente. A futuro considerar: (1) permitir reviews por plataforma en vez de por juego (o agregar campo plataforma a la review para contextualizar), (2) dentro de la ficha del juego, mostrar una seccion de "versiones" o "ports" que agrupe las plataformas con sus diferencias. Esto no requiere separar el juego en multiples registros — el juego sigue siendo uno, pero las experiencias por plataforma se pueden diferenciar. Relacionado con FB-023 (RAWG agrupa juegos que deberian ser separados).

### [FB-034] Usuarios quieren editar datos de juegos con aprobacion de moderador

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Mantener el catalogo de juegos actualizado (datos faltantes, correcciones, plataformas, scores) es demasiado trabajo para un solo admin o moderador. Algunos usuarios quieren contribuir editando datos de juegos ellos mismos. Actualmente solo admin/moderator pueden editar juegos, asi que los usuarios solo pueden reportar errores (GameReport) y esperar a que alguien los corrija.
- **Solucion propuesta:** Implementar un sistema de ediciones comunitarias con aprobacion. El usuario propone una edicion (titulo, descripcion, plataformas, scores, etc.) que se guarda como solicitud pendiente. Un moderador o admin revisa y aprueba/rechaza la solicitud. Si se aprueba, los cambios se aplican al juego. Modelo tipo GameEditRequest(id, userId, gameId, changes JSONB, status pending/approved/rejected, reviewedBy, createdAt). Vista admin/moderator para revisar solicitudes pendientes con diff de cambios. A futuro, usuarios con muchas ediciones aprobadas podrian ganar un badge de "contribuidor" o incluso permisos de edicion directa (trusted editor).

### [FB-035] Usuarios tienen que iniciar sesion cada dia

- **Fecha:** 2026-04-23
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** Varios usuarios reportan que tienen que iniciar sesion todos los dias. La sesion no persiste entre dias, lo que sugiere que el refresh token no esta funcionando correctamente o esta mal implementado en el frontend. Posibles causas: el token no se renueva antes de expirar, no se persiste correctamente en el almacenamiento del navegador, o el interceptor HTTP del frontend no ejecuta el flujo de refresh cuando el access token expira.
- **Solucion propuesta:** Investigar el flujo completo de refresh token. En el backend: verificar la expiracion del refresh token y que el endpoint de refresh funcione correctamente. En el frontend: revisar el interceptor HTTP para asegurar que detecta respuestas 401, ejecuta el refresh automaticamente, y reintenta el request original con el nuevo access token. Tambien verificar que el refresh token se almacena correctamente (localStorage/cookie) y que no se pierde al cerrar el navegador.
- **Resolucion:** Causa raiz: el interceptor HTTP del frontend tenia race condition — multiples 401 concurrentes ejecutaban `clearSession()` aunque el refresh estaba en curso. Reemplazado por una cola con `BehaviorSubject<string|null>` que retiene las peticiones hasta que termina el refresh. Adicionalmente, el refresh token migro a cookie HttpOnly (Secure, SameSite=Lax, Path=/auth, 30d) para evitar exfiltracion via XSS — ya no se guarda en localStorage. Multi-sesion soportado por backend (un RefreshToken por dispositivo con deviceInfo).

### [FB-036] Boton de RAWG en game detail redirige con slug incorrecto

- **Fecha:** 2026-04-23
- **Severidad:** medio
- **Estado:** resuelto
- **Descripcion:** En la vista de detalle de un juego hay un boton que enlaza a la pagina del juego en RAWG. El problema es que el link usa el slug propio de Completr para construir la URL de RAWG (ej: rawg.io/games/{slug-completr}), pero el slug de Completr no tiene por que coincidir con el de RAWG, lo que provoca que la redireccion falle o lleve a un juego equivocado. La tabla GameExternal almacena el ID numerico de RAWG, no el slug.
- **Solucion:** Resuelto junto con FB-075. En `game-detail.html`, el `<a>` hardcoded `'https://rawg.io/games/' + game()!.code` (que usaba el slug de Completr) se movio dentro del bucle de `externalLinks` junto con Steam y Metacritic, usando ahora `'https://rawg.io/games/' + link.externalId` (rawgId numerico de `GameExternal`). Verificado que `rawg.io/games/{id}` funciona — RAWG resuelve IDs numericos y los redirige al slug correcto (ej: `rawg.io/games/3328` → The Witcher 3). El backend serializer ya exponia `externalLinks` con `source` y `externalId`. Si un juego no tiene `GameExternal` de RAWG, el link simplemente no se renderiza (en lugar de mostrar un link roto).

### [FB-037] UI general se siente muy chica

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Tami (Brave, Ubuntu, modo oscuro)
- **Descripcion:** Los elementos de la interfaz (texto, botones, tablas) se sienten demasiado pequenos en pantallas de escritorio. El usuario siente que todo esta "muy chico" en general. La app fue disenada desktop-first, por lo que el problema no es de responsive sino de tamanos base insuficientes en los estilos globales.
- **Solucion:** Resuelto por el rediseno de estilos posterior al reporte (nuevo design system con tamanos base ajustados y nuevo layout). No requiere accion adicional.

### [FB-038] Login con Google (OAuth)

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Un usuario sugiere que seria util poder iniciar sesion con Google en vez de solo email/password. Esto reduce friccion en el registro y login, especialmente para usuarios que ya tienen muchas credenciales.
- **Solucion propuesta:** Implementar OAuth con Google como metodo de login alternativo. Requiere: registrar la app en Google Cloud Console, implementar el flujo OAuth en el backend (passport-google o similar), y agregar boton "Sign in with Google" en el frontend. Considerar si se permite vincular una cuenta existente con Google o solo registro nuevo. Feature para Fase 3 o posterior.

### [FB-039] Pantalla de perfil usa solo la mitad del ancho de la pagina

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** La vista de perfil (/profile y /user/:username) no aprovecha el ancho completo de la pantalla en escritorio. El contenido se ve comprimido en la mitad izquierda o centro, dejando grandes espacios vacios a los lados. Esto se siente especialmente raro en monitores anchos.
- **Solucion:** Resuelto por el rediseno de estilos posterior al reporte (nuevo layout que aprovecha el ancho disponible). No requiere accion adicional.

### [FB-040] Preview de imagen rota en algun formulario

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al usar una funcion que muestra preview de imagen (probablemente el avatar URL en el modal de edicion de perfil), la preview no carga o se muestra rota. No se especifico exactamente en que pantalla ocurre, pero es probable que sea en el modal de editar perfil donde se ingresa un avatar URL y se muestra un preview.
- **Solucion propuesta:** El problema probablemente viene del nginx que bloquea o no proxea correctamente imagenes externas. Montar un servicio de almacenamiento (MinIO/S3) para fotos de perfil es demasiado para esta fase. Solucion intermedia: crear un pool de avatares predefinidos generados con IA (estilo Netflix) para que los usuarios elijan uno. Esto evita el problema de URLs externas, da una experiencia visual consistente y a futuro cuando se implemente upload real, los avatares predefinidos quedan como opcion por defecto.

### [FB-041] Sidebar desaparece al entrar a perfil publico o detalle de juego

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Cuando el usuario busca a alguien en el feed y entra a su perfil publico (/user/:username), el sidebar desaparece porque el perfil publico es un componente standalone fuera del layout principal. Lo mismo pasa con el game detail. El usuario lo percibe como raro porque pierde la navegacion. Relacionado con FB-046 (barra de busqueda deberia ser permanente).
- **Solucion propuesta:** Evaluar si el perfil publico y el game detail deberian vivir dentro del layout principal (con sidebar) en vez de ser standalone. Alternativa: agregar una barra de navegacion superior en las vistas standalone con al menos un boton de "back" y acceso a busqueda. Considerar que la experiencia no-logueada si necesita ser standalone pero la logueada podria mantener el sidebar.

### [FB-042] Multiples backlogs del mismo juego confunde a usuarios nuevos

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** descartado
- **Reportado por:** Tami
- **Descripcion:** Un usuario ve que otro tiene el mismo juego dos veces en su backlog y lo encuentra raro. No entiende que es intencional — el sistema permite multiples backlogs del mismo juego para trackear re-plays o distintas plataformas (ej: RE4 completado en PS2, despues re-jugado en PC). El concepto de play_count y multiples runs no es obvio para usuarios nuevos.
- **Decision (2026-05-19):** Descartado. Se deja el comportamiento actual sin indicadores adicionales — usuarios entienden el concepto cuando interactuan mas con la app.

### [FB-043] Layout general usa muy poco espacio en pantalla de escritorio

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** El contenido de varias vistas (feed, perfil, listas, backlog) ocupa una fraccion pequena del ancho disponible en pantalla de escritorio. El feed por ejemplo usa aproximadamente un cuarto de la pantalla, dejando grandes areas vacias. La app fue disenada desktop-first, por lo que el problema es que los contenedores principales tienen max-width demasiado restrictivos o el layout no aprovecha el espacio disponible.
- **Solucion:** Resuelto por el rediseno de estilos posterior al reporte (nuevo layout que aprovecha el ancho disponible). No requiere accion adicional.

### [FB-044] Icono de calendario casi invisible en modo oscuro

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Tami (Brave, Ubuntu, modo oscuro)
- **Descripcion:** Al seleccionar un juego en el Game Shelf, el icono del calendario en el campo "Acquired" (fecha de adquisicion) es casi invisible. El icono no tiene suficiente contraste contra el fondo oscuro del input. Puede ser un problema especifico de Brave en Linux o del tema oscuro del navegador que afecta inputs nativos de tipo date.
- **Solucion:** Agregado `color-scheme: dark` en el `body` de `styles.css`. Esto hace que el browser renderice automáticamente los controles nativos (input date, time, color picker, scrollbar) en variante dark, dándole contraste correcto al ícono del calendario sin necesidad de CSS específico para `::-webkit-calendar-picker-indicator`.

### [FB-045] Faltan juegos de Nintendo Switch (ej: Pokemon Scarlet)

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** diferido
- **Reportado por:** Tami
- **Descripcion:** Un usuario quiso agregar Pokemon Scarlet y no lo encontro. La busqueda con fallback a RAWG deberia traer juegos de Switch, pero puede ser que el juego tenga un nombre distinto en RAWG (ej: "Pokemon Scarlet and Violet") o que el mapeo de plataformas de RAWG no incluya Switch correctamente.
- **Decision (2026-05-19):** A revisar despues. Pendiente de diagnostico: reproducir busqueda, contrastar contra la API de RAWG, y comprobar `rawg-platform.map.ts`. Si la causa raiz resulta ser la consolidacion Scarlet/Violet en RAWG, queda como duplicado de FB-074 y se resuelve junto con ese.

### [FB-046] Barra de busqueda deberia ser permanente en el sidebar

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** La barra de busqueda global solo esta disponible en el feed. Al navegar a un juego, perfil u otra seccion, desaparece. El usuario tiene que volver al feed para buscar algo. Seria mas practico tener la busqueda siempre accesible desde el sidebar o un header global.
- **Solucion propuesta:** Mover la barra de busqueda global al sidebar (debajo del logo o arriba de la navegacion) para que este disponible en todas las vistas. Alternativa: agregar un header/topbar con la busqueda que persista en todas las paginas dentro del layout. Relacionado con FB-041.

### [FB-047] Agregar a wishlist o lista desde la grilla de juegos

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** En las vistas de grilla de juegos (games-browse, resultados de busqueda, similar games), las miniaturas no tienen acciones rapidas. El usuario tiene que entrar al detalle del juego para poder agregarlo a una lista, wishlist o backlog. Seria mas eficiente tener botones de accion rapida directamente en las cards de la grilla.
- **Solucion propuesta:** Agregar un overlay al hover en las cards de la grilla con botones de accion rapida: "Add to Backlog", "Add to Wishlist", "Add to List" (con selector de lista). Mantener el click en la card para ir al detalle. En movil, considerar un menu contextual al hacer long-press o un icono de tres puntos.

### [FB-048] Auto-seleccionar plataforma cuando solo hay una disponible

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** Al agregar un juego al backlog o game shelf, el selector de plataformas muestra todas las plataformas del juego. Si el juego solo tiene una plataforma disponible, el usuario tiene que seleccionarla manualmente. Seria mas comodo que se seleccionara automaticamente.
- **Solucion:** En `selectGame` de `backlog-modal` y `game-shelf-modal`, si `game.platforms.length === 1` se preselecciona automáticamente esa única plataforma en el form. Si hay 0 o más de 1, queda vacío como antes para que el usuario elija.

### [FB-049] Confusion entre Score y Rating en el backlog

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** El usuario no entiende la diferencia entre "Score" y "Rating" en el backlog. Score es el puntaje promedio de criticas (Metacritic, OpenCritic, etc.) y Rating es la nota personal del usuario (userRating, de 1 a 10). El hecho de que ambos sean numeros y esten en la misma tabla sin explicacion clara genera confusion. El usuario pregunta: "si son lo mismo, uno esta demas". Relacionado con FB-001 (campos score/duration confusos).
- **Solucion:** Resuelto junto con FB-001. Renombrado "Score" a "Critic Score" y "Rating" a "My Rating" en modal y header de tabla. Tooltips info clickeables en ambos campos explicando la diferencia. Visualmente separados: Critic Score como input numerico en "Reference data", My Rating como estrellas en "Your tracking".

### [FB-050] Juego de RAWG falla al cargar y boton Add queda deshabilitado

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al buscar "Tomodachi Life: Living the Dream" (probablemente un juego traido desde RAWG), la foto no cargo y se mostro un error. Posteriormente, al intentar agregar el juego al backlog, el boton "Add" quedo en estado disabled a pesar de que los campos obligatorios estaban llenos. El usuario no pudo agregar el juego. Es probable que el error al cargar los datos del juego (foto, scores, etc.) deje el formulario en un estado invalido que impide el submit.
- **Solucion propuesta:** Investigar que pasa cuando un juego de RAWG falla al cargar datos parciales (imagen, scores, duration). Asegurar que el boton de submit se habilite basandose solo en los campos requeridos del formulario (game, platform) y no en datos opcionales como la imagen. Agregar manejo de error graceful cuando la imagen no carga (mostrar placeholder en vez de error). Verificar que el formulario no quede en estado inconsistente despues de un error parcial.

### [FB-051] Add to Shelf desde backlog modal muestra exito falso

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** Al agregar un juego al backlog, el usuario uso el boton "Add to Shelf" dentro del modal de backlog. El boton indico que el juego fue agregado al shelf (feedback visual de exito), pero al ir al Game Shelf el juego no estaba ahi. Es un falso positivo — el frontend reporta exito sin que la operacion se haya completado realmente. Puede ser un error de HTTP no manejado, un problema de timing, o que el request nunca se envio.
- **Solucion:** Bug ya no se reproduce. Probablemente fixeado en uno de los refactors posteriores al reporte (`fd60a97d` redesign del modal con secciones reference/tracking, o `60d79995` migracion a ng-primitives). El flujo actual en `backlog-modal.ts` (createSubmit branch): crea el backlog primero, luego en `next:` arma `extras$ = [...wishlist, ...shelf]` y hace `forkJoin(extras$).subscribe(() => saved.emit())`. El evento `saved` solo se emite cuando todas las creaciones extras completan exitosamente — si el shelf falla, `forkJoin` errea y `saved` no emite, el modal queda abierto. No hay falso positivo posible en este flujo.

### [FB-052] Miniaturas de juegos usan capturas de pantalla en vez de arte oficial

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** descartado
- **Reportado por:** Tami
- **Descripcion:** Las miniaturas de algunos juegos (ej: Hello Kitty Island Adventure) muestran capturas de pantalla (screenshots) en vez de arte oficial o portada del juego. Esto pasa porque RAWG usa el campo "background_image" que a menudo es un screenshot, no un cover art. La app usa backgroundUrl para las imagenes y coverUrl esta reservado para covers reales pero aun no se implementa.
- **Decision (2026-05-19):** Descartado en Fase 2. RAWG no provee covers oficiales consistentes y la integracion con SteamGridDB/IGDB es trabajo grande para una mejora cosmetica. Se reevalua en Fase 5+ como integracion formal de un provider de covers (SteamGridDB).

### [FB-053] Descripcion de juego en idiomas mezclados y demasiado larga

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** diferido
- **Reportado por:** Tami
- **Descripcion:** La descripcion del juego Hello Kitty Island Adventure esta mitad en ingles y mitad en aleman (u otro idioma). Esto viene de RAWG que a veces devuelve descripciones en multiples idiomas concatenadas. Ademas, la descripcion es muy larga y no tiene scroll propio, haciendo que la pagina de detalle se extienda demasiado.
- **Decision (2026-05-19):** Movido a Fase 3. Requiere parser de idiomas en el import desde RAWG + script de backfill + "Read more / Read less" en la UI. No bloquea uso normal; se aborda junto con otras mejoras de calidad de datos de catalogo en Fase 3.

### [FB-054] Botones de filtrar y limpiar filtros poco visibles en backlog

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** Los botones para abrir el panel de filtros avanzados y para limpiar los filtros aplicados en el backlog no son lo suficientemente obvios. El usuario no los identifica facilmente, lo que dificulta el uso de filtros avanzados y la vuelta al estado sin filtros.
- **Solucion:** Botón **Filters** rediseñado: tamaño y padding mayores, color brand cuando hay filtros activos, badge circular con el número de filtros activos. Botón **"Clear all"** prominente aparece al lado cuando hay filtros activos. Además, rediseño del panel de filtros como off-canvas drawer lateral derecho con secciones agrupadas (Status, Platform, Started, Finished, Rating range, Sort) y footer fijo con Clear/Apply.

### [FB-055] Logo del sidebar deberia navegar al feed

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** El logo de Completr en el sidebar no es clickeable o no navega al feed. Los usuarios esperan que hacer click en el logo los lleve a la pagina principal (feed), como en la mayoria de aplicaciones web.
- **Solucion:** Logo (ícono "C" + texto "Completr") envuelto en `<a routerLink="/feed">` en `layout.html`. Click navega al feed.

### [FB-056] Agregar juego a una lista desde el game detail

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Desde la pagina de detalle de un juego no se puede agregar el juego a una lista. Actualmente para agregar un juego a una lista, el usuario tiene que ir a la lista, abrir el buscador de la lista, buscar el juego y agregarlo. Seria mas natural poder agregar el juego a cualquier lista desde su propia pagina de detalle.
- **Solucion propuesta:** Agregar un boton "Add to List" en el game detail que abra un dropdown o modal con las listas del usuario. Al seleccionar una lista, agregar el juego a esa lista. Requiere un endpoint o reutilizar el PUT /lists/:id/items agregando el juego al array existente. En el frontend, usar un componente reutilizable de selector de listas.

### [FB-057] Busqueda de juegos retorna cantidad inconsistente de resultados

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** El usuario nota que a veces la misma busqueda retorna mas juegos que otras veces. Esto probablemente se debe al fallback a RAWG: la primera vez que se busca un juego que no esta en la DB local, RAWG lo importa y la proxima vez aparecen mas resultados porque ya estan en la DB. No es un bug sino comportamiento esperado, pero el usuario lo percibe como inconsistente.
- **Solucion propuesta:** Agregar un indicador visual que diferencie resultados locales de resultados importados de RAWG (ej: badge "New" o "From RAWG" en resultados recien importados). Esto ayuda al usuario a entender por que los resultados cambian entre busquedas. Tambien considerar mostrar un mensaje tipo "Found X new games from RAWG" cuando el fallback importa juegos nuevos.

### [FB-058] Sin indicador de que un juego ya esta en una lista

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al buscar juegos para agregar a una lista, o al navegar por la grilla de juegos, no hay indicador visual de que un juego ya esta en alguna de las listas del usuario. Tampoco en la ficha del juego. Esto puede llevar a agregar duplicados o a no saber si ya se incluyo un juego.
- **Solucion propuesta:** En el buscador de la lista, mostrar un indicador (checkmark, badge "In list") junto a juegos que ya estan en esa lista especifica. En el game detail, mostrar una seccion "In your lists" con las listas del usuario que contienen ese juego. Requiere que el backend incluya esa informacion en la respuesta o un endpoint adicional.

### [FB-059] Listas del usuario deberian ser expandibles en el sidebar

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** descartado
- **Reportado por:** Tami
- **Descripcion:** La seccion "Lists" del sidebar solo muestra un link a la pagina de listas. El usuario sugiere que deberia poder expandirse para mostrar las listas creadas (o las favoritas) directamente en el sidebar, permitiendo acceso rapido sin pasar por la pagina de listas.
- **Decision (2026-05-19):** Descartado. El flujo actual (click en "Lists" → /lists/me → seleccionar lista) no se considera friccion suficiente para justificar la complejidad del sidebar expandible.

### [FB-060] Lista con fuente Metacritic muestra score null aunque el juego tiene Metacritic

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** El juego Rhythm Heaven tiene pagina y puntaje de Metacritic (verificable externamente), pero una lista configurada con score_source "metacritic" muestra que no tiene score para ese juego. Esto puede significar que: (1) el GameScore de tipo metacritic no fue importado para ese juego, (2) el juego se importo desde RAWG y solo tiene score de RAWG, o (3) el mapeo entre fuentes no esta funcionando correctamente.
- **Solucion propuesta:** Verificar en la DB si Rhythm Heaven tiene un registro en GameScore con source "metacritic". Si no lo tiene, el score de Metacritic no fue importado — es un problema de datos, no de codigo. A corto plazo, el admin puede agregar el score manualmente. A largo plazo, el cron de Metacritic/OpenCritic (Fase 5) se encargara de poblar estos datos automaticamente.

### [FB-061] Badge de fuente de score desalinea input en backlog modal

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** Al abrir el modal de backlog desde una lista (ej: Rhythm Heaven), el campo Score muestra un badge indicando la fuente del score precargado (ej: "RAWG"). Este badge agrega altura extra al campo y lo desalinea visualmente con el campo Duration que no tiene badge. Los inputs quedan a alturas diferentes, rompiendo la alineacion del formulario.
- **Solucion:** Resuelto sin cambios adicionales como efecto secundario del rediseño hecho en FB-001. El modal ahora reserva un slot de `min-h-[26px]` para los source buttons en ambos campos (Critic Score y Duration); si un lado tiene badge y el otro no, el slot vacío mantiene el espacio y los inputs quedan alineados.

### [FB-062] Editar backlog desde la vista de detalle de lista

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al ver una lista con sus juegos, el usuario quiere poder editar su backlog (cambiar status, agregar notas, etc.) directamente desde la vista de la lista sin tener que navegar al backlog. Actualmente el icono de backlog en la lista solo indica si el juego esta en el backlog del usuario, pero no permite editarlo.
- **Solucion propuesta:** Hacer clickeable el icono de backlog en los items de la lista para abrir el modal de edicion de backlog del juego. Si el juego ya esta en el backlog, abrir el modal de edicion precargado. Si no esta, abrir el modal de creacion. Reutilizar el componente de modal de backlog que ya existe en la vista de backlog.

### [FB-063] Boton de seguir lista no visible o no intuitivo

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Un usuario entro al perfil de otro usuario para seguir una de sus listas y no encontro el boton de Follow. La causa real es que la ruta /user/:username/lists/:id no tiene boton de Follow (ver FB-065). Ademas, las cards de listas en el perfil tampoco tienen opcion de seguir directamente.
- **Solucion propuesta:** Dos mejoras: (1) hacer el boton Follow mas visible en list-detail (aumentar tamano, usar color de acento, moverlo a una posicion mas prominente). (2) Agregar un boton Follow en las cards de listas cuando se ven desde el perfil de otro usuario, permitiendo seguir sin entrar al detalle. Tambien agregar un indicador visual en las cards de listas que el usuario ya sigue.

### [FB-064] Usuarios no entienden que son Score y Duration ni por que son obligatorios

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** resuelto
- **Reportado por:** Tami
- **Descripcion:** Cuando el campo Score viene vacio (sin datos de ninguna fuente), el usuario no entiende que debe buscarlo manualmente en otra plataforma (Metacritic, OpenCritic, etc.) para rellenarlo. No sabe que estos campos alimentan el ratio, que es la feature diferenciadora de Completr para priorizar que jugar. Si el juego no tiene datos en ninguna fuente, deberia saber que puede reportar el juego para que un admin lo complete. Relacionado con FB-001 y FB-049.
- **Solucion:** Resuelto junto con FB-001 y FB-049. (1) Texto de ayuda en el modal: subtitulo "used to calculate ratio" y explainer corto en cada seccion. (2) Botón "Report missing" inline cuando faltan sources, conectado a GameReport con category. (3) Ratio computed en vivo visible en el header de Reference data con tooltip explicando la formula. (4) Columna Ratio prominente en la tabla hardcore del backlog (font-display bold, color brand).

### [FB-065] Vista de lista desde perfil de usuario no tiene boton de Follow

- **Fecha:** 2026-04-24
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Tebi
- **Descripcion:** Existen dos rutas para ver una lista: /lists/:id (que si tiene boton Follow/Unfollow) y /user/:username/lists/:id (que no lo tiene). Cuando un usuario entra al perfil de otro y hace click en una de sus listas, llega a la ruta /user/:username/lists/:id donde no hay forma de seguir la lista. Esta es la ruta natural para descubrir listas de otros usuarios, por lo que el Follow esta efectivamente roto para el flujo mas comun. Esto explica por que Tami no pudo seguir una lista (FB-063).
- **Solucion propuesta:** Agregar el boton Follow/Unfollow en la vista /user/:username/lists/:id. Idealmente ambas rutas deberian compartir el mismo componente de detalle de lista o al menos las mismas funcionalidades. Evaluar si tiene sentido unificar ambas rutas en una sola (/lists/:id) y que el contexto del usuario se resuelva internamente.

### [FB-066] Indicador visual cuando un item de wishlist se auto-remueve

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** resuelto
- **Descripcion:** Cuando un backlog cambia a status "completed" o "abandoned", el sistema auto-remueve el juego de la wishlist. No hay ningun indicador visual en el frontend que le comunique al usuario que esto paso. El juego simplemente desaparece de la wishlist sin explicacion.
- **Solucion:** Backend: `backlog.service.updateBacklog` ahora devuelve `{ backlog, wishlistRemoved }`. `wishlistRemoved` es `true` solo si la transicion a completed/abandoned efectivamente borro filas de Wishlist (`Wishlist.destroy` devuelve >0). El controller expone el flag en `data.wishlistRemoved` del PATCH `/users/me/backlog/:id`. Frontend: el modal de backlog dispara `toast.info("Removed from your Queue: <title> — completed/abandoned")` cuando la respuesta trae `wishlistRemoved: true`, y sincroniza los signals `isInWishlist`/`addToWishlist` para evitar re-add accidental.

### [FB-067] Titulos con caracteres especiales se guardan HTML-encodeados

- **Fecha:** 2026-05-04
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al crear o editar un juego desde el panel admin con un titulo que contiene caracteres especiales (ej: "Beyond Good & Evil - 20th Anniversary Edition"), el valor se persiste HTML-encodeado en la DB ("Beyond Good &amp; Evil - 20th Anniversary Edition"). Esto corrompe el dato almacenado, rompe la busqueda (un query con "&" no matchea "&amp;") y filtra entidades HTML al codigo y a las vistas que esperan texto crudo. Probablemente afecta tambien a otros caracteres como `<`, `>`, `'`, `"`.
- **Solucion propuesta:** Identificar donde se aplica el escaping en el flujo de creacion/edicion de games (controller, service, schema de Zod, hook de Sequelize, o el frontend del admin antes de enviar el request). El encoding HTML es una preocupacion de la capa de presentacion, no de persistencia — hay que removerlo del path de guardado y aplicarlo solo al renderizar HTML donde sea necesario. Auditar otros endpoints (lists, reviews, notes, profile) por el mismo patron. Una vez arreglado, hacer un script de limpieza para des-encodear los registros existentes que ya esten corruptos.

### [FB-068] Sesion se cierra al usar la app desde varios dispositivos

- **Fecha:** 2026-05-07
- **Severidad:** alto
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** Al tener la sesion abierta en mas de un dispositivo simultaneamente (ej: PC y celular), la sesion se cierra inesperadamente en alguno de ellos. Probablemente el backend invalida el refresh token anterior cuando se emite uno nuevo (rotacion single-token por usuario), por lo que el dispositivo que pidio refresh primero deja sin token valido al otro dispositivo. Apenas el segundo dispositivo intenta renovar, recibe 401 y termina deslogueando al usuario. Posiblemente relacionado con FB-035 (sesion no persiste) — si la rotacion de refresh tokens no soporta multiples sesiones, ambos sintomas pueden tener la misma causa raiz.
- **Solucion propuesta:** Soportar multiples refresh tokens activos por usuario, uno por sesion/dispositivo. Modelar una tabla RefreshToken(id, userId, tokenHash, deviceInfo, createdAt, expiresAt, revokedAt) en vez de guardar un unico token por usuario. Al hacer refresh, rotar solo el token de esa sesion especifica (no invalidar los de otros dispositivos). Agregar endpoint para listar y revocar sesiones activas (util para "cerrar sesion en todos los dispositivos"). Verificar primero el comportamiento actual del backend revisando el modulo de auth — si ya soporta multi-sesion, el bug podria estar en el frontend (interceptor compartiendo estado o pisandose entre tabs).
- **Resolucion:** El backend ya soportaba multi-sesion (un RefreshToken por dispositivo). Se agregaron columnas `deviceInfo` y `lastUsedAt` a la tabla RefreshTokens via migracion. Nuevos endpoints `GET /auth/sessions`, `DELETE /auth/sessions/:sessionId` y `DELETE /auth/sessions/others/:sessionId`. Login/register/refresh devuelven `session_id` para identificar el dispositivo actual. UI en `/settings/security` lista sesiones paginadas, marca "This device" y permite revocar individualmente o cerrar sesion en otros dispositivos. La race condition del interceptor (FB-035) era la causa raiz comun.

### [FB-069] Feed muestra "wants to play" sin indicar el juego

- **Fecha:** 2026-05-07
- **Severidad:** alto
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En el feed aparecen actividades como "Esteban Tejeda wants to play" sin mencionar a que juego se refiere. El item queda vacio de contexto y no se puede clickear para llegar al juego. Probablemente el evento se genera con gameId nulo o el render del feed no esta resolviendo/mostrando el titulo del juego para ese tipo de actividad (wishlist add). Puede afectar tambien a otros tipos de eventos del feed.
- **Solucion:** Resuelto junto con FB-007 y FB-008. Causa raíz: `backlog_not_started` no estaba en `GAME_TYPES` del activity.service, por lo que las actividades de ese tipo no asociaban un ActivityGame. Agregado al enum + GAME_TYPES. El template del feed ya renderiza el link al juego cuando hay target — ahora lo recibe correctamente.

### [FB-070] No se puede actualizar score/duration desde el backlog cambiando de fuente

- **Fecha:** 2026-05-07
- **Severidad:** alto
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al editar un item del backlog, los valores actuales de score y duration se ven correctamente, pero no se puede actualizarlos cambiando la fuente que los provee. Ejemplo: un juego quedo registrado con la duration de RAWG y el usuario ahora quiere reemplazarla por la de HLTB — el modal no ofrece la opcion de re-fetchear ni elegir entre las fuentes ya existentes (Metacritic, OpenCritic, RAWG, HLTB) para tomar el valor mas actualizado o preferido. Para cambiar la fuente hoy hay que ir al panel admin de games, lo cual no es accesible para usuarios normales.
- **Solucion propuesta:** Permitir desde el modal de backlog (o desde la vista de detalle del juego) actualizar el score/duration eligiendo entre las fuentes existentes. Opciones: (1) mostrar un selector con las fuentes disponibles (Metacritic, OpenCritic, RAWG, HLTB) y el valor que cada una reporta, dejando elegir cual usar como valor activo del juego; (2) un boton "Refresh from sources" que vuelva a consultar las APIs externas y actualice los valores. Definir si esta accion afecta el game compartido (todos los usuarios ven el cambio) o solo el backlog personal — si es lo primero, podria requerir moderacion o limitarse a ciertos roles. Relacionado con FB-005 (admin no puede borrar scores/durations), ambos apuntan a que el flujo de edicion de scores/durations esta incompleto.

### [FB-071] Wishlist no permite ordenar por columnas ni persistir el orden resultante

- **Fecha:** 2026-05-07
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En la wishlist se puede reordenar manualmente arrastrando los juegos, pero no hay forma de ordenar la lista por las columnas score, duration o ratio. Si el usuario quisiera priorizar la wishlist por ratio (la feature diferenciadora de Completr), tiene que comparar valores a ojo y arrastrar uno por uno. Ademas, despues de un sort por columna no hay opcion de "fijar" ese orden como la posicion guardada de los items, perdiendo el resultado al refrescar.
- **Solucion propuesta:** (1) Hacer las columnas score, duration y ratio clickeables para ordenar asc/desc, igual que en backlog. (2) Despues de aplicar un sort por columna, ofrecer un boton "Save this order" que persista las posiciones actuales como el orden manual de la wishlist (sobreescribe el campo de posicion/sortOrder de cada item). Asi el usuario puede usar el sort como herramienta de priorizacion y luego congelarlo. Considerar si el sort por columna es solo visual (no toca DB) hasta que se confirme con el boton, para evitar mutaciones accidentales.

### [FB-072] Listas no muestran si el juego esta completado o abandonado

- **Fecha:** 2026-05-07
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al ver una lista de juegos (propia o de otro usuario), se muestra el progreso general de la lista, pero en cada item solo se indica si el juego esta o no en mi backlog. No se distingue si ya lo complete, lo abandone o sigue en progreso. Esto obliga a entrar al detalle del juego o a mi backlog para saber el estado real, perdiendo contexto util al recorrer la lista.
- **Solucion propuesta:** Mostrar el estado del juego (completado, abandonado, en progreso, en backlog) en cada item de la lista. Opciones: (1) variar el color/iconografia del marcador actual de "en backlog" segun el estado (ej: verde completado, gris abandonado, amarillo en progreso, azul en backlog); (2) agregar una columna o badge dedicado al estado, especialmente util en vista tabular. Verificar si el endpoint que devuelve los items de una lista ya incluye el estado del backlog del usuario actual para cada juego — si no, agregar el join correspondiente. Aplica tanto a listas propias como ajenas (cuando ves la lista de otro usuario, los iconos deben reflejar TU estado, no el del dueno de la lista).

### [FB-073] Compilados remastered (varios juegos en un solo titulo) distorsionan duracion y ratio

- **Fecha:** 2026-05-12
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Algunos titulos son "compilados/colecciones" que empaquetan varios juegos completos en uno solo. Ejemplos: "Tomb Raider I-II-III Remastered" (TR1+TR2+TR3), "Mass Effect Legendary Edition" (ME1+ME2+ME3), "Mega Man X Legacy Collection" (MMX1-4), "Halo: The Master Chief Collection", "Crash Bandicoot N. Sane Trilogy", "Spyro Reignited Trilogy", "Kingdom Hearts HD 1.5+2.5 ReMIX", etc. Agregar el compilado al backlog como un unico juego distorsiona el promedio de finalizacion / duration estimado y el ratio score/duration, porque en la practica son varios juegos en uno. Ademas, completar el titulo entero implica terminar todos los incluidos, lo que alarga la duracion real y hace dificil trackear progreso (puedes haber terminado ME1 pero no ME2 ni ME3). Tambien afecta el feed/social (un "completed" en el compilado no es comparable a un "completed" en un juego individual).
- **Solucion propuesta:** Explorar varias opciones, no excluyentes:
    - (1) Modelar el compilado como un "bundle/collection" en RAWG/DB con relacion padre-hijos a los juegos individuales. Al agregarlo al backlog, ofrecer al usuario elegir entre agregar el bundle completo o solo los juegos individuales que le interesen. Si elige bundle, el progreso del bundle se calcula como agregado de los hijos.
    - (2) Permitir marcar un backlog item como "parcial" o trackear sub-juegos dentro de un mismo item (checklist interno con score/duration por sub-juego). El score/duration del padre se promedia o suma a partir de los hijos.
    - (3) Excluir los compilados del calculo de promedios globales de la app (flag `isCompilation` en el juego), de modo que no contaminen estadisticas agregadas, pero permitir agregarlos como cualquier otro titulo.
    - (4) Dejarlo como esta pero documentar la convencion: tratar el compilado como un juego mas, asumiendo que el usuario que lo agrega quiere terminarlo entero. Es la opcion mas simple pero la que peor refleja la realidad.
    - Decision pendiente: definir si Completr quiere modelar bundles como entidad de primera clase (opcion 1, mas trabajo, mas correcto) o resolverlo con un flag simple (opcion 3). Validar tambien si RAWG ya expone esta relacion para poder importarla.

### [FB-074] RAWG agrupa juegos distintos en un mismo registro (Pokemon Sun/Moon)

- **Fecha:** 2026-05-12
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** RAWG a veces consolida varios juegos distintos en un unico registro. Ejemplo: "Pokemon Sun" y "Pokemon Moon" aparecen como un solo juego en RAWG, siendo que son titulos diferentes (con dex y exclusivos distintos). Lo mismo suele pasar con otras parejas de Pokemon (Sword/Shield, Scarlet/Violet) y con remakes/versiones. Como en la BBDD de Completr hay una constraint de unicidad por `rawgId` (un registro por juego de RAWG), no se pueden crear entradas separadas para cada version. El usuario que tiene solo una de las dos versiones queda forzado a usar el registro consolidado, lo que distorsiona el backlog, los promedios y el feed.
- **Solucion propuesta:** Romper la asuncion "1 juego en Completr = 1 juego en RAWG". Opciones:
    - (1) Quitar la constraint UNIQUE sobre `rawgId` y permitir varios juegos en Completr apuntando al mismo `rawgId`. Diferenciarlos por `name`/`slug` propio de Completr. Implica revisar todos los lugares donde se asume unicidad por rawgId (sync, import, busquedas).
    - (2) Modelar una tabla intermedia `game_variant` donde el "juego RAWG" es padre y cada variante (Sun, Moon) es hijo con datos propios (cover, descripcion, score, duration). El backlog apunta a la variante, no al padre.
    - (3) Permitir que un admin "desconsolide" manualmente un registro de RAWG en N registros de Completr, manteniendo el rawgId como referencia opcional. Mas pragmatico mientras no haya muchos casos.
    - Cambio de BBDD requerido en cualquiera de las opciones. Evaluar volumen de casos antes de decidir (cuantos registros RAWG conocidos consolidan juegos distintos).

### [FB-075] Link a RAWG usa el slug de Completr en vez del slug real de RAWG

- **Fecha:** 2026-05-12
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la BBDD de Completr se almacena el `rawgId` (numerico) del juego, pero no su `slug` (el "code" que RAWG usa en sus URLs, ej: `the-witcher-3-wild-hunt`). Cuando la UI construye el link "Ver en RAWG", usa el slug propio de Completr asumiendo que coincide con el de RAWG, lo cual no siempre es cierto (Completr puede haber generado un slug distinto, o RAWG puede haberlo cambiado). Resultado: links rotos o que apuntan a un juego incorrecto en rawg.io.
- **Solucion:** Resuelto junto con FB-036. En vez de almacenar `rawgSlug` (que requeria migracion + backfill respetando rate limits de RAWG), se opto por usar el `rawgId` numerico que ya existe en `GameExternal`. Verificado que `rawg.io/games/{id}` funciona (RAWG redirige al slug correcto). Frontend ahora usa `'https://rawg.io/games/' + link.externalId` cuando `link.source === 'rawg'`. Sin cambios de BBDD ni backfill necesarios.

### [FB-076] Wishlist en modo grilla no muestra el numero de posicion

- **Fecha:** 2026-05-19
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la wishlist, al cambiar a la vista en modo grilla, no se muestra el numero de posicion de cada juego dentro de la lista. La wishlist esta ordenada por prioridad (manual o por columna, ver FB-071), por lo que la posicion es informacion relevante: saber si un juego es el #3 o el #27 cambia la lectura. En el modo tabla la posicion se infiere por la fila, pero en grilla se pierde esa referencia.
- **Solucion:** Agregado badge `#N` en la esquina superior izquierda de cada card del modo grilla, con `bg-black/70 backdrop-blur-sm`. Considera la paginación (`offset + i + 1`) para mostrar la posición correcta.

### [FB-077] Seccion "Latest Completr Lists" nunca aparece en la pagina de un juego

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En el detalle de un juego (Games) deberia mostrarse una seccion "Latest Completr Lists" con las listas publicas mas recientes que incluyen ese juego. La seccion nunca aparece, ni siquiera para juegos que sabemos que estan en varias listas publicas. Puede ser que el endpoint no devuelva resultados, que el frontend este filtrando mal, o que la query no este matcheando los juegos correctamente con sus listas.
- **Solucion propuesta:** Diagnosticar el flujo end-to-end: (1) verificar que el endpoint que devuelve "ultimas listas que incluyen este juego" exista y este siendo llamado desde el detalle del juego; (2) revisar la query en backend (joins entre lists, list_items y games, filtros por visibilidad publica y orden por fecha); (3) revisar el frontend (si los datos llegan, comprobar que la seccion se renderice y no este oculta por un guard tipo `if (lists.length === 0)` que falle por shape). Si el endpoint no existe todavia, crearlo: GET /games/:id/lists?limit=N&order=recent devolviendo solo listas publicas. Considerar paginacion futura.

### [FB-078] Real Duration en diary view del backlog no se destaca lo suficiente

- **Fecha:** 2026-05-19
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la vista diary del backlog, el tiempo de juego real que ingresa el jugador (realDuration) aparece como un texto mas dentro de la fila de metadatos ("Real Xh") al lado del score y la duracion estimada. Visualmente queda diluido entre los otros datos cuando en realidad es uno de los valores mas importantes que el usuario aporta personalmente — refleja su experiencia real con el juego y alimenta el ratio personal.
- **Solucion:** Removido "Real Xh" de la fila de metadata y agregado como tercer bloque en la columna derecha de la diary card, junto al Ratio (brand grande) y Personal Ratio (warning mediano). Estilo: text-base + font-semibold + label "Real" en mayúsculas tracking-wider — mismo patrón visual que los otros indicadores derivados del usuario.

### [FB-079] "No sources. Report missing" aparece al editar un backlog ya existente

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** Al abrir el modal de edicion de un backlog ya creado (que tiene score y duration completados manualmente o desde una fuente), aparece debajo de los campos Critic Score y Duration el mensaje "No sources. Report missing" como si faltaran fuentes. El usuario ya tiene el dato ingresado, por lo que el aviso esta fuera de lugar y sugiere accion sobre algo que no es necesario.
- **Solucion:** El bloque de sources en `backlog-modal.html` ya estaba condicionado con `gameScores().length > 0 || (selectedGame() && !isEdit())` (idem para `gameTimes`). En modo edit el wrapper no se renderiza, asi que el aviso "No sources. Report missing" solo aparece en flujo de creacion cuando el juego del catalogo realmente no tiene fuentes.
- **Solucion:** En `backlog-modal.html`, el branch `@else if (selectedGame())` que renderiza el aviso "No sources. Report missing" ahora también requiere `!isEdit()`. En modo edición el dato ya está cargado en el form, por lo que el mensaje queda oculto. Sigue activo en creación cuando un juego seleccionado realmente no tiene sources.

### [FB-080] Boton de crear backlog en la esquina derecha no aporta valor

- **Fecha:** 2026-05-19
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** El boton mas a la derecha del header/topbar para crear un backlog se siente innecesario. Ya existe un boton "+ Add to Backlog" dentro de la vista de backlog y el flujo natural para agregar un juego empieza desde la ficha del juego o desde la vista de backlog. El boton flotante en la esquina no se descubre, no acompana ningun flujo y agrega ruido visual al header.
- **Solucion:** FAB eliminado de `layout.html` junto con el `BacklogModal` y los handlers asociados (`openAddModal`, `onAddModalClosed`, `onAddModalSaved`, signal `showAddModal`). Los puntos de entrada para crear backlog quedan: "+ Add to Backlog" en `/backlog` y action buttons en game detail. Se evaluo y descarto convertirlo en un menu multi-opcion.

### [FB-081] Game shelf usa demasiado espacio vertical con un juego por fila

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** La vista de Game Shelf muestra un juego por fila ocupando todo el ancho disponible. En escritorio queda mucho espacio horizontal vacio a la derecha de cada entrada y la lista se vuelve larga rapidamente. Otras vistas con cards (favorites, wishlist en grid) aprovechan mejor el ancho mostrando 2+ columnas. La unica entrada por fila no aporta densidad de informacion ni mejora la legibilidad.
- **Solucion:** Toggle de 3 view modes en `/game-shelf` con persistencia en localStorage (`completr.shelf.viewMode`). (1) **Cards** (default, icono `view_agenda`): el card actual pero ahora en `grid grid-cols-1 md:grid-cols-2` — 2 columnas en escritorio, 1 en mobile. (2) **Grid** (icono `grid_view`): grid de caratulas estilo wishlist (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`) con plataforma como badge superior izquierdo. Click en card abre modal de edicion, click en titulo navega a ficha del juego. (3) **Table** (icono `view_list`): tabla compacta con cover thumb 8x10 + title + platform badge + edition + acquired + notes — maxima densidad. Click en fila abre modal, click en titulo navega. Patron de toggle identico al de wishlist.

### [FB-082] Wishlist tiene mucho espacio sobrante, podria ofrecer drag-and-drop

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** La vista de Wishlist (en modo tabla y grilla) deja bastante espacio vertical/horizontal sobrante por fila. Mas alla del badge de posicion ya agregado (FB-076), la priorizacion manual hoy se hace con flechas arriba/abajo que son lentas para reordenar varios items. Una experiencia drag-and-drop seria mucho mas fluida para acomodar el orden y aprovecharia el espacio sobrante como "zona de drop".
- **Solucion propuesta:** Implementar drag-and-drop con Angular CDK DragDropModule en el listado de wishlist. Cada fila/card es draggable; al soltarse, se llama al PUT existente con el nuevo array de backlogIds reordenado. Mostrar feedback visual claro durante el drag (sombra, opacidad, indicador de drop position). Mantener las flechas como fallback accesible. Aprovechar para evaluar si la card actual se puede compactar o si conviene una vista mas densa con menos padding entre items.

### [FB-083] Perfil de jugador solo muestra ultimas reviews, falta ver todas

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al entrar al perfil publico de otro jugador (/user/:username), la seccion de reviews muestra solo las ultimas N (probablemente 3-5). No hay forma de ver el resto de las reviews que el usuario ha escrito. Si me interesa la opinion de alguien sobre varios juegos, no tengo manera de revisarlas todas sin entrar juego por juego.
- **Solucion propuesta:** Agregar boton "See all" debajo de la lista de reviews en el perfil publico que lleve a una vista dedicada `/user/:username/reviews` con paginacion (limit 25). Backend: nuevo endpoint `GET /users/:username/reviews?limit&offset` que devuelve las reviews del usuario con `game` populado, ordenadas por fecha desc, paginadas con `{ rows, total }`. Frontend: vista nueva con `<ui-pagination>` reutilizando el patron ya usado en feed, backlog, wishlist, etc.

### [FB-084] Plataformas duplicadas: Origin y EA (Origin) son la misma

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En el listado de plataformas aparecen dos entradas que representan la misma tienda: "Origin" y "EA (Origin)". EA renombro Origin a EA App en 2022, pero ambos siguen siendo el mismo cliente y libreria. Tener dos plataformas distintas para lo mismo fragmenta los datos — un juego se asigna a una u otra segun como vino de RAWG, y los filtros/busquedas por plataforma quedan inconsistentes. El usuario al agregar un juego ve dos opciones equivalentes y no sabe cual elegir.
- **Solucion propuesta:** Consolidar en una sola plataforma canonica. Pasos: (1) decidir el nombre canonico ("EA App" probablemente, o mantener "Origin" si se prefiere la marca historica). (2) migracion que mueva todos los `game_platforms` que apuntan a la duplicada hacia la canonica, evitando duplicados (ON CONFLICT DO NOTHING). (3) eliminar la fila duplicada de `platforms`. (4) actualizar `rawg-platform.map.ts` para que ambos slugs RAWG (`ea-origin` y `origin`) mapeen al codigo canonico. Auditar tambien si hay otras plataformas duplicadas (ej: PS Network vs PS Store, Xbox vs Xbox Live).

### [FB-085] El corazon de wishlist en el backlog no permite remover

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la vista de backlog hay un icono de corazon para agregar la entrada a la wishlist. Al presionarlo, el backlog se agrega correctamente, pero al presionarlo de nuevo (esperando que actue como toggle) no se remueve. El usuario queda sin forma de sacar el item desde el backlog y tiene que ir a la vista de wishlist para eliminarlo, lo que rompe la expectativa de un control toggle.
- **Solucion:** Corazon funciona como toggle con confirmacion en dos pasos para evitar remociones accidentales que rompen prioridades manuales. (1) `WishlistService.removeByBacklogId(backlogId)` agregado en frontend (hace `GET` + `PUT` con backlogIds restantes; backend no tiene DELETE asi que se reusa el endpoint de reorder, mismo patron que `wishlist-view.remove`). (2) `addToWishlist` reemplazado por `toggleWishlist` en `backlog-list.ts`. Estados: corazon vacio → click → agrega; corazon lleno → click → entra a estado confirm (icono `heart_broken`, fondo `bg-danger/15`, tooltip "Click again to remove"), auto-resetea en 3s; segundo click dentro de 3s → remueve. Aplica en vista diary y vista tabla (hardcore).

### [FB-086] El modal de backlog abre directo en modo edicion, sin vista resumen

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al abrir el modal de una entrada del backlog ya existente, el formulario de edicion aparece inmediatamente con todos los campos editables. No hay un paso intermedio que muestre de forma estatica la informacion que el usuario ya ingreso (score, duracion, fechas, plataforma, reseña, etc.). El usuario que solo quiere consultar los datos tiene que escanear los inputs de un formulario en vez de leer una vista resumen limpia. Tambien implica que un click accidental en un input ya cambia algo, cuando la intencion era solo mirar.
- **Solucion propuesta:** Convertir el modal de backlog en dos estados: (1) **Vista resumen** (default al abrir): muestra los datos ya ingresados en formato de solo lectura, con tipografia y layout pensados para lectura — score, duracion estimada, real duration, fechas, plataforma, notas, etc. Si el usuario tiene reseña para ese juego, incluirla en la vista resumen (texto + rating + chip de duracion segun FB de mejoras a reseñas). Boton primario "Editar" que cambia al estado de edicion. (2) **Vista edicion**: el formulario actual con todos los inputs, ahi mantener el cuadro "Editar reseña" como esta hoy (redirige al flujo de editar reseña). Boton "Volver" o "Cancelar" que regresa a la vista resumen sin guardar cambios. Para entradas nuevas (crear backlog) seguir abriendo directo en modo edicion porque no hay datos previos que resumir.

### [FB-087] En el backlog, si la entrada no tiene nota pero hay reseña, mostrar la reseña

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En la vista del backlog, el cuadro de texto que muestra la nota personal (`Backlog.notes`) queda vacio cuando el usuario no escribio una. Sin embargo, si el usuario si tiene una reseña publicada del juego (`Review.content`), ese cuadro podria usarse para mostrar el texto de la reseña en lugar de quedar vacio. La reseña ya es texto del usuario sobre el juego y aporta mas contexto que un espacio en blanco — evita repetir el contenido en dos lugares cuando el usuario solo escribio la reseña.
- **Solucion propuesta:** En la vista del backlog (diary cards y tabla), si `Backlog.notes` esta vacio o null y existe `Review.content` del mismo usuario para ese juego, renderizar el contenido de la reseña en ese cuadro con un label visible que aclare la fuente (ej: "Reseña" en vez de "Nota") para no confundir al usuario sobre que esta viendo. Si ambos existen, mostrar la nota (prioridad al campo especifico del backlog). Backend: incluir `reviewContent` (o el objeto review completo) en el serializer del backlog, asi el frontend tiene el dato sin pedirlo aparte.

### [FB-088] Falta indicador visual de que el usuario ya escribio reseña en un juego

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Cuando un usuario ya escribio una reseña de un juego, no hay un indicador rapido en la UI que se lo recuerde. Tiene que entrar a la ficha del juego y bajar a la seccion de reseñas para confirmar si ya escribio una. Esto es especialmente confuso cuando aparecen CTAs tipo "Sé el primero en reseñar" o "Escribe tu reseña" en otras partes de la app — el usuario no sabe si ya tiene una guardada.
- **Solucion propuesta:** Agregar un indicador visible (icono pequeño o chip) que aparezca junto al juego en los contextos donde el usuario lo ve: cards de juego, diary cards del backlog, vista de game-shelf, listas, etc. Cuando el usuario tiene reseña propia para ese juego, se muestra el indicador (ej: icono `rate_review` o un badge "Reseñada"). Backend: exponer un flag `hasUserReview` (o similar) en el serializer de game cuando hay usuario autenticado en el contexto, evaluando si existe un `Review` con ese `userId` + `gameId`. Reutilizar el patron de `backlogStatus` que ya inyecta data del usuario autenticado en los serializers de game. Frontend: renderizar el icono/chip en los componentes de card de juego y diary card. Tambien sirve como atajo: click en el indicador podria llevar a la reseña existente o abrir el editor.

### [FB-089] Paleta de colores: navbar no diferencia item activo, falta revision general

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban (reportado por usuarios)
- **Descripcion:** Los usuarios reportan que la paleta de colores no esta bien resuelta. El ejemplo concreto es el navbar: todos los items se renderizan con el mismo color, sin diferenciar visualmente el item activo (la ruta actual). El color de "destacado" deberia estar reservado para el item seleccionado, no aplicarse a todos por igual. Esto rompe el feedback visual basico de navegacion — el usuario no sabe en que seccion esta sin leer el texto. El reporte sugiere que el problema es mas amplio que el navbar y conviene auditar la paleta completa.
- **Solucion:** Fix del item activo en sidebar. `layout.html` con estilos `routerLinkActive` unificados (antes habia dos patrones, ahora todos los items usan triple indicador visual: `!border-brand` borde izquierdo 3px + `!text-brand` texto purpura + `!bg-brand-subtle` fondo brand 10%). Hover de inactivos suma `bg-surface/60`. `settings-shell.html` ya tenia el patron. Accesibilidad: agregado `ariaCurrentWhenActive="page"` en todos los `routerLinkActive`. Se evaluo y descarto darle color semantico a los iconos por seccion (wishlist=danger, favorites=warning, saved-views=sky) — preferencia por mantener iconos neutros. Audit del resto del codebase: usos altos de `text-brand` en backlog-list (22), games-browse (14) y public-profile (10) son intencionales (ratios destacados, CTAs, tabs activas) y no se modificaron.

### [FB-090] Permitir al usuario elegir tema (refined-dark vs twilight-arcade)

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** El frontend ya tiene dos temas completos en `src/styles/themes/` (`refined-dark` y `twilight-arcade`), pero el cambio entre ellos es manual: hay que copiar los archivos del tema sobre `styles.css` y `styles/ui.css` y rebuild. Los usuarios no pueden elegir tema desde la app. Dado que el trabajo de tokens y variantes ya esta hecho, exponerlo como preferencia por usuario tiene poco costo y agrega personalizacion. Tambien sirve como hedge ante FB-089 (revision de paleta): si a algunos usuarios no les gusta el tema activo, pueden cambiar.
- **Solucion propuesta:** (1) Refactor: dejar de sobreescribir `styles.css` con la copia del tema. En vez de eso, importar ambos temas como bloques CSS scopeados a un atributo (ej: `[data-theme="refined-dark"] { ... }` y `[data-theme="twilight-arcade"] { ... }`) o usar CSS variables intercambiables. El `<html>` lleva `data-theme="..."` y los estilos resuelven en runtime. Actualizar el README de `themes/` para reflejar el nuevo flujo. (2) Backend: agregar campo `theme` a `User` (enum: `refined-dark` | `twilight-arcade`, default `refined-dark`). Exponer en `GET /users/me` y aceptar en `PATCH /users/me`. (3) Frontend: opcion en la pagina de Settings (o Profile) con selector de tema. Al cambiar, llamar al PATCH y actualizar `data-theme` del DOM inmediatamente. Persistir tambien en localStorage para aplicar el tema antes de que cargue el perfil del usuario (evita flash). (4) Actualizar el `<meta name="theme-color">` dinamicamente segun el tema activo. (5) Para usuarios no autenticados, leer/escribir solo en localStorage. Considerar dejar este feature como premium solo si se justifica — por ahora libre para todos parece razonable.

### [FB-091] Busqueda no tolera espacios extra ni puntuacion del titulo

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** El cuadro de busqueda hace match literal contra el titulo. Si el usuario escribe `terminator ` (con espacio al final), encuentra "Terminator Resistance Annihilation Line" pero NO "Terminator: Resistance", porque en este ultimo despues de "Terminator" viene `:` y no un espacio. Lo mismo pasa con otros separadores (guiones, dos puntos, comas) y con espacios iniciales/finales del query. El comportamiento esperado es que la busqueda sea tolerante a puntuacion y espacios sobrantes.
- **Causa tecnica:** En `src/games/games.service.ts:205` y `:222` la query se construye como `{ title: { [Op.iLike]: `%${query}%` } }`. No hay normalizacion del input ni del campo comparado.
- **Solucion propuesta:** (1) Quick win: hacer `trim()` y colapsar espacios multiples del query antes de la comparacion. (2) Tokenizacion: dividir el query por whitespace y aplicar AND de varios `ILIKE %token%` — asi `"terminator resistance"` matchea independiente de si entre ambas palabras hay `:`, `-` o espacio. (3) Normalizar puntuacion: tanto en el query como en el lado del titulo, comparar contra una version sin puntuacion (regex `[^a-z0-9 ]` → eliminado). Opciones: agregar columna generada `title_normalized` indexada, o usar `regexp_replace` en la query (mas lento pero sin migracion). (4) Robusto a largo plazo: activar extension `pg_trgm` y usar similarity para fuzzy match con ranking — soporta tipos, abreviaciones y orden distinto de palabras. Empezar por (1)+(2)+(3) que cubren el caso reportado; dejar (4) para cuando el catalogo crezca.

### [FB-092] "Similar" siempre muestra los mismos juegos y recomienda mal

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En la ficha del juego, el tab "Similar" siempre devuelve los mismos juegos (independiente del juego en el que estes) y las recomendaciones no son buenas. El usuario espera ver juegos relacionados al que esta viendo (mismo genero principal, plataformas similares, tematica parecida), pero recibe lo que parece un listado generico.
- **Causa tecnica:** En `completr-node-frontend/src/app/features/games/game-detail/game-detail.ts:191`, `loadSimilarGames(game)` toma solo `game.genres?.[0]` (el primer genero) y llama `getGames({ limit: 10, genre: genre.code })`. La query del backend ordena por defecto (probablemente `createdAt desc` o algun orden estable), por lo que para cualquier juego cuyo primer genero coincida, devuelve siempre los mismos 6 juegos (los primeros 10 menos el actual, slice a 6). No hay aleatoriedad ni se consideran los demas generos, plataformas o etiquetas del juego.
- **Solucion propuesta:** (1) Quick fix: en lugar de tomar solo `genres[0]`, pasar todos los generos del juego al backend y matchear por interseccion (al menos uno en comun) con ranking por cantidad de generos compartidos. (2) Aleatorizar dentro del pool: traer 30-50 candidatos y elegir 6 aleatorios para que el tab no se vea repetitivo cuando uno navega entre juegos del mismo genero. (3) Endpoint dedicado en backend `GET /games/:id/similar` que encapsule la logica: matchear por generos compartidos, sumar score por plataformas comunes, opcionalmente penalizar juegos muy distintos en duracion o decada, y devolver el top N con randomizacion estable (seed por gameId + dia para que no cambie en cada refresh). (4) Largo plazo: aprovechar `tags` de RAWG (cuando se ingesten) que son mas granulares que generos y mejoran la similaridad notablemente. Considerar tambien co-ocurrencia: "usuarios que tienen X en su backlog tambien tienen Y" — esto requiere masa critica de usuarios.

### [FB-093] Falta glosario/ayuda que explique los campos del backlog (ratio, personal, real, etc.)

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Cada entrada del backlog muestra varios valores numericos: score, duracion estimada, real duration, ratio, personal ratio, status, etc. Los nombres son cortos y para un usuario nuevo no es obvio que significa cada uno (que es "personal" vs "real", como se calcula el ratio, por que hay dos ratios distintos). Hoy no existe en la app un lugar donde se explique. El usuario tiene que inferir el significado o preguntar. Esto sube la barrera de entrada y diluye el valor de los datos que el propio usuario ingreso.
- **Solucion propuesta:** Combinar dos enfoques. (1) **Pagina de ayuda** dedicada en `/help` (o `/guide`) con secciones por concepto: "Backlog", "Ratio y Personal Ratio", "Completr Score vs Aggregate Score", "Estados (no_started, playing, completed, abandoned)", "Wishlist vs Favorites vs Listas". Cada seccion con definicion, ejemplo numerico (ej: Florence 82 pts / 1h = ratio 82), y screenshot anotado. Link en el footer y en el menu de usuario. Implementacion: paginas estaticas en Angular (no contenido CMS por ahora). (2) **Tooltips contextuales**: en la vista diary y en el modal de backlog, agregar `?` clickeables junto a cada label (Ratio, Personal, Real, etc.) que abran un popover con la definicion corta y un link "Ver mas" que lleve a la seccion correspondiente de `/help`. (3) Considerar onboarding ligero para usuarios nuevos: un solo tour de 3-5 pasos la primera vez que abren el backlog, que apunte a los conceptos mas importantes (ratio + personal ratio + real duration). Saltable y solo se muestra una vez (`User.hasSeenBacklogTour` o flag en localStorage). El onboarding NO reemplaza la pagina de ayuda — es complemento para descubrir que existen los conceptos.

### [FB-094] La descripcion del saved view empuja la lista del backlog hacia abajo

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la vista del backlog, cuando un saved view tiene descripcion/comentario, ese texto se renderiza encima de la lista y empuja todos los juegos hacia abajo. Al alternar entre vistas con y sin descripcion, el layout salta y la lista cambia de posicion en pantalla. La interfaz deberia mantenerse estable: alternar vistas no deberia mover la lista de juegos.
- **Solucion:** En `backlog-list.html` se removio el `@if (activeFilterDescription())` que envolvia el `<p>` de descripcion. Ahora el parrafo siempre se renderiza con `min-h-[1.25rem]`, asi reserva el espacio independiente de si la vista actual tiene descripcion o no. Al alternar entre vistas con y sin descripcion el resto del layout (lista de juegos) ya no se mueve.

### [FB-095] Paginacion solo tiene Previous/Next, no permite saltar a otra pagina

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** El componente `ui-pagination` actual (usado en backlog, wishlist, feed, etc.) solo expone botones "Previous" / "Next" y la leyenda `X-Y of Z`. Para ir a la ultima pagina de una lista de 500 items con limit 100, el usuario tiene que hacer click 4 veces en Next. No hay forma de saltar a una pagina especifica ni de ir directo al inicio/final. El patron actual fue suficiente para listas chicas pero deja de escalar cuando el backlog crece.
- **Causa tecnica:** `completr-node-frontend/src/app/shared/ui/pagination/ui-pagination.html` solo renderiza dos botones (`prev()`, `next()`) y un label con el rango. No hay logica de numeros de pagina ni de salto.
- **Solucion propuesta:** Extender `ui-pagination` con numeros de pagina visibles + botones de salto. Patron estandar: `« 1 ... 4 [5] 6 ... 20 »`. Reglas: (1) Siempre mostrar primera y ultima pagina. (2) Mostrar la pagina actual + 1-2 vecinos a cada lado. (3) Insertar `...` cuando hay un gap. (4) Botones `«` (primera) y `»` (ultima) explicitos. (5) En mobile, reducir el numero de vecinos visibles para no romper el layout — o reemplazar por input "Go to page N". El componente debe exponer un metodo `goToPage(n)` ademas de `prev`/`next` existentes y emitir el mismo evento que ya consumen las vistas. Como es un componente compartido, el fix beneficia automaticamente a todas las vistas paginadas (backlog, wishlist, feed, list-detail, etc.).

### [FB-096] En el perfil de otro usuario, la actividad deberia aparecer primero

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al entrar al perfil publico de otro usuario (`/user/:username`), las secciones aparecen en un orden que no refleja lo que el visitante quiere ver primero. Lo mas valioso al visitar a otra persona suele ser "que ha estado haciendo ultimamente" — completados recientes, abandonos, reseñas, juegos agregados — y eso hoy queda mas abajo o disperso entre otras secciones (backlog, listas, favoritos, wishlist). El comportamiento esperado se acerca a Trakt/Letterboxd, donde la actividad reciente es el hero del perfil.
- **Solucion propuesta:** (1) Reordenar la pagina `public-profile` para que la seccion de actividad reciente sea la primera bajo el header del usuario (avatar + bio + stats). Las demas secciones (backlog, listas seguidas, favoritos, wishlist, reseñas) quedan debajo. (2) Reutilizar el componente del feed de actividad para renderizar las actividades del usuario con el mismo formato (mismas cards, mismos iconos por tipo de evento, mismo agrupamiento por dia si aplica). Backend: ya existe registro de actividad (`game_reviewed`, `game_completed`, etc.) — exponer `GET /users/:username/activity` con paginacion si no existe ya. Frontend: el componente del feed debe aceptar como input la fuente de datos (mi feed vs feed de otro usuario) para reutilizar la UI sin duplicar. (3) Limitar la actividad mostrada en el perfil a las ultimas N (ej: 10-15) con un boton "Ver toda la actividad" que lleve a `/user/:username/activity` con paginacion completa, mismo patron que reseñas (FB-083). (4) En el self-view propio mantener el orden actual o aplicar el mismo cambio — decidir si la actividad propia tambien debe ir primero o si en self-view el backlog es mas util arriba.

### [FB-097] Tabs del perfil obligan a hacer scroll horizontal en pantallas pequeñas

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En el perfil del usuario (propio y publico) la fila de pestañas (Backlog, Listas, Favoritos, Wishlist, Reseñas, Actividad, etc.) se sale del ancho de la pantalla cuando el viewport es pequeño (mobile o ventana de escritorio angosta). El usuario tiene que hacer scroll horizontal para ver las pestañas ocultas, y muchas veces ni se da cuenta de que existen porque no hay indicador visual de que hay mas. La experiencia mobile se degrada y oculta secciones importantes.
- **Solucion propuesta:** (1) **Tabs colapsadas con scroll horizontal indicado**: mantener la fila scrollable pero agregar gradiente lateral (fade right) que indique visualmente que hay mas contenido a la derecha. Auto-scroll a la tab activa al cargar para que siempre sea visible. (2) **Overflow menu**: cuando las tabs no caben, mostrar las primeras N y un boton "Mas" (`···`) que abre dropdown con el resto. Patron usado por Material y Bootstrap. (3) **Cambio a selector en mobile**: bajo un breakpoint (ej: `sm`), reemplazar la fila de tabs por un `<select>` o dropdown con la lista de secciones. Patron usado en Github en mobile. (4) **Iconos en lugar de texto en mobile**: si los labels son cortos, dejar solo el icono representativo de cada tab para ahorrar ancho. Tooltip al tocar/hover para el label completo. La opcion (3) suele dar mejor UX en mobile pequeño, (1) o (2) en tablet/desktop angosto. Considerar aplicar la misma solucion en otras vistas con tabs (game detail tiene tabs de Overview/Reviews/Similar/Lists/etc. que pueden tener el mismo problema).

### [FB-098] En pantallas grandes el perfil de otros usuarios se ve pequeño y vacio

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En desktop con viewports anchos, el perfil de otro usuario (`/user/:username`) se ve subutilizado: el contenido ocupa solo el centro y queda mucho espacio horizontal vacio a los lados. Sumado a la decision de FB-096 (que la actividad sea lo primero que se vea), la pagina puede aprovechar el ancho disponible para mostrar mas informacion sin scroll vertical. Hoy se siente "vacio" — falta densidad visual en pantallas grandes.
- **Solucion propuesta:** Layout de dos columnas en desktop (>= `lg` o `xl`): **columna izquierda fija (~30-40%)** con el feed de actividad del usuario (paginado o con scroll propio); **columna derecha (~60-70%)** con las pestañas seleccionables (Backlog, Listas, Favoritos, Wishlist, Reseñas, etc.). Detalles: (1) Si la actividad del usuario es privada (porque `User.isPublic = false` y no eres tu mismo, o por un futuro flag mas granular como `isActivityPublic`), la columna izquierda muestra un mensaje "Actividad privada" o se oculta y la derecha ocupa todo el ancho. Decidir entre mensaje vs colapso al implementar — mensaje informativo es mas honesto, colapso aprovecha mas el ancho. (2) En mobile y tablet, mantener layout de una sola columna con la actividad arriba (segun FB-096) y las pestañas debajo. (3) Reusar el componente del feed con input para el username (igual que en FB-096). (4) La columna izquierda con `position: sticky` para que la actividad acompañe el scroll cuando el usuario explora las pestañas de la derecha — sensacion de "dashboard" en vez de listado lineal.

### [FB-099] La seccion de Security muestra "Last used" desactualizado para la sesion activa

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** En la pagina de Security (listado de sesiones activas) la sesion del propio dispositivo muestra "Last used 15h" cuando el usuario la esta usando en ese mismo momento. El campo no refleja la actividad real — siempre muestra un timestamp viejo aunque haya tráfico reciente desde esa sesion.
- **Causa real:** El refresh ya rota tokens (delete + create) y el nuevo `RefreshToken` tiene `lastUsedAt: new Date()` desde `createRefreshToken`. Pero `lastUsedAt` solo se actualiza cuando el access token expira y dispara refresh — con `ACCESS_TOKEN_TTL=15m` esto deberia ser frecuente, pero entre refreshes el campo queda igual al ultimo refresh, no a la ultima actividad real. Si el usuario abre /settings/security justo despues de un periodo idle largo seguido de un refresh reciente, el campo se ve "fresco" — pero el feedback reflejaba la percepcion de que no se actualizaba en tiempo real.
- **Solucion:** Update on refresh (opcion 1 elegida), implementado via JWT `sid` claim + middleware throttled. (1) `JwtPayload` extendido con campo opcional `sid` (sessionId del refresh token asociado). (2) `auth.service.login/register/refresh` reordenados: primero `createRefreshToken` (para obtener `sessionId`), luego `signAccessToken` con `sid` incluido en payload. (3) Nueva funcion `tokenService.touchSessionLastUsed(sessionId)` con cache in-memory (`Map<sessionId, lastUpdateMs>`) y throttle de 60s — actualiza `RefreshToken.lastUsedAt` solo si paso mas de un minuto desde el ultimo update de esa sesion (evita write-per-request manteniendo granularidad util). (4) `authMiddleware` llama a `touchSessionLastUsed(payload.sid)` fire-and-forget despues de verificar el access token (`.catch(() => {})` para no romper la request si DB falla). Resultado: "Last used" refleja actividad real con granularidad de 1 minuto. Tokens emitidos pre-cambio no tienen `sid` y seguiran sin actualizar `lastUsedAt` hasta que el usuario haga refresh (max ~15min por TTL del access token).

### [FB-100] Los shortcuts de status en el navbar cambian la URL pero no refrescan el backlog

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** El navbar tiene tres shortcuts (Done, Play, Total) que llevan al backlog con un filtro de status preaplicado. Si el usuario esta en otra pagina y presiona uno, navega al backlog correctamente y se aplica el filtro. Pero si despues presiona otro shortcut (estando ya en el backlog), la URL cambia pero la vista no se actualiza — sigue mostrando el filtro anterior. Solo refrescando el navegador (F5) los cambios toman efecto. Mismo problema si el usuario ya esta en el backlog y presiona cualquiera de los shortcuts: el filtro no se aplica hasta refrescar.
- **Causa tecnica:** `BacklogList.ngOnInit` leia los query params via `route.snapshot.queryParamMap` (snapshot, no reactivo). Cuando el Router reusa la misma instancia del componente al navegar entre `/backlog?status=X` y `/backlog?status=Y`, `ngOnInit` no se vuelve a ejecutar y los filtros quedan congelados.
- **Solucion:** Refactor a patron reactivo con signals (Angular 21 idiomatico). (1) Reemplazado `route.snapshot.queryParamMap` por `toSignal(this.route.queryParamMap)` en `backlog-list.ts`. (2) Agregada `savedFiltersLoaded` signal para sincronizar con la carga inicial de saved filters. (3) `effect()` que observa `queryParamMap` + `savedFiltersLoaded` y llama a `applyFiltersFromUrl(params)` cada vez que cambian los query params. (4) Extraidos metodos `applyFiltersFromUrl`, `applySavedFilterFromUrl` y `resetFilterState` para separar la logica reactiva de la logica de UI (la `applySavedFilter` original mantiene el comportamiento de toggle para clicks en chips, mientras que `applySavedFilterFromUrl` solo aplica sin togglear, lo correcto para navegacion). (5) `ngOnInit` queda mas chico: solo carga datos, no aplica filtros — el effect se encarga. Probado: al alternar shortcuts Done/Play/Total estando en `/backlog`, la vista refresca sin F5.

### [FB-101] Evaluar si la app deberia tener enlaces a la landing/webpage publica

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Hoy `completr.app` (landing) y `web.completr.app` (app autenticada) son dos sitios separados, y desde la app no hay forma directa de volver a la landing. La pregunta es si conviene exponer enlaces desde la app hacia la web publica — y para que casos especificos. Sin esto, el usuario que entra a la app no tiene punto de retorno al material publico (about, changelog, pricing, blog, etc.) salvo cambiando la URL manualmente.
- **Casos de uso donde tendria sentido:**
    - **Footer global**: enlaces a About, Changelog, Pricing, Privacy, Terms — todos viven en la landing.
    - **Pre-auth pages (login, register)**: link al landing para que un visitante curioso entienda que es Completr antes de registrarse.
    - **Upgrade a Premium**: el flujo "Hazte premium" probablemente vive en la landing (pricing + Stripe/checkout). Desde Settings / banner premium, link directo.
    - **Logo del navbar**: hoy probablemente lleva al home de la app. Decidir si en estados especiales (no autenticado, error 404) deberia llevar a la landing.
    - **Changelog**: si las release notes viven en la landing (`completr.app/changelog`), tener un link en Settings o en un menu del navbar.
- **Solucion propuesta:** No es un fix puntual, es una decision de IA: definir el "mapa" de cuando la app linkea a la landing y vice versa. Pasos: (1) Listar todas las paginas/secciones de la landing que existen o se planean (about, changelog, pricing, privacy, terms, blog). (2) Decidir cuales son alcanzables desde dentro de la app y desde donde (footer global vs settings vs banners contextuales). (3) Asegurarse que los links abren en la misma pestaña si es navegacion natural (footer → about) y en pestaña nueva si interrumpe el flujo del usuario (ej: leer terms mientras edita perfil). (4) En la direccion inversa, la landing deberia tener CTAs claros para que el visitante anonimo entre a la app (`web.completr.app/register`, `/login`). Algunos de estos puntos ya estan en FASE 3 (landing + changelog), pero conviene incluir el "pegado" entre los dos sitios como parte de ese trabajo, no como afterthought.

### [FB-102] Falta busqueda avanzada de juegos por genero, año de lanzamiento y otros campos

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** La busqueda actual de juegos solo matchea por titulo (ILIKE sobre `game.title`). No hay forma de filtrar por genero, año de lanzamiento, plataforma, rango de score/duracion, tags u otros atributos del juego. Esto es limitante: si un usuario quiere descubrir RPGs de los 2010s, o juegos cortos de plataformas que tiene, no tiene como armar esa query desde la UI. Tambien afecta admin (no puede listar juegos por genero para enriquecer datos) y descubrimiento social (no se puede compartir links a busquedas filtradas). Relacionado con FB-024 (filtros por fuente de datos en admin).
- **Solucion propuesta:** (1) Backend: extender `GET /games` para aceptar filtros adicionales: `genres` (lista de codes/ids), `platforms`, `release_year_from`, `release_year_to`, `min_score`, `max_score`, `min_duration`, `max_duration`, `is_dlc` (bool). Mantener `search` por titulo como ya esta. Validar combinaciones (ej: rangos coherentes). (2) Frontend: vista `/games` con panel de filtros avanzados (drawer lateral igual que backlog filters) — selector multi de generos, selector multi de plataformas, range pickers para año/score/duration, toggle DLC. Persistir filtros en query params para que sean compartibles via URL. Mostrar resultados en grid con paginacion. (3) Considerar guardar busquedas avanzadas como "saved searches" (similar a saved filters del backlog) — feature premium o no, evaluar. (4) Cuando entren tags de RAWG (Fase 3+), agregarlos como filtro tambien — son mas granulares que generos.

### [FB-103] Game shelf de otros usuarios no necesita los tres view modes

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En FB-081 se agregaron tres view modes (cards, grid, table) tanto al `/game-shelf` propio como al `/user/:username/game-shelf` publico. Para el shelf ajeno los tres modos son overkill — la mayoria de usuarios solo quiere echar un vistazo a la coleccion, no compararla por columnas ni alternar entre densidades. Mantener los tres modos en una vista de consumo agrega ruido visual al toggle sin aportar valor real.
- **Solucion propuesta:** En `user-game-shelf.html`, quitar el toggle de view modes y dejar solo el modo "cards" (diary-like) que es el mas legible para una vista de perfil ajeno. Quitar tambien el signal `viewMode` y `setViewMode` de `user-game-shelf.ts` (o reutilizar si en el futuro se decide reintroducir un modo alternativo). El shelf propio (`/game-shelf`) mantiene los tres modos — alli el usuario gestiona su coleccion y la densidad importa.

### [FB-104] Perfil ajeno: aplicar paginacion consistente con maximo 50 por pagina en todas las secciones

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al ver el perfil publico de un usuario (`/user/:username`), las secciones de resumen muestran listas truncadas (5-10 items) con link "View All" a vistas dedicadas paginadas. Las vistas dedicadas (`/user/:username/backlog`, `/favorites`, `/wishlist`, `/game-shelf`) ya tienen `PAGE_SIZE = 50`. El problema es la inconsistencia: en la pagina del perfil mismo no hay paginacion — son snippets cortados con un boton "View All" que cambia de pantalla. La experiencia esperada (estilo Letterboxd/Trakt) es poder paginar in-place sin perder contexto.
- **Solucion propuesta:** (1) Decidir el patron: dejar los snippets actuales pero agregar paginacion in-place a cada seccion (Backlog, Game Shelf, Favorites, Wishlist, Reviews, Following Lists, Activity) con limit=50 — el "View All" pasa a ser opcional o se elimina. (2) Reutilizar `<ui-pagination>` ya existente en cada seccion del perfil. (3) Verificar que todos los endpoints `GET /users/:username/<seccion>` aceptan `limit` y `offset` y devuelven `total`. (4) Si alguna seccion no esta paginada en backend, agregar paginacion (limit max 50). (5) Considerar performance: cargar primero solo la primera pagina de cada seccion, no las 50 completas. Relacionado con FB-096 (orden de secciones en perfil ajeno) y FB-098 (layout dos columnas en desktop).

### [FB-105] Total de juegos en el shelf publico no coincide con el real

- **Fecha:** 2026-05-20
- **Severidad:** medio
- **Estado:** resuelto
- **Reportado por:** Esteban
- **Descripcion:** Al ver el game shelf de otro usuario (`/user/:username/game-shelf`), el contador "X games" en el header muestra un numero distinto al numero real de juegos visibles/disponibles. Probablemente el backend devuelve un `total` que incluye entries no visibles (ej: filtrados por privacidad/visibilidad), o el frontend cuenta diferente. Tambien puede ser que el endpoint paginado devuelva `total` correcto pero el filtro post-fetch en frontend reste items, dejando el contador desalineado con la cantidad mostrada.
- **Causa tecnica:** `findPublicGameShelfByUserId` (y tambien `findGameShelfByUserIdPaginated` del propio shelf) usaban `findAndCountAll` con `include: [{ model: Game, include: [{ model: Genre }] }, Platform, User]`. Como `Game hasMany Genre` (via tabla pivote `game_genre`), el JOIN duplica las filas de GameShelf una vez por cada Genre del juego. Sequelize `count` cuenta filas joinadas, no GameShelfs distintos — por eso el total venia inflado (ej: shelf real de 12 juegos podia reportar 30+ si los juegos tenian ~3 generos en promedio).
- **Solucion:** Agregado `distinct: true` al `findAndCountAll` de ambas funciones en `game-shelf.service.ts`. Sequelize ahora cuenta GameShelf.id distintos, ignorando la duplicacion por JOIN. Auditados los otros services paginados — wishlist, favorites y backlog tienen includes solo 1:1 (belongsTo Game/Platform/User sin nested hasMany), por lo que no necesitan `distinct`. Games ya tenia `distinct: true` desde antes.

### [FB-106] Falta boton de limpiar texto (X) en la barra de busqueda

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** La barra de busqueda (`ui-search-bar`, usada en backlog, game-shelf, wishlist, lists, games, feed) no tiene boton para limpiar el texto. Si el usuario quiere borrar la query y volver al estado sin filtro, tiene que seleccionar todo y borrar manualmente con Backspace/Delete. Es un pattern estandar que casi todas las apps modernas tienen (icono "X" o "close" al lado derecho del input que aparece cuando hay texto).
- **Solucion propuesta:** Agregar un boton X dentro del componente `ui-search-bar` (probablemente en `shared/ui/search-bar/`). Estilo: icono `close` o `cancel` pequeno (`material-icons text-base text-fg-muted hover:text-fg`), posicionado absoluto al lado derecho del input, visible solo cuando `value` tiene contenido. Click → emite `valueChange('')` y limpia el campo. Como es un componente compartido, el fix se aplica a todas las vistas que lo usan. Considerar tambien atajo de teclado Escape para limpiar (UX bonus).

### [FB-107] Wishlist puede prescindir de la vista tabla y dejar solo grid con ratio + reorder

- **Fecha:** 2026-05-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** La wishlist hoy tiene dos modos (tabla y grid). La tabla repite informacion (score, duration, ratio en columnas) que para una cola de priorizacion es mucho mas de lo que se necesita — el ratio es la unica metrica que importa para decidir que jugar despues. El modo grid es mas limpio visualmente pero hoy no muestra el ratio. Posicion ya se mostro en el badge (`#N`, FB-076). Falta la forma de mover items entre posiciones dentro del grid; en tabla hay flechas arriba/abajo.
- **Solucion propuesta:** (1) Eliminar el toggle de modo en la wishlist y dejar solo grid de caratulas (manteniendo el badge `#N` ya implementado). (2) Agregar el ratio como un badge sutil en cada card del grid (ej: esquina inferior izquierda o sobre la caratula, `bg-brand/80 text-white text-xs font-bold` con prefijo "R" o solo el numero). Si la entrada no tiene ratio (sin score o sin duration), no mostrar nada. (3) Para reordenar dentro del grid: mejor camino es drag-and-drop con Angular CDK DragDropModule (ya en backlog en FB-082 pendiente — implementar ambos juntos). Alternativa intermedia: en el hover de cada card mostrar dos flechas pequenas (arriba/abajo) que llaman a `moveUp`/`moveDown` ya existentes en `wishlist-view.ts`. (4) Removed: signal `viewMode`, toggle buttons, render condicional `@if viewMode === 'table'`. Mantener el resto del template con la version grid limpia. Relacionado con FB-082 (drag-and-drop wishlist) — al implementar uno conviene resolver el otro.
