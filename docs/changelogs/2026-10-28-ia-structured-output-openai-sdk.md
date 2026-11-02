# IA con salida estructurada sobre el SDK de OpenAI

**Released:** 2026-10-28

## Summary

El módulo `ia` suma `iaProvider.generateJson(schema, request)`, que pide al modelo una respuesta con la forma de un schema de zod y la devuelve ya validada. `DeepseekProvider` deja de armar las peticiones con `fetch` y pasa al SDK oficial `openai` con `baseURL: "https://api.deepseek.com"`, porque DeepSeek es compatible con OpenAI. `generateText` sigue sobre `chat.completions` y `generateJson` usa `responses.create` con el formato que arma `zodTextFormat` (`json_schema` estricto). La validación vive en `IaProvider` y no depende del proveedor: DeepSeek respeta la estructura, los campos obligatorios y los `enum`, pero no `maxLength`, así que la respuesta se parsea, se valida con `safeParse` y, si falla o llega truncada, se reintenta una vez antes de lanzar `IA_INVALID_OUTPUT`.

## Highlights

- `generateJson<T>(schema: z.ZodType<T>, request: GenerateJsonRequest): Promise<T>` con `schemaName` validado (`^[a-zA-Z0-9_-]{1,64}$`).
- Un reintento automático solo para salida inválida o truncada; los errores de transporte se propagan sin reintentar.
- Error nuevo `IA_INVALID_OUTPUT` (502) en las 3 capas, con los motivos de zod y nunca el texto del modelo.
- El cliente del SDK usa `maxRetries: 0` y timeout por petición.

## Added

- `generateJson` en `IaProvider` e `IaModel`, y `GenerateJsonModelRequest` como contrato interno entre ambos.
- `IA_INVALID_OUTPUT` en `ia.service-error`, `ia.domain-error` y los mappers.
- Dependencia `openai` en `apps/api`.

## Changed

- `DeepseekProvider` usa el SDK `openai`. Los errores del SDK se traducen a los existentes: timeout a `IA_TIMEOUT`, `APIError` y fallos de conexión a `IA_PROVIDER_UNAVAILABLE`, y respuesta vacía o sin `choices`/`output` a `IA_INVALID_RESPONSE`.
- El `fetch` por defecto del cliente se resuelve en cada llamada, así los tests que reemplazan `globalThis.fetch` nunca llegan a la API real. El constructor acepta un `fetch` inyectado.

## Removed

- `deepseek.interface.ts`: los tipos de respuesta los da el SDK.

## Files of interest

- `apps/api/src/ia/ia.provider.ts`
- `apps/api/src/ia/deepseek/deepseek.provider.ts`
- `apps/api/src/ia/ia.interface.ts`
- `docs/context/providers.md`

## Commits

- `79bb1a62` — chore(deps): add openai sdk to api
- `7619f587` — feat(ia): add structured json generation on the openai sdk
- `30583265` — test(ia): cover json generation and sdk-based deepseek provider
- `7142af4b` — docs(ia): document json generation and openai sdk usage
