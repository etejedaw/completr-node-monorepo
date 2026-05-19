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
- **Estado:** pendiente
- **Descripcion:** Cuando un usuario A sigue a un usuario B, el usuario B no tiene ninguna forma de enterarse. El sistema de notificaciones esta planeado para Fase 4 y no es prioridad ahora, pero mientras tanto los usuarios no tienen visibilidad de nuevos seguidores.
- **Solucion propuesta:** Como solucion temporal antes del sistema de notificaciones, registrar una actividad en el feed del usuario B cuando alguien lo sigue (ej: "Usuario A started following you"). Esto reutiliza la infraestructura de Activity que ya existe sin necesidad de implementar notificaciones completas.

### [FB-010] Backlog propio no tiene paginacion y carga demasiados registros

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** El backlog propio (GET /users/me/backlog) carga todos los registros de una vez, lo que se vuelve lento cuando un usuario tiene muchos juegos. El backlog publico de otro usuario ya tiene paginacion con limit/offset (max 50), pero el propio no. Con usuarios que tienen 100+ entradas la tabla se siente pesada.
- **Solucion propuesta:** Agregar paginacion al backlog propio usando el mismo PaginationQuerySchema pero con un limit mas alto (100) para que el usuario vea mas registros por pagina que en la vista publica. Aplicar la misma paginacion con limit 100 a game-shelf, wishlist y favorites propios. Agregar controles de paginacion en el frontend de todas estas vistas.

### [FB-011] Lists y saved views sin paginacion

- **Fecha:** 2026-04-19
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** Las vistas de listas propias (GET /lists/me) y saved views (GET /users/me/saved-filters) cargan todos los registros sin paginacion. Aunque es poco probable que un usuario tenga muchas entradas (free tiene limite de 5), conviene tener paginacion por consistencia y para usuarios premium con listas ilimitadas.
- **Solucion propuesta:** Agregar paginacion con limit 25 a lists y saved views. Agregar controles de paginacion en el frontend de ambas vistas.

### [FB-012] Notas del backlog visibles en perfil publico de otro usuario

- **Fecha:** 2026-04-19
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** La columna de notas del backlog es visible cuando un usuario ve el perfil o backlog publico de otro usuario. Las notas son personales y pueden contener comentarios privados que el usuario no espera que otros vean.
- **Solucion propuesta:** Ocultar la columna de notas en el backlog publico. En el backend, excluir el campo notes del serializer cuando se consulta el backlog de otro usuario (GET /users/:username/backlog). En el frontend, no mostrar la columna de notas en las vistas publicas de backlog.

