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
- `<MOD>_BLOCKED` — 403, CAPTCHA o página de challenge (providers de scraping).
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

| Provider                   | Propósito                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/rawg/`       | RAWG API: géneros, descripciones, covers, scores                                                                          |
| `apps/api/src/hltb/`       | HowLongToBeat por scraping de la página de detalle: duraciones Main Story, Main + Extras y Completionist                  |
| `apps/api/src/metacritic/` | Metacritic por scraping de la página de detalle: Metascore, User Score, plataformas y año                                 |
| `apps/api/src/wikidata/`   | Wikidata por su endpoint SPARQL público: descubre el id de HowLongToBeat de un juego a partir de su slug de RAWG o título |
| `apps/api/src/mail/`       | Correo transaccional. Modelos internos: `mail/nodemailer/` y `mail/in-memory/` (tests). Se deshabilita sin `SMTP_HOST`    |
| `apps/api/src/ia/`         | Generación de texto y JSON estructurado con IA. Proveedor interno: `ia/deepseek/`. Se deshabilita sin `DEEPSEEK_API_KEY`  |

**Qué integraciones vienen después no se decide acá:** el roadmap de fuentes externas es planificación de producto, y varias dependen de revisiones de licencia todavía abiertas.

## Providers de scraping: HLTB y Metacritic

`apps/api/src/hltb/` y `apps/api/src/metacritic/` leen páginas HTML públicas, no una API. Siguen la estructura de cualquier provider (clase, `*.interface.ts`, `errors/` en tres capas), con dos diferencias: no tienen credencial, así que no hay clase deshabilitada ni variable de entorno, y toda la red pasa por un cliente HTTP compartido, `apps/api/src/scraping/`.

### Solo páginas de detalle

Los providers respetan el `robots.txt` de cada sitio. HowLongToBeat prohíbe `/api` (lo que usa su buscador) y Metacritic prohíbe `/search`, así que **ningún provider busca**: solo piden páginas de detalle.

- `HltbClient.getGameById(externalId)` pide `https://howlongtobeat.com/game/<id>`. Necesita un id de HLTB ya conocido; el provider no lo descubre. Sale de un `GameExternal` con fuente `hltb` o, si el juego no lo tiene, lo resuelve Wikidata (ver "Provider de Wikidata").
- `MetacriticClient.getGameBySlug(slug)` pide `https://www.metacritic.com/game/<slug>/`. El slug lo aporta quien llama (derivado del título o de un `GameExternal` con fuente `metacritic`).

Un id que no es numérico o un slug que no cumple `^[a-z0-9]+(?:-+[a-z0-9]+)*$` se rechaza con `<MOD>_NOT_FOUND` sin hacer la request: así nunca se construye una URL fuera de `/game/`.

Cada instancia se obtiene con `HltbClient.create()` / `MetacriticClient.create()`, que devuelven siempre la misma instancia, montada sobre `ScrapingHttpClient.shared()`. Así la acción individual y el job comparten la cola por host. Los tests construyen la clase directamente con un `ScrapingHttpClient` propio.

### Qué se parsea

- **HLTB:** el JSON de `<script id="__NEXT_DATA__">`, en `props.pageProps.game.data.game[0]`. `comp_main`, `comp_plus` y `comp_100` vienen en segundos y se devuelven en horas con 2 decimales (`mainStoryHours`, `mainExtrasHours`, `completionistHours`). El año sale de `release_world` y, si no es válido, de `release_na`, `release_eu` o `release_jp`. Si Next.js sirve su página `/404` o la lista de juegos viene vacía, es `HLTB_NOT_FOUND`.
- **Metacritic:** primero el JSON-LD `VideoGame` del `<head>` (título, `datePublished`, `gamePlatform`, `url` canónica y `aggregateRating`, que es el Metascore). El User Score no está en el JSON-LD: se lee del `aria-label` de `[data-testid="global-score-value-wrapper"]` (`User score 9.1 out of 10`), el primero de la página, que es el del hero. Si el JSON-LD no trae rating, el Metascore sale del mismo tipo de etiqueta; si falta el JSON-LD, el título sale de `[data-testid="hero-title"]`. El `slug` devuelto es el de la URL canónica, por si el sitio redirigió a otro.

