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
