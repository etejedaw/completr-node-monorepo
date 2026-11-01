# Accesos premium temporales, regalos y ofertas activables

**Released:** 2026-10-31

## Summary

El acceso premium deja de depender exclusivamente de `User.role`. El módulo nuevo `premium-access` resuelve el premium efectivo a partir del rol permanente, concesiones completas temporales y regalos de funcionalidades individuales. Las concesiones se evalúan contra su vencimiento en cada operación, sin cron ni cambios de rol, y todos los gates existentes conservan sus errores, límites y reglas de degradación suave. Admin puede gestionar las concesiones y los usuarios pueden activar ofertas definidas en el backend.

## Highlights

- Premium completo temporal equivalente al rol premium en límites, filtros del feed, temas, exportación JSON y Rewind, sin modificar `User.role`.
- Regalos individuales de funcionalidades con vencimiento opcional.
- Administración de concesiones desde Admin → Users y ofertas de 30 días activables por el usuario con claims idempotentes.
- `GiftOfferCard` reutilizable, integrado en la exportación JSON, y distintivos públicos compatibles con premium temporal sin falsificar roles.

## Added

- Catálogo `PREMIUM_FEATURES` y `FULL_PREMIUM_FEATURE = "*"` en `apps/api/src/premium-access/`.
- Modelo `PremiumGrant`, asociación con `User` y resolvedor `resolvePremiumAccess`, con origen `role`, `full-grant` o `feature-grant` y vencimiento derivado.
- Consulta agrupada `findFullPremiumUserIds` para serializar `hasPremium` sin consultas por fila.
- Endpoints admin para consultar el catálogo, listar, crear, actualizar y revocar concesiones, con validación estricta y auditoría `premium_grant_created`, `premium_grant_updated` y `premium_grant_revoked`.
- Ofertas de regalo que salen de promociones administrables, endpoints `GET /users/me/gift-offers` y `POST /users/me/gift-offers/:offerCode/claim`, y estados `available`, `active`, `used`, `expired` y `not-eligible`.
- `AdminPremiumAccess` y `PremiumAccessAdminService`, con formularios de concesión y extensión, revocación confirmada y protección contra doble clic, cierre durante peticiones y respuestas fuera de orden.
- `GiftOfferCard` y `GiftOffersService`, con estados de carga, activación, error y reintento; una prueba completa refresca `AuthService.loadUser()` antes de emitir el resultado.
- `premiumAccess` en `/users/me` y en las respuestas de Rewind; `hasPremium` en perfiles, tarjetas, feed, reviews, actividad social y solicitudes de seguimiento.
- Distintivo `Gift` para el contenido premium del Rewind generado con un regalo específico y `Premium` para el generado con acceso por rol o concesión completa.
- Colección OpenCollection `docs/api/premium-access/` y documentación de las respuestas modificadas.

## Changed

- Todos los gates premium consultan el resolvedor: listas y list-items, saved filters, favoritos, wishlist, queue, game shelf, mood tags, filtros del feed, temas, exportación JSON y Rewind.
- La expiración es inmediata al resolver acceso; revocar conserva la fila y actualiza `expiresAt`. Perder acceso no borra contenido ni reactiva ofertas ya utilizadas.
- `AuthService.isPremium` usa `user.premiumAccess.active`; `avatarRing` y `elevatedRoleBadge` aceptan `hasPremium`, mientras Moderator y Admin conservan su presentación real.
- Rewind permite opciones privadas, notas, recap IA y estadísticas con cualquier origen de acceso a `rewind.premium`. El contenido generado permanece visible después del vencimiento y los límites de generación no cambian.
- Las respuestas públicas solo exponen premium completo mediante `hasPremium`; no revelan regalos individuales ni sus fechas.

## Migration

- `apps/api/migrations/20261031044624-create-premium-grants-table.js` crea `PremiumGrants`, y el índice único parcial `PremiumGrants_userId_offerCode_unique`; no siembra concesiones. Debe aplicarse con `npm run migrate:dev` en local y `npm run migrate:prod` en producción antes de usar los endpoints nuevos.

## Files of interest

- `apps/api/src/premium-access/premium-access.service.ts`
- `apps/api/src/premium-access/premium-grant.model.ts`
- `apps/api/src/premium-access/premium-grants-admin.service.ts`
- `apps/api/src/premium-access/gift-offers.service.ts`
- `apps/api/migrations/20261031044624-create-premium-grants-table.js`
- `apps/web/src/app/features/admin/admin-premium-access/admin-premium-access.ts`
- `apps/web/src/app/shared/components/gift-offer-card/gift-offer-card.ts`
- `apps/web/src/app/core/services/auth.ts`
- `docs/invariants.md`

## Commits

- Tanda implementada en el working tree y pendiente de commit; no hay hashes asociados todavía.
