# Feedback Fase 3

## FB-001 — Más avatares predefinidos (sin uploads custom)

**Reporte:** "que locura los avatares ajhsdgjhgsd igual echo de menos poner mi foto"

**Decisión:** No se permitirán uploads de imágenes custom. En su lugar:

- Ampliar el catálogo de avatares predefinidos
- Crear sets especiales para eventos (Halloween, navidad, lanzamientos, etc.)
- Sets exclusivos para usuarios premium

**Estado:** pendiente

## FB-002 — Follow requests para perfiles privados

**Reporte:** Permitir que usuarios con perfil privado puedan elegir si reciben solicitudes de seguimiento.

**Alcance:**

- Setting nuevo en `User`: `acceptFollowRequests` (bool, default true)
- Si perfil es privado y `acceptFollowRequests = true`, el follow no es automático: queda en estado `pending` y el dueño aprueba/rechaza
- Nuevo modelo `UserFollowRequest` (o estado `pending` en `UserFollower`)
- Endpoints: listar requests pendientes, aprobar, rechazar
- Notificación al dueño cuando llega una request
- Si `acceptFollowRequests = false`, el botón Follow no aparece en perfiles privados

**Estado:** pendiente

## FB-003 — Visibilidad granular por sección (solo yo / amigos / todos)

**Reporte:** Que un usuario privado pueda permitir a sus seguidores ver ciertos menús (backlog, shelf, etc.) sin abrir todo el perfil.

**Alcance:**

- Reemplazar los flags booleanos `isQueuePublic`, `isWishlistPublic`, `isFavoritePublic`, `isFeedPublic` por enums con 3 niveles: `private` (solo yo), `friends` (seguidos+seguidores mutuos), `public` (todos)
- Agregar el mismo enum a backlog y game-shelf (que hoy heredan de `isPublic`)
- Backend: middleware/helper para resolver visibilidad — necesita conocer relación de following mutuo (amistad)
- Migration con default = equivalente al estado actual (true → public, false → private)
- Frontend: settings de privacidad con dropdowns por sección + explicación del nivel "amigos"
- Reglas: la "amistad" se define como follow mutuo

**Estado:** pendiente

## FB-004 — Promover tags relevantes de RAWG a géneros

**Reporte:** Filtrar por género "Point and Click" en `/games` no devuelve nada, aunque RAWG tiene juegos taggeados así. Hoy el provider mapea solo los `genres` mayores de RAWG (Action, Adventure, RPG, Shooter…) e ignora las `tags`. Como mitigación inmediata el frontend muestra un empty state amistoso con botón "Clear filters" cuando una combinación de filtros devuelve 0 juegos.

**Alcance:**

- Curar lista de RAWG tags que se promueven a géneros locales (point-and-click, roguelike, metroidvania, soulslike, visual-novel, deck-building, etc.)
- Modificar `RawgProvider` para mapear esas tags además de los genres
- Script one-off de backfill que re-procesa los juegos existentes y agrega los géneros faltantes (sin re-importar el resto de campos)
- Confirmar con búsqueda manual: tras el backfill, filtrar por "Point and Click" debe devolver Hidden Through Time, Thimbleweed Park, etc.

**Estado:** pendiente

## FB-005 — Soporte para Nintendo Switch 2 (RAWG no la distingue)

**Reporte:** "La plataforma de NSW2 no siempre existe, así que el Pokopia dice que está para NSW que no es verdad."

**Contexto:** Verificado contra `https://api.rawg.io/api/platforms` y `https://api.rawg.io/api/games?search=pokemon+pokopia`. RAWG solo tiene `nintendo-switch` (id 7). No existe slug ni id para Switch 2. Juegos exclusivos de Switch 2 (Pokémon Pokopia, etc.) vienen marcados como Nintendo Switch a secas. Nuestro mapper `rawg-platform.map.ts` no es el problema — RAWG nunca emite el slug `nintendo-switch-2`.

**Alcance:**

- Evaluar IGDB (sí distingue Switch 2) como fuente secundaria solo para platforms. Requiere OAuth via Twitch.
- Alternativa más liviana: mantener una lista curada local de juegos Switch 2 exclusivos y aplicarla durante el import.
- Mientras tanto: el admin/moderador puede corregir manualmente desde `/admin/games` y los usuarios reportar errores vía game-reports.
- Re-evaluar periódicamente: cuando RAWG agregue Switch 2 (como hicieron con PS5 en su momento), este FB se puede resolver con una entrada en el mapper.

