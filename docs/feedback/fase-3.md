# Feedback de usuarios — Fase 3

> Feedback recopilado de amigos y beta testers usando la app en produccion (web.completr.app).
> Convenciones de formato, estados y severidades documentadas en [`CONTEXT.md`](./CONTEXT.md).

---

## Feedback

### [FB-001] Mas avatares predefinidos (sin uploads custom)

- **Estado:** pendiente
- **Descripcion:** "que locura los avatares ajhsdgjhgsd igual echo de menos poner mi foto". Los usuarios echan de menos poder subir su propia foto de perfil, pero los uploads custom abren toda una superficie de moderacion y storage que no queremos asumir todavia.
- **Solucion propuesta:** No se permitiran uploads de imagenes custom. En su lugar: (1) ampliar el catalogo de avatares predefinidos, (2) crear sets especiales para eventos (Halloween, navidad, lanzamientos, etc.), (3) sets exclusivos para usuarios premium.

### [FB-002] Follow requests para perfiles privados

- **Estado:** pendiente
- **Descripcion:** Permitir que usuarios con perfil privado puedan elegir si reciben solicitudes de seguimiento.
- **Solucion propuesta:** Setting nuevo en `User`: `acceptFollowRequests` (bool, default true). Si el perfil es privado y `acceptFollowRequests = true`, el follow no es automatico: queda en estado `pending` y el dueno aprueba/rechaza. Nuevo modelo `UserFollowRequest` (o estado `pending` en `UserFollower`). Endpoints: listar requests pendientes, aprobar, rechazar. Notificacion al dueno cuando llega una request. Si `acceptFollowRequests = false`, el boton Follow no aparece en perfiles privados.

### [FB-003] Visibilidad granular por seccion (solo yo / amigos / todos)

- **Estado:** pendiente
- **Descripcion:** Que un usuario privado pueda permitir a sus seguidores ver ciertos menus (backlog, shelf, etc.) sin abrir todo el perfil.
- **Solucion propuesta:** Reemplazar los flags booleanos `isQueuePublic`, `isWishlistPublic`, `isFavoritePublic`, `isFeedPublic` por enums con 3 niveles: `private` (solo yo), `friends` (seguidos+seguidores mutuos), `public` (todos). Agregar el mismo enum a backlog y game-shelf (que hoy heredan de `isPublic`). Backend: middleware/helper para resolver visibilidad — necesita conocer relacion de following mutuo (amistad). Migration con default = equivalente al estado actual (true → public, false → private). Frontend: settings de privacidad con dropdowns por seccion + explicacion del nivel "amigos". La "amistad" se define como follow mutuo.

### [FB-004] Promover tags relevantes de RAWG a generos

- **Estado:** pendiente
- **Descripcion:** Filtrar por genero "Point and Click" en `/games` no devuelve nada, aunque RAWG tiene juegos taggeados asi. Hoy el provider mapea solo los `genres` mayores de RAWG (Action, Adventure, RPG, Shooter...) e ignora las `tags`. Como mitigacion inmediata el frontend muestra un empty state amistoso con boton "Clear filters" cuando una combinacion de filtros devuelve 0 juegos.
- **Solucion propuesta:** Curar lista de RAWG tags que se promueven a generos locales (point-and-click, roguelike, metroidvania, soulslike, visual-novel, deck-building, etc.). Modificar `RawgProvider` para mapear esas tags ademas de los genres. Script one-off de backfill que re-procesa los juegos existentes y agrega los generos faltantes (sin re-importar el resto de campos). Confirmar con busqueda manual: tras el backfill, filtrar por "Point and Click" debe devolver Hidden Through Time, Thimbleweed Park, etc.

### [FB-005] Soporte para Nintendo Switch 2 (RAWG no la distingue)

- **Estado:** pendiente
- **Descripcion:** "La plataforma de NSW2 no siempre existe, asi que el Pokopia dice que esta para NSW que no es verdad."
- **Contexto:** Verificado contra `https://api.rawg.io/api/platforms` y `https://api.rawg.io/api/games?search=pokemon+pokopia`. RAWG solo tiene `nintendo-switch` (id 7). No existe slug ni id para Switch 2. Juegos exclusivos de Switch 2 (Pokemon Pokopia, etc.) vienen marcados como Nintendo Switch a secas. Nuestro mapper `rawg-platform.map.ts` no es el problema — RAWG nunca emite el slug `nintendo-switch-2`.
- **Solucion propuesta:** Evaluar IGDB (si distingue Switch 2) como fuente secundaria solo para platforms. Requiere OAuth via Twitch. Alternativa mas liviana: mantener una lista curada local de juegos Switch 2 exclusivos y aplicarla durante el import. Mientras tanto: el admin/moderador puede corregir manualmente desde `/admin/games` y los usuarios reportar errores via game-reports. Re-evaluar periodicamente: cuando RAWG agregue Switch 2 (como hicieron con PS5 en su momento), este FB se puede resolver con una entrada en el mapper.

