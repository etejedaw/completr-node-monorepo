# Providers

Los **providers** son adapters para integraciones externas: APIs HTTP, scrapers, SDKs de servicios de terceros. Aíslan al resto del código de cómo se habla con ese servicio.

## Qué es y qué no es un provider

Un provider:

- Encapsula la comunicación con un sistema externo (RAWG, HLTB, Metacritic, Steam, Stripe, SMTP).
- Expone una interfaz limpia y tipada en términos del dominio del provider.
- Maneja transporte: HTTP, parsing, timeouts, rate limits, errores de red.
- Lanza `ServiceError` con `service: "<Nombre> Provider"` si algo falla.

Un provider **no** es:

- Un módulo de negocio. No tiene controller, routes, ni habla con la DB.
- Una librería compartida cualquiera. Helpers genéricos viven en `apps/api/src/common/utils/`.
- Un wrapper trivial — si solo reexporta una librería sin agregar valor, no necesitas provider.

## Estructura

Cada provider vive en `apps/api/src/<nombre>/` al mismo nivel que un módulo de negocio. No tiene `model`, `controller` ni `routes`.

Ejemplo — `apps/api/src/rawg/`:

```
apps/api/src/rawg/
├── rawg.provider.ts        Clase base abstracta + implementación activa y deshabilitada
├── rawg.interface.ts       Contrato del provider y tipos de request/response
└── errors/
    ├── rawg.service-error.ts            Constructores de ServiceError
    ├── rawg.domain-error.ts             Constructores de DomainError
    ├── rawg.service-to-domain.mapper.ts ServiceError → DomainError
    ├── rawg.domain-to-http.mapper.ts    DomainError → HttpError
    └── rawg.error-domain.normalizer.ts  Entry point desde el normalizer global
```

Si los tipos del provider son extensos, pueden ir en `interfaces/<algo>.interface.ts` siguiendo la regla 1 → raíz, 2+ → subcarpeta.

## La clase Provider

```ts
// apps/api/src/rawg/rawg.provider.ts
export class RawgProvider {
	private readonly BASE_URL = "https://api.rawg.io/api";

	constructor(private readonly apiKey: string) {}

	async searchGame(
		query: string,
		filters: RawgSearchFilters = {}
	): Promise<RawgGameSearchResult[]> {
		const url = new URL(`${this.BASE_URL}/games`);
		url.searchParams.set("key", this.apiKey);
		url.searchParams.set("search", query);

		const data = await this.request<RawgSearchResponse>(url);
		return data.results;
	}

	private async request<T>(url: URL): Promise<T> {
		const response = await this.fetchRawg(url);
		this.handleErrors(response);
		return await this.parseBody<T>(response);
	}

	private async fetchRawg(url: URL): Promise<Response> {
		try {
			return await fetch(url.toString());
		} catch (error) {
			const reason = error instanceof Error ? error.message : "unknown";
			throw rawgServiceError.requestError(
				`RAWG request failed before a response: ${reason}`
			);
		}
	}

	private async parseBody<T>(response: Response): Promise<T> {
		try {
			return (await response.json()) as T;
		} catch (error) {
			throw rawgServiceError.parseError(error);
		}
	}

	private handleErrors(response: Response): void {
		if (response.status === 429) throw rawgServiceError.rateLimitedError();
		if (response.status === 404) throw rawgServiceError.notFoundError();
		if (!response.ok)
			throw rawgServiceError.requestError(
				`RAWG API returned ${response.status}: ${response.statusText}`
			);
	}
}
```

- **Clase con constructor** que recibe credenciales/configuración. La instancia la crea el módulo que la consume, vía el método estático `create` de la clase base (ver "Providers opcionales").
- **Métodos públicos** = la interfaz limpia. Nombres en términos del dominio del provider (`searchGame`, `getGameById`).
- **Métodos privados** para parsing, manejo de errores, helpers internos. Ningún error crudo sale del provider: los fallos de red y los cuerpos ilegibles también se traducen a `ServiceError`.
- **Sin lógica de negocio** — el provider no decide qué hacer con los datos, solo los entrega.