**Estado:** pendiente

## FB-006 — Botón de favorito en backlog, game-shelf y queue

**Reporte:** "Me gustaría poder agregar juegos a favoritos desde el backlog, gameshelf y queue."

**Contexto:** Hoy el único lugar para marcar favorito es la ficha del juego (`/games/:code`, estrella arriba a la derecha). Desde las vistas de lista no hay acceso rápido. `FavoritesService.toggle(gameId)` ya existe en el frontend.

**Alcance:**

- Estrella inline en cada card/row de `backlog-list`, `game-shelf-list`, `queue-view` (y opcionalmente `wishlist-view`)
- Importar `FavoritesService` en cada componente, exponer `isFavorite(gameId)` y `toggleFavorite(gameId)`
- UX: toggle optimista, ícono `star` (amarillo) vs `star_border` (gris)
- Considerar también si extender el patrón a las cards públicas del perfil de otro user (`user-backlog`, `user-favorites`, etc.) cuando el viewer está logueado
- Evaluar si el endpoint actual (`PUT /users/me/favorites` con array completo de IDs) es suficiente para uso intensivo, o si conviene agregar `POST /users/me/favorites/:gameId` y `DELETE /users/me/favorites/:gameId` para acciones atómicas

**Estado:** pendiente

## FB-007 — Reviews puntuables (helpful votes)

**Reporte:** "quizás sería bueno poder puntuar las reviews de los juegos, para que algunas tengan menos peso que otras"

**Target:** Fase 4-5 (necesita masa crítica de reviews antes de que tenga sentido)

**Alcance:**

- Modelo `ReviewVote(id, reviewId, userId, vote: 'up' | 'down', createdAt)` con unique `(reviewId, userId)`
- Endpoints `POST /reviews/:id/vote`, `DELETE /reviews/:id/vote`
- Serializar reviews con `upvotes`, `downvotes`, `myVote`
- Ordenar reviews por relevancia (votos netos) por defecto en la ficha del juego
- Posible: usar el ratio de votos como peso para el `community score` agregado

**Estado:** pendiente

## FB-008 — Recomendaciones de juegos según reviews del usuario

**Reporte:** "Probablemente mucho leseo, pero me gustaría que en el feed me recomendara juegos que me podrían gustar según mis reviews"

**Target:** Fase 6+ (necesita data y algoritmo)

**Alcance:**

- Algoritmo inicial sencillo: collaborative filtering basado en juegos co-completados por usuarios con gustos similares (jaccard sobre completados/favoritos)
- Alternativa: content-based usando géneros + plataformas + rangos de score que el usuario tiende a valorar bien
- Endpoint `GET /games/recommendations` paginado
- Integrar en el feed como sección "Recommended for you" (no se mezcla con activity stream)
- Premium-only o gratis: decidir según interés

**Estado:** pendiente

## FB-009 — Performance de la pantalla de Games con muchos usuarios

**Reporte:** "Si la pantalla de Games cambia según todos los usuarios, me imagino que al tener muchos debe ser un horror"

**Target:** Fase 5 (estabilización y calidad)

**Contexto:** Hoy `/games` carga "Latest games", "Latest reviewed", "Random genre", "Official lists", "Recent lists". Cada uno es una query separada. Con muchos usuarios y muchos juegos, "Latest reviewed" en particular puede pegarle a los índices y `findAll` con includes anidados.

**Alcance:**

- Cachear las secciones que no son user-specific (latest games, official lists, random genre del día) con TTL corto (5-15 min)
- Revisar índices sobre `Reviews.createdAt`, `GameGenres`, `GamePlatforms` para garantizar uso de índice en las queries del browse
- Considerar paginación o lazy-load de secciones secundarias al hacer scroll en vez de cargar todas al inicio

**Estado:** pendiente

## FB-010 — Diseño del logo

**Reporte:** "logo feo, pero lo ignoro porque no creo que lo hayas hecho todavía"

**Target:** Fase 3 o cuando haya bandwidth de diseño

**Contexto:** El logo actual es un placeholder (cuadrado "C" con gradient brand). El user reconoce que es provisorio. Diferir hasta tener identidad visual definida.

**Alcance:**

