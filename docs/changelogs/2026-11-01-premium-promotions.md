# Promociones premium canjeables

**Released:** 2026-11-01

## Summary

Los regalos premium pasan a salir de promociones globales administrables en lugar de ofertas fijas en código. Una promoción (`PremiumPromotion`) tiene código, feature y una ventana con fecha de inicio y de fin; no concede nada por sí sola. Cada usuario elegible la canjea una vez desde una card dentro de la feature y obtiene un `PremiumGrant` que vence en la fecha de fin común de la promoción. Editar o terminar la promoción sincroniza en la misma transacción las concesiones vigentes. Se eliminan las ofertas estáticas `json-export-trial-1m` y `premium-trial-1m`: cualquier prueba se crea como promoción. El Rewind guarda con qué tipo de acceso se generó su parte premium, para rotularla `Gift` o `Premium` aunque el acceso venza, y deja de exponer a los visitantes el acceso premium del dueño.

## Highlights

- Admin → Promotions: crear, editar fechas y terminar antes promociones por feature, con estados Scheduled, Active y Ended y conteo de canjes.
- Card de regalo por feature en exportación (`export.json`), Listas (`lists.unlimited`), perfil propio (`rewind.premium`) y Settings (premium completo).
- `/users/me` expone `premiumFeatures`, y la web consulta la feature concreta en lugar del premium completo.
- Rótulo `Gift`/`Premium` guardado en el Rewind y `premiumAccess` solo para el dueño.

## Added

- Modelo `PremiumPromotion` y endpoints `GET /admin/premium-promotions`, `POST /admin/premium-promotions`, `PATCH /admin/premium-promotions/:promotionId` y `POST /admin/premium-promotions/:promotionId/revoke`, con schemas Zod, errores en las tres capas, auditoría y `claimCount` en todas las respuestas. Editar una promoción terminada responde 409 `PREMIUM_PROMOTION_ENDED`; revocar es idempotente.
- `resolveAccessiblePremiumFeatures` y `premiumFeatures` en las respuestas del usuario actual (`/users/me`, login, refresh, aceptar invitación).
- Pantalla `AdminPromotions` en `/admin/promotions`, con `PremiumPromotionsAdminService`, entrada en la navegación de Admin, protección contra doble clic, cierre durante peticiones y respuestas fuera de orden, y confirmación al terminar antes.
- Opción en `HttpClient` para que una petición suprima el toast de 409 cuando el formulario ya muestra el error.
- `selectGiftOffer` (`gift-offer-selection.ts`), textos por feature en `GIFT_OFFER_COPY` (`gift-offer-copy.ts`) y output `expired` en `GiftOfferCard`.
- Columna `Rewinds.premiumAccessKind` (`premium` | `gift`), utilidades `resolveRewindPremiumAccessKind` y `hasPremiumContent`.
- Card de `rewind.premium` en el perfil propio, debajo de `ProfileRewindSpotlight`, que al canjear recarga los años del Rewind.
- Card de premium completo arriba del contenido de Settings y card de `lists.unlimited` en la vista propia de Listas.

## Changed

- `gift-offers.service.ts` lista y canjea solo promociones. Lee la promoción dentro de la transacción del canje con `FOR SHARE` para no dejar concesiones vivas tras una revocación concurrente; una promoción programada no se lista y su canje responde 404; una vencida solo se lista como `used` para quien la canjeó.
- `POST /users/me/gift-offers/:offerCode/claim` responde con la oferta serializada (`GiftOfferView` con `status`) en lugar del grant, así que un canje de una promoción ya terminada no se muestra como activo.
- `GiftOfferView` pierde `durationDays`; `availableFrom` y `availableUntil` dejan de ser nullables.
- `GiftOfferCard` recibe `feature` en vez de `offerCode`, solo renderiza `available` y `active`, y se oculta al llegar la fecha de fin con la vista abierta. `GiftOffersService` comparte una sola petición por navegación e invalida la caché tras cada canje. Tras cualquier canje activo y al vencer, la card recarga el usuario.
- `ExportActions` muestra JSON con `auth.hasPremiumFeature("export.json")` y deja de pedir las ofertas por su cuenta. En pantallas angostas la card compacta baja a su propia línea.
- Temas premium y filtros del feed consultan la feature (`themes.premium`, `activity.feed-filters`) en lugar del premium completo.
- El botón Premium access de Admin → Users queda deshabilitado para los roles premium, moderator y admin.
- El Rewind fija `premiumAccessKind` al guardar contenido premium y lo limpia si una regeneración sin acceso deja la parte premium vacía. `premiumAccess` se envía solo al dueño, en el año y en el listado de años; `RewindAiRecap` y `RewindPremiumStats` rotulan según `premiumAccessKind` y no muestran rótulo si es `null`.