Un dato ausente no es un error: una duración en 0, ausente o inválida, y un score `tbd`, ausente o fuera de rango (Metascore 0–100, User Score 0–10) se devuelven como `null`. `<MOD>_PARSE_ERROR` queda para cuando la página no tiene la estructura esperada (falta `__NEXT_DATA__`, JSON inválido, no hay título), que suele indicar un cambio del sitio. Las notas se devuelven crudas: normalizarlas o elegir una es regla de negocio del módulo que consume.

### Cliente HTTP compartido (`apps/api/src/scraping/`)

`ScrapingHttpClient.getHtml(url)` devuelve el HTML (`getText(url, headers)` hace lo mismo con headers propios, como el `Accept` JSON de Wikidata) o lanza `ScrapingRequestError` con un `kind` (`NOT_FOUND`, `RATE_LIMITED`, `BLOCKED`, `TIMEOUT`, `REQUEST_ERROR`) y el detalle (`url`, `status`, `attempts`, `retryAfterMs`). Ese error no sale del provider: cada uno lo traduce con `fromRequestFailure` de su `*.service-error.ts` a `<MOD>_<kind>`.

- **Cola por host:** una sola request a la vez por host; las llamadas concurrentes salen en orden de llegada. Hosts distintos no se esperan entre sí.
- **Throttle:** entre dos requests al mismo host pasan al menos `minDelayMs` (5000) más un jitter aleatorio de 0 a `jitterMs` (2000), contados desde que terminó la anterior. Los reintentos también cuentan como requests. Son una precaución propia, no un límite publicado por los sitios.
- **Timeout:** `timeoutMs` (15 s) por intento, con `AbortController`; cubre también la descarga del cuerpo.
- **Reintentos:** `maxRetries` (1) ante 429, 5xx, fallo de red o timeout. La espera es la de `Retry-After` (en segundos o fecha HTTP) o, si no viene, `retryBaseDelayMs` (10 s) con backoff exponencial, y nunca menos que el throttle. Si `Retry-After` supera `maxRetryAfterMs` (60 s) no se reintenta antes de tiempo: se falla en el acto, y la siguiente request a ese host espera hasta ese tope.
- **Bloqueos:** un 403, el header `cf-mitigated: challenge` o una página de challenge o CAPTCHA reconocible (Cloudflare, DataDome, PerimeterX, reCAPTCHA, hCaptcha) es `BLOCKED` y nunca se reintenta. No se intenta sortear ningún bloqueo: ni proxies, ni navegadores automatizados, ni cambio de User-Agent.
- **Identificación:** `User-Agent: CompletrBot/1.0 (+https://www.completr.app)`, sin hacerse pasar por un navegador.
- **Inyectable:** el constructor acepta `fetch`, `sleep`, `now` y `random` además de los valores anteriores, para probar colas, esperas y reintentos con un reloj simulado y sin red.

El throttle vive en memoria, así que cubre una sola instancia de la API. Con varias réplicas habría que moverlo a estado compartido.

| Código                 | Status | Cuándo                                               |
| ---------------------- | ------ | ---------------------------------------------------- |
| `<MOD>_NOT_FOUND`      | 404    | 404, página 404 de la app o id/slug inválido         |
| `<MOD>_PARSE_ERROR`    | 502    | La página no tiene la estructura esperada            |
| `<MOD>_RATE_LIMITED`   | 429    | 429 persistente tras el reintento                    |
| `<MOD>_BLOCKED`        | 502    | 403, CAPTCHA o challenge                             |
| `<MOD>_TIMEOUT`        | 504    | Se agotó el timeout también en el reintento          |
| `<MOD>_REQUEST_ERROR`  | 502    | 5xx persistente, otro status de error o fallo de red |
| `<MOD>_INTERNAL_ERROR` | 500    | Código del provider sin mapeo propio                 |

`<MOD>` es `HLTB` (`service: "HLTB Provider"`) o `METACRITIC` (`service: "Metacritic Provider"`); ambos están registrados en los normalizers globales de `common/errors/`.

## Provider de Wikidata

`apps/api/src/wikidata/` existe porque HLTB solo se lee por página de detalle y su buscador está prohibido por `robots.txt`: hace falta otra forma de conocer el id de un juego. Wikidata publica sus datos bajo CC0 y su servicio de consultas admite tráfico automatizado que se identifique con un User-Agent descriptivo. Tiene el slug de RAWG (P9968), el id de HowLongToBeat (P2816) y la fecha de publicación (P577), y en el catálogo `Game.code` funciona como slug de RAWG.