### [FB-006] Boton de favorito en backlog, game-shelf y queue

- **Estado:** pendiente
- **Descripcion:** "Me gustaria poder agregar juegos a favoritos desde el backlog, gameshelf y queue."
- **Contexto:** Hoy el unico lugar para marcar favorito es la ficha del juego (`/games/:code`, estrella arriba a la derecha). Desde las vistas de lista no hay acceso rapido. `FavoritesService.toggle(gameId)` ya existe en el frontend.
- **Solucion propuesta:** Estrella inline en cada card/row de `backlog-list`, `game-shelf-list`, `queue-view` (y opcionalmente `wishlist-view`). Importar `FavoritesService` en cada componente, exponer `isFavorite(gameId)` y `toggleFavorite(gameId)`. UX: toggle optimista, icono `star` (amarillo) vs `star_border` (gris). Considerar tambien si extender el patron a las cards publicas del perfil de otro user (`user-backlog`, `user-favorites`, etc.) cuando el viewer esta logueado. Evaluar si el endpoint actual (`PUT /users/me/favorites` con array completo de IDs) es suficiente para uso intensivo, o si conviene agregar `POST /users/me/favorites/:gameId` y `DELETE /users/me/favorites/:gameId` para acciones atomicas.

### [FB-007] Reviews puntuables (helpful votes)

- **Estado:** diferido
- **Descripcion:** "quizas seria bueno poder puntuar las reviews de los juegos, para que algunas tengan menos peso que otras".
- **Decision:** Diferido a Fase 4-5. Necesita masa critica de reviews antes de que tenga sentido implementarlo — si solo hay 1-2 reviews por juego, votar no aporta.
- **Solucion propuesta:** Modelo `ReviewVote(id, reviewId, userId, vote: 'up' | 'down', createdAt)` con unique `(reviewId, userId)`. Endpoints `POST /reviews/:id/vote`, `DELETE /reviews/:id/vote`. Serializar reviews con `upvotes`, `downvotes`, `myVote`. Ordenar reviews por relevancia (votos netos) por defecto en la ficha del juego. Posible: usar el ratio de votos como peso para el `community score` agregado.

### [FB-008] Recomendaciones de juegos segun reviews del usuario

- **Estado:** diferido
- **Descripcion:** "Probablemente mucho leseo, pero me gustaria que en el feed me recomendara juegos que me podrian gustar segun mis reviews".
- **Decision:** Diferido a Fase 6+. Necesita data critica (varios juegos completados/reviewed por user) y un algoritmo de recomendacion no trivial. Sin masa critica de usuarios y juegos co-completados, las recomendaciones serian pobres.
- **Solucion propuesta:** Algoritmo inicial sencillo: collaborative filtering basado en juegos co-completados por usuarios con gustos similares (jaccard sobre completados/favoritos). Alternativa: content-based usando generos + plataformas + rangos de score que el usuario tiende a valorar bien. Endpoint `GET /games/recommendations` paginado. Integrar en el feed como seccion "Recommended for you" (no se mezcla con activity stream). Premium-only o gratis: decidir segun interes.

### [FB-009] Performance de la pantalla de Games con muchos usuarios

- **Estado:** diferido
- **Descripcion:** "Si la pantalla de Games cambia segun todos los usuarios, me imagino que al tener muchos debe ser un horror".
- **Decision:** Diferido a Fase 5 (estabilizacion y calidad). Hoy con pocos usuarios no es problema; conviene atacarlo cuando haya datos reales de carga para no optimizar prematuramente.
- **Contexto:** Hoy `/games` carga "Latest games", "Latest reviewed", "Random genre", "Official lists", "Recent lists". Cada uno es una query separada. Con muchos usuarios y muchos juegos, "Latest reviewed" en particular puede pegarle a los indices y `findAll` con includes anidados.
- **Solucion propuesta:** Cachear las secciones que no son user-specific (latest games, official lists, random genre del dia) con TTL corto (5-15 min). Revisar indices sobre `Reviews.createdAt`, `GameGenres`, `GamePlatforms` para garantizar uso de indice en las queries del browse. Considerar paginacion o lazy-load de secciones secundarias al hacer scroll en vez de cargar todas al inicio.

