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
