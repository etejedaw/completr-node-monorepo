# Ajustes de perfil y social

**Released:** 2026-10-20

## Summary

Ajustes sobre el perfil y las acciones sociales. Los usuarios free dejan de llevar un badge junto a su nombre y la sección de sagas no aparece si no hay sagas. La vista previa de Ajustes > Profile usa el mismo fondo que el perfil público, gracias a un componente y una regla de elección compartidos. Dejar de seguir desde Users, Followers y Following pide confirmación, igual que en el perfil público.

## Highlights

- Solo Premium, Mod y Admin llevan badge en la barra lateral y en la hoja "More".
- La vista previa "How others see you" muestra el arte del favorito #1, igual que el perfil.
- Diálogo "Unfollow @x?" en Users, Followers y Following en lugar del toast con deshacer.

## Added

- `shared/components/profile-backdrop`: fondo del hero del perfil (halo y cuadrícula por defecto, arte difuminado y nítido con máscara, degradados hacia `canvas`).
- `features/public-profile/profile-backdrop.ts`: `pickProfileBackdrop` (favorito con arte, si no una run del backlog, si no la actividad reciente) e `injectProfileBackdrop` para cargar los datos desde Ajustes, con spec.
- `shared/components/unfollow-confirm-dialog`: diálogo presentacional (`username`, `busy`; emite `confirmed` y `cancelled`), con spec.

## Changed

- `layout`: el badge de rol usa `elevatedRoleBadge`. Para `user` no se pinta nada.
- `ProfileHero` y `settings-profile` usan `ProfileBackdrop`. La vista previa sigue mostrando en vivo el nombre, el avatar y la bio del borrador.
- `injectFollowActions` expone `unfollowTarget`, `confirmUnfollow` y `cancelUnfollow`. Si el unfollow falla, el diálogo queda abierto con un aviso de error.
- `users-discover` y `user-connections` muestran el diálogo de confirmación.
- `docs/context/frontend.md` documenta los componentes nuevos, las insignias de rol y que dejar de seguir ya no usa _Undo_.

## Removed

- `roleBadge()` y la entrada "Free" de `core/utils/role-badge.ts`.
- El estado vacío con "Browse games" de `ProfileSagas` en el perfil propio, y su input `isSelf`.
- `unfollowWithUndo` en `follow-actions.ts`.

## Files of interest

- `apps/web/src/app/features/public-profile/profile-backdrop.ts`
- `apps/web/src/app/shared/components/profile-backdrop/profile-backdrop.ts`
- `apps/web/src/app/features/users-discover/follow-actions.ts`
- `apps/web/src/app/shared/components/unfollow-confirm-dialog/unfollow-confirm-dialog.ts`

## Commits

- `0628296e` — fix(web): hide role badge for free users in the shell
- `9c6b9d5b` — fix(web): hide empty sagas section on own profile
- `64b72150` — feat(web): show favorite game art in the settings profile preview
- `b8672434` — docs(web): document profile backdrop and elevated role badges
- `5dff315e` — feat(web): add unfollow confirm dialog component
- `2598d63c` — feat(web): confirm before unfollowing from users and connections
- `66a1f6ae` — docs(web): document unfollow confirmation dialog