### [FB-010] Diseno del logo

- **Estado:** pendiente
- **Descripcion:** "logo feo, pero lo ignoro porque no creo que lo hayas hecho todavia".
- **Contexto:** El logo actual es un placeholder (cuadrado "C" con gradient brand). El user reconoce que es provisorio. Diferir hasta tener identidad visual definida.
- **Solucion propuesta:** Definir identidad visual del producto (paleta, tono, target audience visual). Encargar/disenar logo + variantes (icon-only, full lockup, dark/light). Actualizar favicons, PWA icons, og:image, social cards. Reemplazar el placeholder en `layout.html` (esquina superior izquierda del sidebar).

### [FB-011] Sobrecarga de terminologia (Backlog vs Queue vs Wishlist vs Shelf vs Favorites)

- **Estado:** pendiente
- **Descripcion:** "esto se me hace confuso, creo que deberia tener otro nombre" (refiriendose al nombre "backlog"). El termino "backlog" es estandar en circulos gamer (HowLongToBeat, IGN, foros) pero puede confundir a usuarios casuales o no-anglo.
- **Contexto:** Es la punta del iceberg: la app expone 5 entidades user-facing con nombres parecidos que un usuario no-power confunde — Backlog (historial completo), Queue (cola priorizada de `not_started`), Wishlist (juegos que quiero conseguir, apunta a Game), Game Shelf (lo poseo) y Favorites (marca personal). Tres dimensiones reales (que jugue/quiero jugar, que tengo, que amo) mapeadas a 5 entidades con limites borrosos: Queue vs Wishlist (ambas se leen como "pendientes" para el casual), Backlog vs Game Shelf (si lo poseo y no lo jugue, cual es?), Wishlist vs Favorites ("me encantaria jugar esto algun dia" cabe en cualquiera).
- **Solucion propuesta:** Tres opciones: (1) **Rename frontend-only (minima):** renombrar solo en UI sin tocar backend. Ej: Backlog → "My Games" o "Library"; Queue → "Up Next" / "Playing Soon"; Wishlist → "Want to Get"; Shelf y Favorites se mantienen. URLs opcionalmente tambien. Cero migracion, reversible, permite A/B con beta testers. Drift minimo entre interno/externo. (2) **Consolidar entidades (estructural):** colapsar Wishlist como sub-estado de Backlog (nuevo status `wanted`). Universo de conceptos baja de 5 a 4: Backlog (5 estados), Queue (cola priorizada sobre `wanted`+`not_started`), Game Shelf (poseido), Favorites. Requiere migration de filas y refactor de serializers, controllers, frontend. (3) **Fix de IA/jerarquia visual (no toca modelo ni naming):** reagrupar sidebar en secciones contextuales (LIBRARY: My Games, Up Next, My Shelf | DISCOVERY: Browse, Lists, Wishlist, Favorites) + tooltips explicativos. Mejora discoverability sin resolver ambiguedad de fondo. **Recomendacion:** empezar por opcion 1, validar con beta testers cuales terminos pegan. Si la confusion Wishlist↔Queue persiste, escalar a opcion 2. La opcion 3 es complementaria — util en cualquier escenario y la mas barata. Coordinar con FB-010 (identidad visual) si se aborda el rename junto al rebrand.

### [FB-012] Onboarding/discoverability: usuario no entiende para que sirve cada categoria

- **Estado:** pendiente
- **Descripcion:** "No sabia como usarlo, me confunden tantas categorias" y "Entre Backlog, Queue, Shelf... no entendia bien para que era cada una". Segundo reporte independiente que refuerza FB-011 (sobrecarga de terminologia).
- **Contexto:** A diferencia de FB-011 — que apunta al naming en si — este apunta a la falta de onboarding y explicacion de proposito: aunque los nombres fueran perfectos, hoy no hay nada en la UI que le diga al usuario nuevo que hace cada seccion ni cuando usarla. El usuario llega, ve 5 items en el sidebar con nombres parecidos y no sabe por donde empezar.
- **Solucion propuesta:** Onboarding inicial al crear cuenta: tour guiado de 3-4 pasos explicando las secciones principales (Backlog = historial, Queue = que jugar ahora, Shelf = lo que poseo). Empty states informativos: cada seccion vacia deberia explicar su proposito + accion sugerida (ej. Queue vacio → "Tu cola de juegos por jugar. Agrega juegos desde tu backlog marcandolos como 'Quiero Jugar'"). Tooltips/hints en los items del sidebar (hover o icono `?`) con descripcion de 1 linea. Posible: pagina `/help` o `/guide` con explicacion detallada de cada concepto. Coordinar con FB-011: si se hace rename, validar onboarding contra los nombres nuevos.

