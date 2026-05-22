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