## Errores

El provider lanza `ServiceError` con `service: "<Nombre> Provider"` — distinto de `"<Nombre> Service"` para distinguir fallos externos de fallos internos.

```ts
// apps/api/src/rawg/errors/rawg.service-error.ts
const BASE_OPTIONS = { service: "RAWG Provider" };

export function notFoundError() {
	return new ServiceError("RAWG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function requestError(rawError: unknown) {
	return new ServiceError("RAWG_REQUEST_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function rateLimitedError() {
	return new ServiceError("RAWG_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function parseError(rawError: unknown) {
	return new ServiceError("RAWG_PARSE_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
```

Errores típicos de un provider:

- `<MOD>_NOT_FOUND` — 404 del servicio externo.
- `<MOD>_REQUEST_ERROR` — fallo HTTP genérico.
- `<MOD>_RATE_LIMITED` — 429.
- `<MOD>_PARSE_ERROR` — la respuesta no tiene el shape esperado.
- `<MOD>_TIMEOUT` — si manejas timeouts.
- `<MOD>_UNAUTHORIZED` — 401 (key inválida o expirada).
- `<MOD>_DISABLED` — el provider no tiene credencial configurada.

## Cómo lo consume un módulo

El módulo de negocio importa el provider y lo usa dentro de su service.

```ts
// games/games.service.ts
import { apiKeysConfig } from "../common/config/api-keys.config";
import { RawgClient } from "../rawg/rawg.provider";

const rawg = RawgClient.create(apiKeysConfig.RAWG_API_KEY);

export async function importGameFromRawg(rawgId: number) {
	const detail = await rawg.getGameById(rawgId);
	// ... lógica de negocio: mapear, guardar, etc.
}
```

Si el provider lanza un `ServiceError`, el service puede:

- Dejarlo fluir → el middleware global lo convierte a `HttpError` (necesitarás registrar el provider en `global-error-domain.normalizer.ts` igual que un módulo).
- Capturarlo y traducirlo a un error del módulo (ej: `RAWG_NOT_FOUND` → `GAME_RAWG_NOT_FOUND`).
- Reintentarlo, loggearlo o degradar.

La decisión es del **service que consume**, no del provider.

## Configuración

Las credenciales y endpoints viven en `apps/api/src/common/config/api-keys.config.ts` (u otro `*.config.ts` según corresponda):

```ts
const optionalApiKey = z
	.string()
	.trim()
	.optional()
	.transform(value => value || undefined);

const ApiKeysConfigSchema = z
	.object({
		RAWG_API_KEY: optionalApiKey
	})
	.readonly();
```

Las credenciales de providers son **opcionales**: un provider sin key deshabilita su integración, no tumba el arranque. Agregar un provider nuevo es una línea más en el schema, reusando `optionalApiKey`.

Las clases del provider reciben la credencial por constructor — **nunca leas `process.env` ni importes el config dentro del provider**. Quien lee el config es el módulo que instancia.

## Providers opcionales

El contrato es una **clase base abstracta** que declara `isEnabled` y los métodos del provider. De ella cuelgan la implementación real y la deshabilitada, y la elección entre ambas es un **método estático de la propia clase base**:

```ts
export abstract class RawgClient {
	abstract readonly isEnabled: boolean;

	static create(apiKey?: string): RawgClient {
		return apiKey ? new RawgProvider(apiKey) : new DisabledRawgProvider();
	}

	abstract searchGame(
		query: string,
		filters?: RawgSearchFilters
	): Promise<RawgGameSearchResult[]>;
	// ...
}

export class RawgProvider extends RawgClient {
	readonly isEnabled = true;
	// ...
}

export class DisabledRawgProvider extends RawgClient {
	readonly isEnabled = false;

	searchGame(): Promise<RawgGameSearchResult[]> {
		return Promise.reject(rawgServiceError.disabledError());
	}
	// ...
}
```