### [FB-013] Boton undo al borrar entradas del feed

- **Estado:** pendiente
- **Descripcion:** "Boton undo al borrar feed". Hoy borrar una entrada de actividad del feed es destructivo e inmediato. Si el usuario se equivoca, no hay vuelta atras. El patron de "deshacer" via snackbar/toast es estandar en apps modernas (Gmail, Material).
- **Solucion propuesta:** Frontend: al borrar una activity, mostrar snackbar con accion "Deshacer" (timeout 5-10s). Backend: soft-delete con flag `deletedAt` en lugar de hard-delete inmediato, o mantener la fila en memoria/cliente y solo enviar el DELETE al expirar el snackbar. Job de limpieza periodico que purga las activities con `deletedAt` antiguo (>24h). Aplicar el mismo patron a otras acciones destructivas reversibles si aplica (borrar review, quitar de backlog, etc.).

### [FB-014] Unificar filtros de busqueda entre `/games` y backlog

- **Estado:** pendiente
- **Descripcion:** "Los filtros de busqueda por juego son superiores a los filtros de busqueda en backlog. Unificar". La pantalla `/games` tiene filtros mas ricos (genero, plataforma, ano, etc.) que la vista de backlog. Hoy son dos implementaciones distintas con UX inconsistente. El usuario espera la misma experiencia de filtrado en ambos lados.
- **Solucion propuesta:** Auditar filtros disponibles en `/games` vs backlog: identificar gaps (generos, plataformas, ano, score, etc.). Extraer el componente de filtros a uno compartido (`game-filters` reutilizable). Backend: revisar que el endpoint de backlog acepte los mismos query params que el de games (genre, platform, year, etc.). Considerar aplicar el mismo unified-filter a queue, wishlist, game-shelf y favoritos para consistencia total. Coordinar con FB-009 (performance): los nuevos filtros deben aprovechar los mismos indices.

### [FB-015] Mostrar cantidad de runs en la ficha del juego

- **Estado:** pendiente
- **Descripcion:** "Cuando vea un game, que me muestre en una lista la cantidad de runs que se han realizado".
- **Contexto:** Un "run" es una pasada/playthrough de un usuario sobre un juego (entrada en backlog con su status, score, horas, etc.). Hoy en la ficha del juego (`/games/:code`) no hay visibilidad de cuanta gente lo esta jugando o lo ha terminado. Es una metrica social util (signal de popularidad) y tambien un proxy del community score.
- **Solucion propuesta:** Endpoint o serializacion del game con counts agregados: total runs, runs por status (playing, completed, dropped, on-hold, not_started). Frontend: seccion en la ficha del juego con esos counts (ej. "1.234 personas lo han jugado · 567 lo completaron · 89 lo dejaron"). Posible: drill-down clickable que abre la lista de usuarios con esa run (respetando privacidad de cada perfil — ver FB-003). Cachear el agregado con TTL corto para no pegarle a la DB en cada visita.

### [FB-016] Bug al hacer un split en los juegos

- **Estado:** pendiente
- **Descripcion:** "Bug al hacer un split en los juegos". Falta detalle reproducible. El feature de split permite separar un game compilation en sus juegos individuales. Pedir al reporter pasos para reproducir antes de empezar a investigar.
- **Solucion propuesta:** Pedir reproduccion: que juego, que pasos, que error visible (mensaje, comportamiento inesperado). Revisar logs del backend en el momento del intento. Una vez reproducido, abrir issue con stack trace y caso de prueba.

### [FB-017] Mostrar slug debajo del juego en el split (como en compilation)

- **Estado:** pendiente
- **Descripcion:** "En el split, tambien deberia mostrar debajo el slug, tal como lo hace con la compilation". En la vista de compilation, debajo de cada juego se muestra su slug, lo que ayuda a desambiguar juegos con nombres similares. La vista de split no incluye ese detalle, generando inconsistencia entre flujos parecidos.
- **Solucion propuesta:** En el componente/vista del split, mostrar el `slug` debajo del nombre del juego en el listado de resultados. Reutilizar el mismo sub-componente que ya usa compilation para mantener consistencia visual. Bonus: si hay otros lugares donde se muestran juegos en listas de seleccion (ej. anadir a lista, mover, etc.), auditar que todos muestren slug.