## Removed

- `gift-offers.constants.ts` (`GIFT_OFFERS`) con las ofertas `json-export-trial-1m` y `premium-trial-1m`, la expiración relativa a la fecha de canje y la reserva de esos códigos al crear promociones.
- El rótulo `Launch gift`.

## Migration

- `apps/api/migrations/20261101144606-create-premium-promotions.js` crea `PremiumPromotions`.
- `apps/api/migrations/20261101171958-add-premiumaccesskind-to-rewinds.js` crea el enum `enum_Rewinds_premiumAccessKind` y la columna nullable `Rewinds.premiumAccessKind`. Los Rewinds existentes quedan sin rótulo hasta su próxima generación premium.
- Ambas se aplican con `npm run migrate:prod` junto con el deploy. No siembran promociones.

## Files of interest

- `apps/api/src/premium-access/premium-promotions-admin.service.ts`
- `apps/api/src/premium-access/gift-offers.service.ts`
- `apps/api/src/premium-access/premium-promotion.model.ts`
- `apps/api/src/rewind/rewind.service.ts`
- `apps/api/src/rewind/rewind.serializer.ts`
- `apps/web/src/app/features/admin/admin-promotions/admin-promotions.ts`
- `apps/web/src/app/shared/components/gift-offer-card/gift-offer-card.ts`
- `apps/web/src/app/shared/components/gift-offer-card/gift-offers.service.ts`
- `apps/web/src/app/features/public-profile/public-profile.html`
- `docs/invariants.md`
- `docs/context/frontend.md`

## Commits

- `43aa8836` — feat(premium-access): add admin-managed premium promotions
- `e972c55d` — feat(premium-access): report claim counts and guard ended promotions
- `258647dd` — docs(premium-access): document promotion claim counts and conflicts
- `382aee73` — feat(premium-access): offer admin promotions through gift offers
- `627853b4` — feat(web): adapt gift offer card to promotion offers and claim response
- `95d8a117` — docs(premium-access): document promotion gift offers and claim response
- `f64bc6d0` — feat(premium-access): add admin promotions service and model in web
- `2621e876` — feat(premium-access): add admin promotions screen
- `5bc75e4f` — feat(premium-access): add admin promotions route and navigation entry
- `533a8f66` — feat(premium-access): add resolver for all accessible premium features
- `086a2c59` — feat(users): expose premiumFeatures in current user responses
- `794c655e` — feat(web): gate feed filters and premium themes by feature access
- `0c5646c9` — docs(users): document premiumFeatures in current user response
- `441c2388` — feat(premium-access): block premium access for accounts with a premium role
- `5fb4ec69` — feat(web): allow requests to suppress the conflict toast
- `eb05008b` — fix(premium-access): avoid duplicate conflict toasts in promotion forms
- `e2085107` — refactor(premium-access): source gift offers only from promotions
- `dadad6f5` — test(premium-access): cover gift offers with promotions only
- `0563a09a` — docs(premium-access): drop static gift offers from docs
- `39301c4b` — feat(rewind): store premium access kind and send premium access only to the owner
- `ce9e1d3e` — test(rewind): cover premium access kind and owner-only premium access
- `452f87c2` — feat(rewind): label premium sections as gift or premium from the stored access kind
- `f5a42938` — docs(rewind): document premium access kind and owner-only premium access
- `adcdfb37` — feat(web): share the gift offers listing per navigation
- `4e578819` — feat(web): select the gift offer card by feature
- `92932312` — feat(web): gate json export by feature access with its gift card
- `09b7676c` — feat(lists): offer the unlimited lists gift in the lists view
- `94edc9b2` — feat(settings): offer the full premium gift in settings
- `720a4aea` — docs(web): document gift offer cards by feature
- `4f1511ef` — feat(rewind): offer the rewind premium gift on the own profile
- `2a62a013` — style(rewind): sort rewind interface imports
- `26e67a7b` — fix(web): wrap the export gift card on narrow screens
- `d0cabe4a` — docs(web): document the rewind gift card on the own profile