Consecuencias:

- El archivo del provider **exporta clases, no funciones sueltas**, y no importa el config ni instancia nada. Sin estado global ni side effects al importar.
- `create` es el único lugar donde vive la decisión "con key → real, sin key → deshabilitado". El consumidor sigue creando su instancia con `RawgClient.create(...)`, como con cualquier provider.
- **La disponibilidad se le pregunta a la instancia** (`rawg.isEnabled`), no a un flag por integración en el config. Un provider nuevo no agrega variables globales.
- Si un flujo debe degradar en silencio, chequea `isEnabled` antes de llamar (ej: la búsqueda cae a catálogo local). Si debe fallar visible, no chequea nada: el provider deshabilitado lanza `<PROVIDER>_DISABLED` y el normalizer lo convierte en 503.

## Providers implementados

| Provider             | Propósito                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/rawg/` | RAWG API: géneros, descripciones, covers, scores                                                                       |
| `apps/api/src/mail/` | Correo transaccional. Modelos internos: `mail/nodemailer/` y `mail/in-memory/` (tests). Se deshabilita sin `SMTP_HOST` |
| `apps/api/src/ia/`   | Generación de texto con IA. Proveedor interno: `ia/deepseek/`. Se deshabilita sin `DEEPSEEK_API_KEY`                   |

**Qué integraciones vienen después no se decide acá:** el roadmap de fuentes externas es planificación de producto, y varias dependen de revisiones de licencia todavía abiertas.

## Módulo `ia` y su submódulo `deepseek`

`apps/api/src/ia/` es la base de las features de IA. Es la excepción a "un provider por carpeta en `src/`": DeepSeek vive como submódulo interno, `apps/api/src/ia/deepseek/`, para que el proveedor pueda cambiarse sin tocar a los consumidores.

```
apps/api/src/ia/
├── ia.interface.ts        GenerateTextRequest, GenerateTextResult y la interfaz IaModel
├── ia.provider.ts         Contrato público: clase IaProvider y su instancia iaProvider
├── errors/                Errores en 3 capas (service "IA Provider", módulo "IA Provider")
└── deepseek/
    ├── deepseek.interface.ts   Settings y forma de la respuesta de DeepSeek
    └── deepseek.provider.ts    DeepseekModel (create), DeepseekProvider y DisabledDeepseekProvider
```

- **Contrato público:** el resto de la API solo importa `iaProvider` de `ia/ia.provider`. `iaProvider.generateText({ instructions, content, maxTokens?, temperature?, timeoutMs? })` devuelve `{ text, truncated }`; `truncated` es `true` si el modelo se cortó por el límite de tokens. `iaProvider.isConfigured` dice si hay un modelo configurado, para que un consumidor pueda degradar en silencio.
- **Modelo inyectado:** `IaProvider` recibe por constructor un `IaModel` (interfaz de `ia.interface.ts`: `isEnabled` y `generateText`). Hoy es `DeepseekModel.create(...)`; cambiar a otro proveedor (OpenAI u otro) es escribir otro submódulo que implemente `IaModel` y cambiar esa línea de `ia.provider.ts`, sin tocar a los consumidores.
- **Validación:** `IaProvider` rechaza con `IA_INVALID_INPUT` instrucciones o contenido en blanco, `maxTokens` y `timeoutMs` que no sean enteros positivos y `temperature` fuera de 0–2, antes de llamar a la red.
- **DeepSeek:** `fetch` nativo contra `https://api.deepseek.com/chat/completions` (compatible con OpenAI), con el modo de razonamiento desactivado (`thinking: { type: "disabled" }`) y `stream: false`. El timeout usa `AbortSignal.timeout`.
- **Variables:** solo `DEEPSEEK_API_KEY`, opcional (vacía o ausente = IA no configurada, la API arranca igual). Se lee en `common/config/api-keys.config.ts`, junto a las demás keys de servicios externos, y `ia.provider.ts` la pasa a `DeepseekModel.create`. El modelo (`deepseek-flash`) y el timeout por defecto (30 s) son constantes de `DeepseekProvider`; un consumidor puede pedir otro timeout por petición con `timeoutMs`.
- **Errores:** todos con `service: "IA Provider"`, registrados en los normalizers globales de `common/errors/`.

