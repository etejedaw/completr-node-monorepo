# Módulo `ia` y providers con modelo inyectable

**Released:** 2026-10-28

## Summary

Se agregó la base para las features de IA, el módulo `apps/api/src/ia/`, todavía sin endpoints ni consumidores. Con él se definió un patrón nuevo de provider: cuando una capacidad puede cumplirla más de un proveedor externo, el provider es una clase propia de la capacidad que recibe por constructor la implementación concreta. El resto de la API importa solo esa instancia, y cambiar de proveedor es escribir otro submódulo y cambiar una línea. `ia` nace así, con DeepSeek como modelo interno, y `mail` se reestructuró con la misma forma: `MailProvider` con un modelo de nodemailer o uno en memoria para los tests. RAWG sigue como provider simple porque no tiene alternativas intercambiables.

## Highlights

- `iaProvider.generateText({ instructions, content, maxTokens?, temperature?, timeoutMs? })` devuelve `{ text, truncated }`; `iaProvider.isConfigured` permite degradar en silencio.
- `mailProvider.send(...)` y `mailProvider.assertConfigured()` reemplazan las instancias propias que creaban `auth` e `invitations`, y el chequeo de "deshabilitado" que repetía cada uno.
- Una regla `no-restricted-imports` impide importar `ia/deepseek`, `mail/nodemailer` o `mail/in-memory` desde fuera de su módulo.

## Added

- `ia/ia.interface.ts` (`GenerateTextRequest`, `GenerateTextResult` e interfaz `IaModel`) y `ia/ia.provider.ts` (`IaProvider`, que valida y normaliza la entrada, e instancia `iaProvider`).
- `ia/deepseek/deepseek.provider.ts`: `DeepseekModel` (`create` según la key), `DeepseekProvider` y `DisabledDeepseekProvider`. `fetch` nativo contra `https://api.deepseek.com/chat/completions`, modo de razonamiento desactivado y `stream: false`. El modelo (`deepseek-flash`) y el timeout por defecto (30 s) son constantes de la clase.
- Errores en 3 capas de `IA Provider`, registrados en los normalizers globales: `IA_NOT_CONFIGURED` (503), `IA_INVALID_INPUT` (422), `IA_PROVIDER_UNAVAILABLE` (502), `IA_TIMEOUT` (504), `IA_INVALID_RESPONSE` (502) e `IA_INTERNAL_ERROR` (500).
- `DEEPSEEK_API_KEY` en `common/config/api-keys.config.ts`, opcional: sin ella la IA queda como no configurada y la API arranca igual.
- Tests unitarios sin red: `IaProvider` y `MailProvider` con modelos falsos, DeepSeek con `fetch` simulado, el modelo de nodemailer con el transporte simulado.

## Changed

- `mail/` pasa a `mail.provider.ts` (`MailProvider` e instancia `mailProvider`), `mail/nodemailer/` (`NodemailerModel`, `NodemailerProvider`, `DisabledNodemailerProvider`) y `mail/in-memory/` (`InMemoryMailModel`, solo para tests). `MailClient` desaparece.
- `mail.config.ts` ya no exporta `smtpSettings`: los ajustes SMTP los lee `mail.provider.ts` y se los pasa al modelo.
- `auth.service` e `invitations.service` usan `mailProvider`; las respuestas no cambian (sin `SMTP_HOST`, 503 `MAIL_DISABLED`).
- Los tests leen el buzón en memoria desde `InMemoryMailModel.outbox`.
- `docs/architecture.md` documenta el patrón ("Provider con modelo inyectable"); `docs/context/providers.md`, `conventions.md`, `invariants.md` y el `README.md` lo reflejan. `providers.md` deja como decidido que cada provider vive en su carpeta directamente en `apps/api/src/`.

## Files of interest

- `apps/api/src/ia/ia.provider.ts`
- `apps/api/src/ia/deepseek/deepseek.provider.ts`
- `apps/api/src/mail/mail.provider.ts`
- `apps/api/src/mail/nodemailer/nodemailer.provider.ts`
- `eslint.config.mjs`

## Commits

- `37efbec3` — feat(ia): add ia module with internal deepseek text generation
- `3a94ec82` — feat(ia): register ia provider errors in global normalizers
- `6077b0de` — chore(eslint): restrict ia/deepseek imports to the ia module
- `139e42bb` — test(ia): cover deepseek provider, ia service and error layers
- `a0fda4fa` — docs(ia): document ia module, deepseek variables and error codes
- `d48b581e` — refactor(ia): turn the ia service into an IaProvider class that receives an IaModel
- `c14ab882` — test(ia): cover IaProvider with an injected model
- `8273b9e5` — docs(ia): document IaProvider and the injectable IaModel
- `746e295f` — docs(architecture): document the provider with an injectable model pattern
- `0686f263` — refactor(mail): split mail into a MailProvider with nodemailer and in-memory models
- `d9f64d4a` — test(mail): cover MailProvider and the nodemailer model
- `b4ac2ec6` — refactor(ia): read the deepseek key from api keys config and fix model and timeout in the provider
- `90641631` — test(ia): build deepseek models from the api key only
- `64d0ecdc` — docs(api): document mail models and deepseek configuration