### [FB-018] Conservar barra de busqueda de games al entrar a la ficha de un juego

- **Estado:** pendiente
- **Descripcion:** "Conservar barra de busqueda de games cuando se ve un juego especifico". Al estar navegando `/games` con una busqueda activa y entrar a la ficha de un juego, la barra de busqueda y los filtros se pierden. Al volver atras se obliga al usuario a re-aplicar la busqueda desde cero.
- **Solucion propuesta:** Persistir el estado de busqueda y filtros del browse de games al navegar entre la lista y las fichas individuales (via query params en la URL, state del router o servicio compartido). Al volver con el back del navegador o un boton "Volver a resultados", restaurar la query, filtros y posicion de scroll. Considerar tambien aplicar el patron a las vistas con filtros (backlog, queue, etc.) — coordinar con FB-014.

### [FB-019] Secciones de "ultimos completados" / "completados este mes" en el perfil

- **Estado:** pendiente
- **Descripcion:** "En la pestana de un usuario, ver algo asi como 'ultimos completados' (que sea por la fecha de finished) o 'completados este mes', algo asi". Hoy el perfil de usuario muestra el backlog general pero no destaca actividad reciente de completados, que es uno de los hitos mas interesantes socialmente.
- **Solucion propuesta:** Secciones nuevas en el perfil publico: "Ultimos completados" (ordenado por `finishedAt` desc, top N), "Completados este mes" (filtro por mes calendario actual), posiblemente "Completados este ano". Backend: query sobre backlog con status `completed` ordenado/filtrado por `finishedAt`. Respetar la visibilidad del backlog (ver FB-003). Frontend: cards con poster del juego, fecha de finalizacion y score si existe. Posible: extender a otros highlights (mas jugado del mes, mejor puntuado del mes).

### [FB-020] Filtros y orden por ratio, tiempo promedio y tiempo de completado en backlog

- **Estado:** pendiente
- **Descripcion:** "En los filtros de busqueda del backlog, anadir filtros para ordenar juegos por ratio personal/general, tiempo promedio, tiempo que tomo completar, etc". Faltan ordenes y filtros sobre metricas cuantitativas que el usuario ya esta tracking.
- **Solucion propuesta:** Agregar opciones de orden en el backlog: ratio personal (score del usuario / horas jugadas), ratio general (community score / tiempo promedio), tiempo promedio del juego (HLTB-style), tiempo real que le tomo al usuario completarlo (`completedAt - startedAt` o `hoursPlayed` si esta cargado). Filtros equivalentes (rango de horas, rango de ratio). Backend: revisar que las queries usen indices y que los campos existan en el modelo (`hoursPlayed`, `startedAt`, `finishedAt`). Coordinar con FB-014 (unificar filtros entre games y backlog) — los nuevos filtros se aplican al backlog principalmente, pero el ratio general podria ser util tambien en `/games`.

### [FB-021] Mostrar amigos (follow mutuo) que han jugado un juego en su ficha

- **Estado:** pendiente
- **Descripcion:** "Al ver un juego, deberia tener la opcion de revisar que amigos (amigo=follow mutuo) han jugado ese juego. Revisar si ver todas sus runs o la ultima run o solo que diga que lo ha jugado". Hoy en la ficha del juego no hay senal social personalizada — no se ve cuales de mis contactos lo jugaron.
- **Solucion propuesta:** Seccion en la ficha del juego "Amigos que lo jugaron" visible solo a usuarios logueados, donde "amigo" = follow mutuo (ver FB-003 que ya introduce el concepto). Backend: endpoint que cruza follows mutuos del viewer con backlog entries del game. Decidir granularidad: (a) solo nombre + avatar con badge de status (jugado/completado/dropped), (b) ultima run con score/horas/finishedAt, (c) todas las runs si el amigo tiene multiples. Empezar por la opcion (a) — mas barata y suficiente como senal social. Respetar visibilidad de cada perfil (FB-003): si el amigo tiene el backlog en `private`, no aparece; en `friends`, aparece. Coordinar con FB-015 (counts agregados en la ficha) y FB-022 (random users con el juego en backlog).

### [FB-022] Mostrar usuarios random que tienen el juego en backlog