| Código                    | Status | Cuándo                                                                        |
| ------------------------- | ------ | ----------------------------------------------------------------------------- |
| `IA_NOT_CONFIGURED`       | 503    | `DEEPSEEK_API_KEY` ausente o vacía                                            |
| `IA_INVALID_INPUT`        | 422    | La petición de generación no pasa la validación                               |
| `IA_PROVIDER_UNAVAILABLE` | 502    | DeepSeek respondió con un status de error (401, 402, 429, 5xx) o la red falló |
| `IA_TIMEOUT`              | 504    | Se agotó `timeoutMs`                                                          |
| `IA_INVALID_RESPONSE`     | 502    | Cuerpo que no es JSON, sin `choices` o con texto vacío                        |
| `IA_INTERNAL_ERROR`       | 500    | Código de `IA Provider` sin mapeo propio                                      |

### Regla de imports

Ningún archivo fuera de `apps/api/src/ia/` (y `apps/api/test/ia/`) puede importar `ia/deepseek`. Lo hace cumplir la regla `no-restricted-imports` de `eslint.config.mjs`. Un consumidor importa siempre `ia/ia.provider`.

## Extraer notas y duraciones de un provider

Qué campo de la respuesta de un provider se guarda como nota o duración, y bajo qué fuente, es regla de negocio: vive en el módulo que consume el provider, no en el provider. Para RAWG está en `games/mappers/extractors/`:

- `source-value-extractor.ts`: la interfaz `SourceValueExtractor<TPayload, TSource>` (`source` + `extract(payload) => number | null`) y el runner genérico `extractSourceValues`.
- `rawg-score.extractors.ts` y `rawg-time.extractors.ts`: arrays explícitos con un extractor por campo de RAWG. `extract` está tipado contra `RawgGameDetail`, así que un campo inexistente falla al compilar.

Para sumar un campo nuevo del provider se agrega una entrada al array; el mapper no cambia. Un provider nuevo define su propio array y reutiliza el runner. El registry es un array explícito, sin registro por efecto secundario al importar, para que lo que no está en el array no exista.

## Cómo crear un provider nuevo

1. Crear `apps/api/src/<nombre>/`.
2. Definir tipos en `<nombre>.interface.ts` (request, response, filtros).
3. Implementar `<nombre>.provider.ts` con clase + constructor que reciba credenciales.
4. Crear `errors/<nombre>.service-error.ts` con los códigos del provider y `service: "<Nombre> Provider"`.
5. Agregar la variable de entorno al `.env.example` y al `*.config.ts` correspondiente, siempre opcional.
6. Definir la clase base abstracta con `isEnabled`, los métodos del provider y su `static create`, y agregar la clase `Disabled<Nombre>Provider` con su error `<PROVIDER>_DISABLED`.
7. **No hace falta** crear `controller`, `routes`, `model`, `serializer`, `dtos` ni `schemas` — el provider no expone HTTP propio.
8. Si los errores del provider tienen que llegar al cliente con status code propio, registrar un normalizer del provider en `global-error-domain.normalizer.ts` (mismo patrón que un módulo de negocio). Si no, el service que lo consume captura y traduce.

## Nota: ¿providers en `apps/api/src/` o en `apps/api/src/common/providers/`?

Decidido: **un provider por carpeta directamente en `apps/api/src/`**, al mismo nivel que los módulos de negocio. No existe `apps/api/src/common/providers/`. La única forma de anidar es la del provider con modelo inyectable, donde cada proveedor es un submódulo de su capacidad (ver [`../architecture.md`](../architecture.md#provider-con-modelo-inyectable)).
