# Aviso del proveedor de IA del Rewind y política de privacidad 2.1

**Released:** 2026-11-01

## Summary

El resumen con IA del Rewind lo escribe DeepSeek, un servicio externo que procesa en China, y ni el diálogo de generación ni la política de privacidad lo decían. El diálogo de generación suma un botón de ayuda "Who writes the AI recap" que nombra al proveedor y qué datos recibe, y la política de privacidad pasa a la versión 2.1 con el Rewind, el proveedor, la transferencia fuera de Chile y las secciones de privacidad nuevas. `docs/context/providers.md` fija que la política y el aviso se actualizan junto con cualquier cambio de proveedor o de datos enviados.

## Added

- `rewind-generate-dialog`: junto al encabezado del resumen con IA (solo con acceso premium al Rewind) hay un `uiIconButton` "Who writes the AI recap" con `aria-expanded` y `aria-controls`. Al presionarlo muestra el aviso (ícono `smart_toy`): "Your AI recap is written by DeepSeek, an external AI service. It receives this year's games, ratings and stats, never your email or username", con enlace a `/privacy#sharing`. Tests en `rewind-generate-dialog.spec.ts`.
- `docs/context/providers.md`: el proveedor está nombrado en la política y en ese aviso, así que cambiar de proveedor, de país o de datos enviados exige actualizar ambos en el mismo cambio. El contenido que arma un consumidor no lleva correo, nombre de usuario, nombre visible ni ids, y la petición sale del servidor.

## Changed

- Política de privacidad (`apps/landing/src/content/legal/privacy-en.md` y `privacy-es.md`), versión 2.1 del 2026-11-01:
    - El contenido creado incluye platinos y Rewinds, y el Rewind con su resumen se trata como parte del servicio que el usuario pide al generarlo.
    - Las secciones con visibilidad propia pasan a ser once (con Platinums, Sagas y Rewind) y los niveles se llaman "Everyone", "Friends" y "Only you", como en la app. Un Rewind no se ve hasta que se genera.
    - DeepSeek aparece como destinatario, con los datos que recibe, que las notas y las runs privadas solo van si el usuario activa sus switches, y que no recibe nada que lo identifique ni su IP.
    - Se agrega la transferencia a China cuando se pide el resumen con IA.
    - "Automated decisions" explica que el Rewind es el único perfil, que existe solo si el usuario lo pide y que no tiene efectos sobre la cuenta.
    - "Never sold or shared" pasa a "Never sold": no se venden datos ni se comparten con fines comerciales.
    - Las fuentes de datos de juegos suman Metacritic, HowLongToBeat y Wikidata.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.ts`
- `apps/landing/src/content/legal/privacy-en.md`
- `docs/context/providers.md`

## Commits

- `83dba0a7` — feat(rewind): tell premium users that deepseek writes the ai recap
- `2ed889ea` — feat(rewind): move the deepseek notice behind a help button
- `eb73541b` — style(rewind): show the bot icon in the deepseek notice
- `beb20e06` — docs(landing): cover rewind ai summary and new privacy sections in privacy policy
- `0cb59acb` — docs(landing): state that the ai provider receives nothing that identifies the user
- `6334050f` — docs(api): tie the ai provider to the privacy policy and the rewind notice