- **Estado:** pendiente
- **Descripcion:** "Al ver la ventana de un game, que aparezca al azar usuarios que lo tienen en su backlog". Complementa FB-021 (amigos) con descubrimiento social: ver gente fuera de mi circulo que tambien juega o quiere jugar el mismo juego.
- **Solucion propuesta:** Seccion "Otros jugadores" en la ficha del juego con un sample random de N usuarios (5-10) que tienen el juego en su backlog. Backend: query `ORDER BY RANDOM()` con LIMIT, cacheable con TTL corto (ej. 10 min por juego) para no pegarle a la DB en cada visita. Respetar visibilidad de perfil/backlog (ver FB-003): si el perfil es `private` no aparece, si es `friends` solo aparece para amigos. Posible: filtros para sesgar el random (mismo pais, misma plataforma favorita, mismo genero predominante) si llega a haber demasiada gente. Coordinar con FB-015 (counts agregados) y FB-021 (amigos en la ficha).

### [FB-023] Clasificacion para juegos sin estado natural de "completado"

- **Estado:** pendiente
- **Descripcion:** "Hay varios juegos que no se pueden 'completar' como tal, ej: timberman. Que clasificacion podria darle a esos juegos? Hasta ahora dejarlos como 'completado' o 'abandonado' es lo mas sensato, pero no es lo mejor". Juegos infinitos/arcade/casual (Timberman, Tetris, Vampire Survivors, roguelikes sin ending, juegos competitivos) no tienen un estado de fin natural. Forzar `completed` o `dropped` distorsiona las metricas (completion rate, ratio personal, "completados este mes" de FB-019).
- **Solucion propuesta:** Evaluar opciones: (1) Nuevo status en backlog: `ongoing` / `endless` / `played` — marca el juego como jugado sin un ending. Excluirlo de metricas de "completados" pero contarlo como activity. (2) Flag en el modelo `Game`: `isEndless` (bool) que el admin marca y que cambia la UX del backlog para ese juego (oculta el boton "Completar", expone solo "Marcar como jugado"). (3) Heuristica automatica via tags de RAWG (endless, arcade, roguelite sin final, etc.) que pre-marca `isEndless` y el admin confirma. Frontend: empty states y wording adaptado segun el tipo de juego. Coordinar con FB-019 (las metricas mensuales deberian respetar este status nuevo) y FB-020 (los ratios por tiempo no aplican igual a juegos endless).

### [FB-024] Errores de validacion sin detalle en admin/users (y resto del frontend)

- **Estado:** resuelto parcialmente — backend enriquece `COMMON_SCHEMA_INVALID` con `issues: [{ path, code, message }]` (expuesto en prod, fuera de `context`); helper `shared/utils/validation-errors.ts` + mapeo inline aplicado en `admin/users`. Pendiente: cablear el resto de formularios del frontend.
- **Descripcion:** Al intentar crear un usuario en `/admin/users`, la llamada de red devuelve un error generico sin indicar que campo fallo ni por que:
    ```json
    {
    	"correlationId": "87d3403d-e57c-4661-bb61-a6e88ca460fd",
    	"type": "COMMON_SCHEMA_INVALID",
    	"title": "Invalid request schema",
    	"status": 422,
    	"instance": "/admin/users",
    	"timestamp": "2026-06-14T15:24:07.463Z"
    }
    ```
    El frontend no informa si la contrasena era invalida, si falta algun campo, o cual es el formato esperado. El usuario queda sin pistas para corregir el formulario.
- **Contexto:** El backend ya valida con Zod y conoce los issues exactos (campo, regla violada, mensaje), pero el error `COMMON_SCHEMA_INVALID` se serializa sin el detalle de los issues — solo titulo generico. El frontend, por su parte, no sabe mapear errores 422 a mensajes inline por campo en el formulario de admin/users. Es probable que el mismo problema afecte a otros formularios del frontend que dependen de validacion del backend.
- **Solucion propuesta:** Backend: enriquecer el payload de `COMMON_SCHEMA_INVALID` (RFC 7807) con un campo `errors` o `issues` que liste `{ path, code, message }` por cada issue de Zod. Mantener el `type`/`title` actuales para compatibilidad. Frontend: en el form de `/admin/users` (y resto), interceptar respuestas 422 con `type === COMMON_SCHEMA_INVALID` y mapear los issues a errores inline por campo (matchear `path` con el control del form). Fallback: si no se puede mapear a un campo concreto, mostrar snackbar con la lista de mensajes. Auditar otros formularios del frontend que hacen POST/PUT/PATCH para aplicar el mismo patron de manejo de 422. Coordinar con la convencion existente de errores (ver `*.error.ts` y `*.error-mapper.ts`).