- Definir identidad visual del producto (paleta, tono, target audience visual)
- Encargar/diseñar logo + variantes (icon-only, full lockup, dark/light)
- Actualizar favicons, PWA icons, og:image, social cards
- Reemplazar el placeholder en `layout.html` (esquina superior izquierda del sidebar)

**Estado:** pendiente

## FB-011 — Sobrecarga de terminología (Backlog vs Queue vs Wishlist vs Shelf vs Favorites)

**Reporte:** "esto se me hace confuso, creo que debería tener otro nombre" (refiriéndose al nombre "backlog")

**Contexto:** El término "backlog" es estándar en círculos gamer (HowLongToBeat, IGN, foros) pero puede confundir a usuarios casuales o no-anglo. Es la punta del iceberg: la app expone 5 entidades user-facing con nombres parecidos que un usuario no-power confunde — Backlog (historial completo), Queue (cola priorizada de `not_started`), Wishlist (juegos que quiero conseguir, apunta a Game), Game Shelf (lo poseo) y Favorites (marca personal). Tres dimensiones reales (qué jugué/quiero jugar, qué tengo, qué amo) mapeadas a 5 entidades con límites borrosos:

- Queue vs Wishlist: ambas se leen como "pendientes" para el casual.
- Backlog vs Game Shelf: si lo poseo y no lo jugué, ¿cuál es?
- Wishlist vs Favorites: "me encantaría jugar esto algún día" cabe en cualquiera.

**Posibles soluciones:**

1. **Rename frontend-only (mínima):** renombrar solo en UI sin tocar backend. Ej: Backlog → "My Games" o "Library"; Queue → "Up Next" / "Playing Soon"; Wishlist → "Want to Get"; Shelf y Favorites se mantienen. URLs opcionalmente también. Cero migración, reversible, permite A/B con beta testers. Drift mínimo entre interno/externo.
2. **Consolidar entidades (estructural):** colapsar Wishlist como sub-estado de Backlog (nuevo status `wanted`). Universo de conceptos baja de 5 a 4: Backlog (5 estados), Queue (cola priorizada sobre `wanted`+`not_started`), Game Shelf (poseído), Favorites. Requiere migration de filas y refactor de serializers, controllers, frontend.
3. **Fix de IA/jerarquía visual (no toca modelo ni naming):** reagrupar sidebar en secciones contextuales (LIBRARY: My Games, Up Next, My Shelf | DISCOVERY: Browse, Lists, Wishlist, Favorites) + tooltips explicativos. Mejora discoverability sin resolver ambigüedad de fondo.

**Recomendación:** empezar por opción 1, validar con beta testers cuáles términos pegan. Si la confusión Wishlist↔Queue persiste, escalar a opción 2. La opción 3 es complementaria — útil en cualquier escenario y la más barata. Coordinar con FB-010 (identidad visual) si se aborda el rename junto al rebrand.

**Estado:** pendiente

## FB-012 — Onboarding/discoverability: usuario no entiende para qué sirve cada categoría

**Reporte:**

- "No sabía cómo usarlo, me confunden tantas categorías"
- "Entre Backlog, Queue, Shelf… no entendía bien para qué era cada una"

**Contexto:** Segundo reporte independiente que refuerza FB-011 (sobrecarga de terminología). A diferencia de FB-011 — que apunta al naming en sí — este apunta a la **falta de onboarding y explicación de propósito**: aunque los nombres fueran perfectos, hoy no hay nada en la UI que le diga al usuario nuevo qué hace cada sección ni cuándo usarla. El usuario llega, ve 5 ítems en el sidebar con nombres parecidos y no sabe por dónde empezar.

**Alcance:**

- Onboarding inicial al crear cuenta: tour guiado de 3-4 pasos explicando las secciones principales (Backlog = historial, Queue = qué jugar ahora, Shelf = lo que poseo).
- Empty states informativos: cada sección vacía debería explicar su propósito + acción sugerida (ej. Queue vacío → "Tu cola de juegos por jugar. Agrega juegos desde tu backlog marcándolos como 'Quiero Jugar'").
- Tooltips/hints en los ítems del sidebar (hover o icono `?`) con descripción de 1 línea.
- Posible: página `/help` o `/guide` con explicación detallada de cada concepto.
- Coordinar con FB-011: si se hace rename, validar onboarding contra los nombres nuevos.

**Estado:** pendiente