- `WikidataClient.findHltbCandidates({ rawgSlug, title })` hace **una sola** request `GET https://query.wikidata.org/sparql?query=...` con `Accept: application/sparql-results+json`. La consulta une (`UNION`) los ítems con P9968 igual a `rawgSlug` y los que tienen exactamente `title` como etiqueta en inglés (`rdfs:label "<title>"@en`); en ambos casos exige P2816 y trae, opcionales, la etiqueta en inglés, el P9968 y el P577. Sin slug, solo busca por etiqueta; sin slug ni título, devuelve `[]` sin hacer la request.
- Devuelve candidatos `{ hltbId, label, releaseYear, rawgSlug }`. Las filas que solo difieren en la fecha se unen y se queda el año más antiguo. Una fila sin P2816 numérico se descarta. Elegir entre candidatos es regla de negocio del módulo que consume (`games/utils/resolve-hltb-id.util.ts`).
- El slug y el título se escapan como literales SPARQL (`escapeSparqlString`: `\`, `"`, saltos de línea, retorno de carro, tabulador, `\b` y `\f`), así que un título nunca puede salir del literal ni agregar patrones a la consulta.
- `WikidataClient.create()` devuelve siempre la misma instancia, con un `ScrapingHttpClient` **propio** (no el compartido): mismo User-Agent de Completr, timeout y reintentos por defecto, pero un throttle de 1000 ms más un jitter de 0 a 500 ms, porque es una API pensada para consultas y no un sitio que se lee por scraping. Al ser otro host, no espera a la cola de HLTB ni de Metacritic.
- Se cablea en `apps/api/src/app.ts` como `hltbIdResolver` del registro de fuentes externas.

| Código                    | Status | Cuándo                                                         |
| ------------------------- | ------ | -------------------------------------------------------------- |
| `WIKIDATA_PARSE_ERROR`    | 502    | El cuerpo no es JSON o no trae `results.bindings`              |
| `WIKIDATA_RATE_LIMITED`   | 429    | 429 persistente tras el reintento                              |
| `WIKIDATA_BLOCKED`        | 502    | 403 o página de challenge                                      |
| `WIKIDATA_TIMEOUT`        | 504    | Se agotó el timeout también en el reintento                    |
| `WIKIDATA_REQUEST_ERROR`  | 502    | 404, 400, 5xx persistente, otro status de error o fallo de red |
| `WIKIDATA_INTERNAL_ERROR` | 500    | Código del provider sin mapeo propio                           |

No hay `WIKIDATA_NOT_FOUND`: una consulta sin resultados devuelve `[]`. Los errores llevan `service: "Wikidata Provider"` y están registrados en los normalizers globales de `common/errors/`.

## Módulo `ia` y su submódulo `deepseek`

`apps/api/src/ia/` es la base de las features de IA. Es la excepción a "un provider por carpeta en `src/`": DeepSeek vive como submódulo interno, `apps/api/src/ia/deepseek/`, para que el proveedor pueda cambiarse sin tocar a los consumidores.

```
apps/api/src/ia/
├── ia.interface.ts        GenerateTextRequest, GenerateJsonRequest, GenerateTextResult y la interfaz IaModel
├── ia.provider.ts         Contrato público: clase IaProvider y su instancia iaProvider
├── errors/                Errores en 3 capas (service "IA Provider", módulo "IA Provider")
└── deepseek/
    └── deepseek.provider.ts    DeepseekModel (create), DeepseekProvider y DisabledDeepseekProvider
```

- **Contrato público:** el resto de la API solo importa `iaProvider` de `ia/ia.provider`. `iaProvider.generateText({ instructions, content, maxTokens?, temperature?, timeoutMs? })` devuelve `{ text, truncated }`; `truncated` es `true` si el modelo se cortó por el límite de tokens. `iaProvider.generateJson(schema, { ...lo mismo, schemaName })` recibe un schema de zod y devuelve el objeto ya validado: parsea el JSON, lo valida con `schema.safeParse` y, si el JSON está roto, no cumple el schema o vino truncado, lo vuelve a pedir hasta completar 3 intentos; si el último también falla, rechaza con `IA_INVALID_OUTPUT`. Cada reintento agrega a las instrucciones el motivo del rechazo anterior (por ejemplo, el campo que se pasó de largo), para que el modelo lo corrija en vez de repetir lo mismo. Los reintentos existen porque DeepSeek respeta la estructura, los campos obligatorios y los `enum`, pero no `maxLength`. Si el modelo parte la respuesta en varios objetos JSON seguidos (`parseJsonOutput`, en `ia/utils/parse-json-output.util.ts`), se unen en uno solo cuando no repiten claves. `iaProvider.isConfigured` dice si hay un modelo configurado, para que un consumidor pueda degradar en silencio.
- **Modelo inyectado:** `IaProvider` recibe por constructor un `IaModel` (interfaz de `ia.interface.ts`: `isEnabled`, `generateText` y `generateJson`, que devuelve el texto crudo para que `IaProvider` lo valide). Hoy es `DeepseekModel.create(...)`; cambiar a otro proveedor (OpenAI u otro) es escribir otro submódulo que implemente `IaModel` y cambiar esa línea de `ia.provider.ts`, sin tocar a los consumidores.
- **Validación:** `IaProvider` rechaza con `IA_INVALID_INPUT` instrucciones o contenido en blanco, `maxTokens` y `timeoutMs` que no sean enteros positivos, `temperature` fuera de 0–2 y, en `generateJson`, un `schemaName` en blanco o que no cumpla `^[a-zA-Z0-9_-]{1,64}$`, antes de llamar a la red.
- **DeepSeek:** SDK oficial `openai` con `baseURL: "https://api.deepseek.com"` (DeepSeek es compatible con OpenAI). `generateText` usa `client.chat.completions.create` con el razonamiento desactivado (`thinking: { type: "disabled" }`, parámetro extra que el SDK reenvía tal cual) y `stream: false`; `truncated` es `finish_reason === "length"`. `generateJson` usa `client.responses.create` con `reasoning: { effort: "none" }`, `max_output_tokens` y `text.format` armado con `zodTextFormat` de `openai/helpers/zod` (`json_schema` estricto); `truncated` es `status === "incomplete"`. No usa `client.responses.parse`: ese helper valida dentro del SDK, parsea cada parte de texto por separado y deja `null` en una respuesta incompleta, y así no se distinguiría un JSON roto del modelo de un cuerpo HTTP roto.
- **Timeout y reintentos:** el cliente se crea con `maxRetries: 0` y el timeout va por petición (`timeoutMs`, 30 s por defecto). Un reintento automático del SDK duplicaría la espera del usuario detrás de un timeout que ya es largo; los únicos reintentos son los de salida inválida de `generateJson`. El `fetch` del cliente se resuelve en cada llamada contra `globalThis.fetch`, y el constructor de `DeepseekProvider` acepta otro `fetch` para los tests.
- **Variables:** solo `DEEPSEEK_API_KEY`, opcional (vacía o ausente = IA no configurada, la API arranca igual). Se lee en `common/config/api-keys.config.ts`, junto a las demás keys de servicios externos, y `ia.provider.ts` la pasa a `DeepseekModel.create`. El modelo (`deepseek-flash`) y el timeout por defecto (30 s) son constantes de `DeepseekProvider`; un consumidor puede pedir otro timeout por petición con `timeoutMs`.
- **Errores:** todos con `service: "IA Provider"`, registrados en los normalizers globales de `common/errors/`.

| Código                    | Status | Cuándo                                                                        |
| ------------------------- | ------ | ----------------------------------------------------------------------------- |
| `IA_NOT_CONFIGURED`       | 503    | `DEEPSEEK_API_KEY` ausente o vacía                                            |
| `IA_INVALID_INPUT`        | 422    | La petición de generación no pasa la validación                               |
| `IA_PROVIDER_UNAVAILABLE` | 502    | DeepSeek respondió con un status de error (401, 402, 429, 5xx) o la red falló |
| `IA_TIMEOUT`              | 504    | Se agotó `timeoutMs`                                                          |
| `IA_INVALID_RESPONSE`     | 502    | Cuerpo que no es JSON, sin `choices` / `output` o con texto vacío             |
| `IA_INVALID_OUTPUT`       | 502    | `generateJson` recibió dos veces JSON roto, truncado o fuera del schema       |
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