### [FB-013] Login no redirige a la URL original despues de autenticarse

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Si un usuario no logueado accede a una URL protegida (ej: https://web.completr.app/games/chrono-trigger), el authGuard lo redirige al login. Pero al iniciar sesion, lo manda al feed (ruta por defecto) en vez de a la pagina que intento visitar originalmente. Esto obliga al usuario a navegar de nuevo a donde queria ir.
- **Solucion propuesta:** Guardar la URL original en un query param (ej: /login?returnUrl=/games/chrono-trigger) o en el state del router al momento de redirigir desde el authGuard. Despues del login exitoso, redirigir a esa URL en vez de al feed.

### [FB-014] Progreso de listas solo cuenta completados, no abandonados

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** La barra de progreso en listas (getListProgress) solo cuenta backlogs con status "completed". Los juegos abandonados no se contabilizan, pero deberian contar como progreso ya que el usuario ya paso por ese juego (lo jugo y decidio dejarlo).
- **Solucion propuesta:** Modificar getListProgress en lists.service.ts para contar backlogs con status "completed" o "abandoned" (usar Op.in con ambos valores). Actualizar el frontend si es necesario para reflejar el cambio en el label (ej: "played" en vez de "completed").

### [FB-015] No existe opcion "PC" generica al agregar juego al backlog o shelf

- **Fecha:** 2026-04-19
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Al agregar un juego al backlog o al game shelf, el selector de plataformas solo muestra las tiendas especificas (Steam, GOG, Epic, etc.) pero no hay una opcion "PC" generica. Hay juegos antiguos que no estan disponibles en ninguna tienda digital (ej: Wolfenstein 2009 que fue removido de venta) y el usuario los tiene como ISOs o copias fisicas de PC. Sin la opcion PC generica no hay forma de registrarlos con la plataforma correcta.
- **Solucion propuesta:** Verificar si la plataforma "PC" existe en la tabla de plataformas. Si no existe, crearla. Asegurar que los juegos que tienen plataformas de PC (Steam, GOG, Epic, etc.) tambien tengan vinculada la plataforma "PC" generica, o permitir que el usuario seleccione "PC" manualmente aunque el juego no la tenga asociada.

### [FB-016] Seccion "Latest Completr Lists" en games-browse sigue mostrando placeholder

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** En la pagina de games (/games), la seccion "Latest Completr Lists" todavia muestra el placeholder "Coming soon..." a pesar de que el sistema de listas ya esta implementado y hay listas creadas. Los usuarios ven una seccion vacia que deberia estar mostrando contenido real.
- **Solucion propuesta:** Reemplazar el placeholder con listas reales. Mostrar las listas oficiales (creadas por admin) o las listas publicas mas recientes/populares. Requiere un endpoint o reutilizar GET /lists/search para obtener listas destacadas.

### [FB-017] Flash de placeholders al cargar games-browse

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** Al entrar a la pagina de games (/games), se muestra brevemente el placeholder "Coming soon..." y los textos estaticos antes de que carguen los datos reales (secciones Latest Added, Top Rated, etc.). Se produce un flash visible donde la pagina se ve incompleta por un instante antes de renderizar el contenido.
- **Solucion propuesta:** Agregar skeleton loaders o un estado de carga que reemplace los placeholders mientras se obtienen los datos. Alternativamente, ocultar las secciones hasta que los datos esten listos para evitar el flash.

### [FB-018] No hay forma de reportar bugs generales ni ver estado de reportes

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** Los usuarios solo pueden reportar errores en juegos (GameReport), pero no tienen forma de reportar bugs generales de la app (ej: un boton que no funciona, un error de UI, una feature rota). Ademas, no pueden ver el estado de los reportes que ya enviaron (ni de juegos ni generales), asi que no saben si su reporte fue recibido, aprobado o rechazado.
- **Solucion propuesta:** Crear un sistema de reportes generales (BugReport o similar) con campos como titulo, descripcion y categoria (bug, sugerencia, etc.). Agregar una vista donde el usuario pueda ver todos sus reportes (tanto de juegos como generales) con su estado actual (pendiente/aprobado/rechazado). Panel admin para gestionar los reportes generales igual que los de juegos.

### [FB-019] Feed de actividad sin paginacion

- **Fecha:** 2026-04-20
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** El feed de actividad (GET /feed) carga todas las actividades de una vez. Si un usuario sigue a mucha gente, el feed crece rapidamente y carga demasiada informacion innecesaria. No tiene sentido mostrar todo el historial de actividad de golpe.
- **Solucion propuesta:** Agregar paginacion al feed con limit/offset y un limit de 25 actividades por pagina. Agregar controles de paginacion o scroll infinito en el frontend.

### [FB-020] Boton de favoritos en game detail poco visible

- **Fecha:** 2026-04-20
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** La estrella de favoritos en el banner del game detail no se nota lo suficiente. Los usuarios no se dan cuenta de que desde ahi pueden agregar un juego a favoritos. El icono se pierde sobre la imagen de fondo y no transmite que es interactivo.
- **Solucion propuesta:** Hacer la estrella mas visible: aumentar tamano, agregar sombra o fondo semitransparente detras del icono para que contraste con el banner, o agregar un tooltip "Add to favorites". Tambien considerar un efecto hover mas evidente para que se note que es clickeable.

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
- **Estado:** pendiente
- **Descripcion:** El campo "Edition" en Game Shelf es un cuadro de texto libre. Los usuarios esperan opciones predefinidas porque con texto libre cada persona escribe lo mismo de formas distintas (ej: "estandar", "stander", "ESTANDARD", "Standard"). A mayor escala de usuarios esto genera un millon de variantes para el mismo valor, haciendo el campo inutil para filtrar o agrupar.
- **Solucion propuesta:** Mantener el campo como texto libre pero agregar botones de sugerencia con las ediciones mas comunes (ej: "Standard", "Deluxe", "GOTY", "Collector's", "Digital", "Physical"), similar a como funcionan los botones de precarga de scores de distintas fuentes. El usuario puede clickear una sugerencia para rellenar el campo o escribir un valor custom si ninguna aplica. No cambiar el tipo de dato en el backend — sigue siendo string, solo cambia la UX en el frontend.

### [FB-027] Usuarios confunden Wishlist con la wishlist de Steam/tiendas

- **Fecha:** 2026-04-22
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** Los usuarios asocian "Wishlist" con el concepto de tienda (Steam, PSN, etc.): juegos que quieren comprar. La wishlist actual de Completr es una cola priorizada de juegos del backlog que el usuario quiere jugar pronto, un concepto completamente distinto. Esto genera confusion y preguntas como "la wishlist se puede conectar con la API de Steam?". El nombre actual no comunica la funcion real del feature.
- **Solucion propuesta:** Dos cambios: (1) Renombrar la wishlist actual a un nombre que refleje su funcion de cola de juego. Nombre elegido: "Queue". El rename implica cambios en backend (modelo, rutas, serializers, campo isWishlistPublic en User), frontend (componentes, servicios, sidebar, rutas) y documentacion. (2) Crear un nuevo modulo "Wishlist" real que represente juegos que el usuario quiere comprar/obtener. Este nuevo wishlist apuntaria a Game (no a Backlog, porque el usuario aun no tiene el juego). Modelo similar a Favorites: Wishlist(id, user_id, game_id, position, added_at). A futuro podria conectarse con APIs de tiendas (Steam, PSN, eShop) para notificar al usuario cuando un juego de su wishlist este en oferta.

### [FB-028] Boton "Add Game" en backlog se confunde con crear un juego

- **Fecha:** 2026-04-22
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** El boton "Add Game" en la vista del backlog confunde a los usuarios porque suena a crear un juego nuevo en el catalogo, no a agregarlo al backlog. Ademas, el boton esta en la pantalla de backlog y no en la de games, lo que refuerza la confusion ("por que Add Game no esta en Games?"). La accion real es agregar un juego existente al backlog del usuario.
- **Solucion propuesta:** Cambiar el texto del boton a algo que refleje la accion real, como "Add to Backlog" o "Track Game". Esto deja claro que se esta agregando un juego al backlog, no creandolo.

### [FB-029] Busqueda de juegos no muestra indicador de carga al buscar en RAWG

- **Fecha:** 2026-04-22
- **Severidad:** alto
- **Estado:** pendiente
- **Descripcion:** Cuando el usuario busca un juego que no esta en la base de datos local, la busqueda hace fallback a RAWG para traer resultados externos. Durante ese tiempo de espera no hay ningun indicador visual de que la app sigue buscando. El usuario ve los resultados locales y luego el dropdown se queda quieto hasta que de repente se actualiza con los resultados de RAWG. Ejemplo: al buscar "RE9", primero aparecen los otros RE locales, pero al escribir el "9" la lista se queda congelada un rato hasta que RAWG responde. El usuario no sabe si la app se colgo o si esta cargando.
- **Solucion propuesta:** Mostrar un indicador de carga (spinner o texto "Searching online...") en el dropdown mientras se espera la respuesta de RAWG. El indicador deberia aparecer despues de que la busqueda local no encuentre resultados exactos y se dispare el fallback. Verificar si el indicador "Searching..." que ya existe en el buscador del backlog modal cubre este caso o si solo aplica a la busqueda local.

### [FB-030] Resultados de busqueda no distinguen DLCs de juegos base

- **Fecha:** 2026-04-22
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** Cuando el usuario busca un juego en el dropdown (backlog modal, game shelf, etc.), los resultados no diferencian visualmente entre juegos base y DLCs. Si un juego tiene DLCs con nombres similares al base, el usuario puede seleccionar el DLC por error sin darse cuenta.
- **Solucion propuesta:** Agregar un tag o badge "DLC" junto al titulo del juego en los resultados del dropdown de busqueda. El backend ya tiene el campo isDlc en el modelo Game, solo hace falta que el endpoint de busqueda lo incluya en la respuesta y que el frontend lo renderice como un tag visual en cada resultado.

### [FB-031] Orden del sidebar no refleja el flujo logico del usuario

- **Fecha:** 2026-04-22
- **Severidad:** bajo
- **Estado:** pendiente
- **Descripcion:** El orden actual de las secciones en el sidebar no sigue una progresion logica. Un usuario sugirio reordenar Game Shelf, Backlog y Wishlist para reflejar la relacion del usuario con un juego: "tengo y jugue" (Game Shelf), "tengo y no jugue" (Backlog), "no tengo y quiero" (Wishlist). Este orden cuenta una historia natural de la coleccion del usuario.
- **Solucion propuesta:** Reordenar las secciones del sidebar en el frontend: Game Shelf → Backlog → Queue (ex-Wishlist) → Wishlist (nueva, juegos que quiero comprar). Cambio solo de frontend, no afecta backend ni rutas.

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
- **Estado:** pendiente
- **Descripcion:** Varios usuarios reportan que tienen que iniciar sesion todos los dias. La sesion no persiste entre dias, lo que sugiere que el refresh token no esta funcionando correctamente o esta mal implementado en el frontend. Posibles causas: el token no se renueva antes de expirar, no se persiste correctamente en el almacenamiento del navegador, o el interceptor HTTP del frontend no ejecuta el flujo de refresh cuando el access token expira.
- **Solucion propuesta:** Investigar el flujo completo de refresh token. En el backend: verificar la expiracion del refresh token y que el endpoint de refresh funcione correctamente. En el frontend: revisar el interceptor HTTP para asegurar que detecta respuestas 401, ejecuta el refresh automaticamente, y reintenta el request original con el nuevo access token. Tambien verificar que el refresh token se almacena correctamente (localStorage/cookie) y que no se pierde al cerrar el navegador.

### [FB-036] Boton de RAWG en game detail redirige con slug incorrecto

- **Fecha:** 2026-04-23
- **Severidad:** medio
- **Estado:** pendiente
- **Descripcion:** En la vista de detalle de un juego hay un boton que enlaza a la pagina del juego en RAWG. El problema es que el link usa el slug propio de Completr para construir la URL de RAWG (ej: rawg.io/games/{slug-completr}), pero el slug de Completr no tiene por que coincidir con el de RAWG, lo que provoca que la redireccion falle o lleve a un juego equivocado. La tabla GameExternal almacena el ID numerico de RAWG, no el slug.
- **Solucion propuesta:** Cambiar el boton para que use el ID numerico de RAWG en vez del slug. La URL de RAWG acepta IDs numericos (rawg.io/games/{id}), asi que se puede construir el link con el externalId que ya esta almacenado en GameExternal. Alternativa: almacenar el slug de RAWG en GameExternal al momento de importar el juego y usarlo para el link.

### [FB-037] UI general se siente muy chica

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami (Brave, Ubuntu, modo oscuro)
- **Descripcion:** Los elementos de la interfaz (texto, botones, tablas) se sienten demasiado pequenos en pantallas de escritorio. El usuario siente que todo esta "muy chico" en general. La app fue disenada desktop-first, por lo que el problema no es de responsive sino de tamanos base insuficientes en los estilos globales.
- **Solucion propuesta:** Revisar los tamanos base en styles.css y CSS variables globales: font-size del body, padding de botones, alto de filas de tabla, tamano de iconos. Aumentar el font-size base (actualmente puede estar en 14px o menos, deberia ser al menos 16px). Revisar que los componentes usen rem/em en vez de px fijos para que escalen con el base. Relacionado con FB-039 y FB-043.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** La vista de perfil (/profile y /user/:username) no aprovecha el ancho completo de la pantalla en escritorio. El contenido se ve comprimido en la mitad izquierda o centro, dejando grandes espacios vacios a los lados. Esto se siente especialmente raro en monitores anchos.
- **Solucion propuesta:** Revisar el max-width del contenedor del perfil y ampliarlo para aprovechar mejor el espacio en escritorio. Considerar un layout de dos columnas en pantallas grandes (info del usuario a la izquierda, contenido a la derecha). Relacionado con FB-037 y FB-043.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Un usuario ve que otro tiene el mismo juego dos veces en su backlog y lo encuentra raro. No entiende que es intencional — el sistema permite multiples backlogs del mismo juego para trackear re-plays o distintas plataformas (ej: RE4 completado en PS2, despues re-jugado en PC). El concepto de play_count y multiples runs no es obvio para usuarios nuevos.
- **Solucion propuesta:** Agregar indicadores visuales en el backlog para diferenciar multiples runs del mismo juego: mostrar un numero de run o "play #2" junto al titulo, o agrupar visualmente las entradas del mismo juego. En el perfil publico, considerar mostrar un tooltip o explicacion de por que un juego aparece multiples veces. Tambien evaluar agregar una seccion de ayuda o onboarding que explique el concepto de multiples backlogs.

### [FB-043] Layout general usa muy poco espacio en pantalla de escritorio

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** El contenido de varias vistas (feed, perfil, listas, backlog) ocupa una fraccion pequena del ancho disponible en pantalla de escritorio. El feed por ejemplo usa aproximadamente un cuarto de la pantalla, dejando grandes areas vacias. La app fue disenada desktop-first, por lo que el problema es que los contenedores principales tienen max-width demasiado restrictivos o el layout no aprovecha el espacio disponible.
- **Solucion propuesta:** Auditar los max-width de los contenedores principales en cada vista. Ampliarlos o eliminarlos donde no sean necesarios. Para vistas de contenido central (feed, perfil), considerar layouts de multiples columnas que ocupen el ancho disponible (ej: feed + sidebar de sugerencias). Para vistas de tabla (backlog, game-shelf), usar ancho completo del area de contenido. Relacionado con FB-037 y FB-039.

### [FB-044] Icono de calendario casi invisible en modo oscuro

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami (Brave, Ubuntu, modo oscuro)
- **Descripcion:** Al seleccionar un juego en el Game Shelf, el icono del calendario en el campo "Acquired" (fecha de adquisicion) es casi invisible. El icono no tiene suficiente contraste contra el fondo oscuro del input. Puede ser un problema especifico de Brave en Linux o del tema oscuro del navegador que afecta inputs nativos de tipo date.
- **Solucion propuesta:** Estilizar el input de fecha para que el icono del calendario tenga suficiente contraste en modo oscuro. Usar CSS para colorear el icono nativo (::-webkit-calendar-picker-indicator) o reemplazarlo con un icono propio. Probar en Brave Linux para confirmar que el fix funciona en ese navegador.

### [FB-045] Faltan juegos de Nintendo Switch (ej: Pokemon Scarlet)

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Un usuario quiso agregar Pokemon Scarlet y no lo encontro. La busqueda con fallback a RAWG deberia traer juegos de Switch, pero puede ser que el juego tenga un nombre distinto en RAWG (ej: "Pokemon Scarlet and Violet") o que el mapeo de plataformas de RAWG no incluya Switch correctamente.
- **Solucion propuesta:** Verificar que la plataforma Nintendo Switch esta en la tabla de plataformas y en el mapeo de RAWG (rawg-platform.map.ts). Buscar "Pokemon Scarlet" en RAWG directamente para ver si existe y con que nombre. Si RAWG lo agrupa con Violet (como un solo registro), es una instancia del problema descrito en FB-023.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al agregar un juego al backlog o game shelf, el selector de plataformas muestra todas las plataformas del juego. Si el juego solo tiene una plataforma disponible, el usuario tiene que seleccionarla manualmente. Seria mas comodo que se seleccionara automaticamente.
- **Solucion propuesta:** En el frontend, al cargar las plataformas de un juego en el modal de backlog/shelf, si solo hay una plataforma disponible, preseleccionarla automaticamente en el dropdown. Cambio solo de frontend.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al agregar un juego al backlog, el usuario uso el boton "Add to Shelf" dentro del modal de backlog. El boton indico que el juego fue agregado al shelf (feedback visual de exito), pero al ir al Game Shelf el juego no estaba ahi. Es un falso positivo — el frontend reporta exito sin que la operacion se haya completado realmente. Puede ser un error de HTTP no manejado, un problema de timing, o que el request nunca se envio.
- **Solucion propuesta:** Revisar el flujo de "Add to Shelf" desde el backlog modal. Verificar que el request HTTP se envia correctamente y que los errores se manejan (mostrar error si falla en vez de exito). Probar el flujo completo: crear backlog + add to shelf en la misma transaccion o como requests separados, y asegurar que ambos completen antes de mostrar confirmacion.

### [FB-052] Miniaturas de juegos usan capturas de pantalla en vez de arte oficial

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Las miniaturas de algunos juegos (ej: Hello Kitty Island Adventure) muestran capturas de pantalla (screenshots) en vez de arte oficial o portada del juego. Esto pasa porque RAWG usa el campo "background_image" que a menudo es un screenshot, no un cover art. La app usa backgroundUrl para las imagenes y coverUrl esta reservado para covers reales pero aun no se implementa.
- **Solucion propuesta:** A largo plazo, implementar una fuente de covers reales (SteamGridDB, IGDB) y usar coverUrl para arte oficial. A corto plazo, no hay mucho que hacer porque RAWG no provee covers oficiales de forma consistente. Considerar agregar un campo en el admin editor para subir o linkear una imagen de cover manualmente para juegos donde el background de RAWG no sea adecuado.

### [FB-053] Descripcion de juego en idiomas mezclados y demasiado larga

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** La descripcion del juego Hello Kitty Island Adventure esta mitad en ingles y mitad en aleman (u otro idioma). Esto viene de RAWG que a veces devuelve descripciones en multiples idiomas concatenadas. Ademas, la descripcion es muy larga y no tiene scroll propio, haciendo que la pagina de detalle se extienda demasiado.
- **Solucion propuesta:** Para el problema de idiomas: al importar de RAWG, usar el campo description_raw o parsear la descripcion para quedarse solo con la version en ingles (RAWG suele separar idiomas con un salto de linea doble o un tag de idioma). Para el largo: agregar un "Read more / Read less" que muestre las primeras 3-4 lineas con un boton para expandir, o un contenedor con max-height y overflow scroll.

### [FB-054] Botones de filtrar y limpiar filtros poco visibles en backlog

- **Fecha:** 2026-04-24
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Los botones para abrir el panel de filtros avanzados y para limpiar los filtros aplicados en el backlog no son lo suficientemente obvios. El usuario no los identifica facilmente, lo que dificulta el uso de filtros avanzados y la vuelta al estado sin filtros.
- **Solucion propuesta:** Hacer los botones de filtro mas prominentes: aumentar tamano, usar un icono de filtro (funnel) mas visible, agregar texto descriptivo ("Filters" en vez de solo icono). Para limpiar filtros, mostrar un boton "Clear all filters" mas grande y con color de acento cuando hay filtros activos. Considerar mostrar un indicador visible de cuantos filtros estan activos (badge con numero).

### [FB-055] Logo del sidebar deberia navegar al feed

- **Fecha:** 2026-04-24
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** El logo de Completr en el sidebar no es clickeable o no navega al feed. Los usuarios esperan que hacer click en el logo los lleve a la pagina principal (feed), como en la mayoria de aplicaciones web.
- **Solucion propuesta:** Hacer el logo del sidebar clickeable con navegacion a /feed (o la ruta principal de la app). Cambio simple de frontend: envolver el logo en un routerLink.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** La seccion "Lists" del sidebar solo muestra un link a la pagina de listas. El usuario sugiere que deberia poder expandirse para mostrar las listas creadas (o las favoritas) directamente en el sidebar, permitiendo acceso rapido sin pasar por la pagina de listas.
- **Solucion propuesta:** Agregar un icono de expandir/colapsar junto a "Lists" en el sidebar. Al expandir, mostrar las listas del usuario (primeras 5-10) como sub-items clickeables que lleven al detalle de la lista. Considerar un endpoint ligero que devuelva solo nombre e ID de las listas del usuario para no cargar datos innecesarios. Feature de conveniencia, no urgente.

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
- **Estado:** pendiente
- **Reportado por:** Tami
- **Descripcion:** Al abrir el modal de backlog desde una lista (ej: Rhythm Heaven), el campo Score muestra un badge indicando la fuente del score precargado (ej: "RAWG"). Este badge agrega altura extra al campo y lo desalinea visualmente con el campo Duration que no tiene badge. Los inputs quedan a alturas diferentes, rompiendo la alineacion del formulario.
- **Solucion propuesta:** Ajustar el layout del modal para que el badge de fuente no afecte la altura del campo. Opciones: (1) mover el badge fuera del input (ej: como tooltip o texto debajo), (2) agregar padding equivalente al campo Duration para mantener alineacion, (3) usar position absolute para el badge sin afectar el flow del layout.

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
- **Estado:** pendiente
- **Descripcion:** Cuando un backlog cambia a status "completed" o "abandoned", el sistema auto-remueve el juego de la wishlist. No hay ningun indicador visual en el frontend que le comunique al usuario que esto paso. El juego simplemente desaparece de la wishlist sin explicacion.
- **Solucion propuesta:** Mostrar un toast o notificacion temporal cuando un juego se auto-remueve de la wishlist al completar o abandonar un backlog (ej: "Removed from Wishlist: RE4"). Alternativa: mostrar un mensaje inline en la wishlist indicando que el juego fue removido automaticamente.

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
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** Al tener la sesion abierta en mas de un dispositivo simultaneamente (ej: PC y celular), la sesion se cierra inesperadamente en alguno de ellos. Probablemente el backend invalida el refresh token anterior cuando se emite uno nuevo (rotacion single-token por usuario), por lo que el dispositivo que pidio refresh primero deja sin token valido al otro dispositivo. Apenas el segundo dispositivo intenta renovar, recibe 401 y termina deslogueando al usuario. Posiblemente relacionado con FB-035 (sesion no persiste) — si la rotacion de refresh tokens no soporta multiples sesiones, ambos sintomas pueden tener la misma causa raiz.
- **Solucion propuesta:** Soportar multiples refresh tokens activos por usuario, uno por sesion/dispositivo. Modelar una tabla RefreshToken(id, userId, tokenHash, deviceInfo, createdAt, expiresAt, revokedAt) en vez de guardar un unico token por usuario. Al hacer refresh, rotar solo el token de esa sesion especifica (no invalidar los de otros dispositivos). Agregar endpoint para listar y revocar sesiones activas (util para "cerrar sesion en todos los dispositivos"). Verificar primero el comportamiento actual del backend revisando el modulo de auth — si ya soporta multi-sesion, el bug podria estar en el frontend (interceptor compartiendo estado o pisandose entre tabs).

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
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En la BBDD de Completr se almacena el `rawgId` (numerico) del juego, pero no su `slug` (el "code" que RAWG usa en sus URLs, ej: `the-witcher-3-wild-hunt`). Cuando la UI construye el link "Ver en RAWG", usa el slug propio de Completr asumiendo que coincide con el de RAWG, lo cual no siempre es cierto (Completr puede haber generado un slug distinto, o RAWG puede haberlo cambiado). Resultado: links rotos o que apuntan a un juego incorrecto en rawg.io.
- **Solucion propuesta:** Almacenar tambien el `slug` original de RAWG en el modelo `Game` (campo aparte, ej: `rawgSlug`). Al construir el link externo, usar `rawgSlug` en lugar del slug interno. Cambios requeridos:
    - Migracion para agregar `rawgSlug` (nullable inicialmente).
    - Actualizar el sync/import desde RAWG para popular el campo en nuevos juegos.
    - Backfill: recorrer juegos existentes y completar `rawgSlug` consultando la API de RAWG por `rawgId`. Considerar rate limits.
    - Actualizar el frontend para usar `rawgSlug` en el link externo, con fallback al slug interno si todavia esta vacio.
    - Cambio grande en BBDD, revisar con mas detalle antes de implementar (volumen de juegos, costo del backfill, si RAWG expone el slug en el endpoint de detalle).

### [FB-076] Wishlist en modo grilla no muestra el numero de posicion

- **Fecha:** 2026-05-19
- **Severidad:** bajo
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En la wishlist, al cambiar a la vista en modo grilla, no se muestra el numero de posicion de cada juego dentro de la lista. La wishlist esta ordenada por prioridad (manual o por columna, ver FB-071), por lo que la posicion es informacion relevante: saber si un juego es el #3 o el #27 cambia la lectura. En el modo tabla la posicion se infiere por la fila, pero en grilla se pierde esa referencia.
- **Solucion propuesta:** Mostrar el numero de posicion en cada card del modo grilla de la wishlist. Opciones de UI: (1) badge en una esquina de la card (ej: esquina superior izquierda con "#3"); (2) prefijo en el titulo del juego ("3. The Witcher 3"). Asegurar que el numero se actualice al reordenar (drag & drop) o al aplicar un sort por columna.

### [FB-077] Seccion "Latest Completr Lists" nunca aparece en la pagina de un juego

- **Fecha:** 2026-05-19
- **Severidad:** medio
- **Estado:** pendiente
- **Reportado por:** Esteban
- **Descripcion:** En el detalle de un juego (Games) deberia mostrarse una seccion "Latest Completr Lists" con las listas publicas mas recientes que incluyen ese juego. La seccion nunca aparece, ni siquiera para juegos que sabemos que estan en varias listas publicas. Puede ser que el endpoint no devuelva resultados, que el frontend este filtrando mal, o que la query no este matcheando los juegos correctamente con sus listas.
- **Solucion propuesta:** Diagnosticar el flujo end-to-end: (1) verificar que el endpoint que devuelve "ultimas listas que incluyen este juego" exista y este siendo llamado desde el detalle del juego; (2) revisar la query en backend (joins entre lists, list_items y games, filtros por visibilidad publica y orden por fecha); (3) revisar el frontend (si los datos llegan, comprobar que la seccion se renderice y no este oculta por un guard tipo `if (lists.length === 0)` que falle por shape). Si el endpoint no existe todavia, crearlo: GET /games/:id/lists?limit=N&order=recent devolviendo solo listas publicas. Considerar paginacion futura.
