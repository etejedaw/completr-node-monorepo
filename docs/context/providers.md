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

Cada provider vive en `apps/api/src/<nombre>/` al mismo nivel que un módulo de negocio; no existe `apps/api/src/common/providers/`. No tiene `model`, `controller` ni `routes`. La única forma de anidar es la del provider con modelo inyectable, donde cada proveedor es un submódulo de su capacidad.

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

El provider lanza `ServiceError` con `service: "<Nombre> Provider"` (ver [`errors.md`](./errors.md#reglas-duras)). Si sus errores tienen que llegar al cliente con status propio, se registra en los normalizers globales de `common/errors/` como un módulo más.

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
- `<MOD>_DISABLED` — el provider no tiene credencial configurada (503).
- `<MOD>_ABORTED` — quien llamó abortó la request con su `signal`.
- `<MOD>_INTERNAL_ERROR` — código del provider sin mapeo propio (500).

El status HTTP de cada código está en el `*.domain-to-http.mapper.ts` del provider.

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

## Provider con modelo inyectable

Cuando una capacidad puede cumplirla más de un proveedor externo (IA con DeepSeek, OpenAI u otro), el provider no es el proveedor: es una clase propia de la capacidad que recibe por constructor la implementación concreta. Siguen esta forma `ia/` (`IaProvider` con `DeepseekModel`) y `mail/` (`MailProvider` con `NodemailerModel`, o `InMemoryMailModel` en tests).

```
apps/api/src/<capacidad>/
├── <capacidad>.interface.ts    Tipos de request/response y la interfaz <Capacidad>Model
├── <capacidad>.provider.ts     class <Capacidad>Provider { constructor(private readonly model: <Capacidad>Model) }
│                               export const <capacidad>Provider = new <Capacidad>Provider(<Proveedor>Model.create(...))
├── errors/                     Errores en 3 capas de la capacidad, no del proveedor
└── <proveedor>/
    └── <proveedor>.provider.ts <Proveedor>Model implements <Capacidad>Model, con static create y su variante Disabled
```

- **Un solo punto de entrada.** El resto de la API importa solo la instancia `<capacidad>Provider` de `<capacidad>/<capacidad>.provider`. Nadie crea su propia instancia ni importa el submódulo del proveedor: lo prohíbe la regla `no-restricted-imports` de `eslint.config.mjs`, que hay que ampliar con cada capacidad nueva. Los tests sí pueden importar los modelos internos.
- **El contrato es la interfaz `<Capacidad>Model`**, escrita en términos de la capacidad (`generateText`, `isEnabled`), nunca en los del proveedor. Los tipos propios del proveedor quedan dentro de su submódulo.
- **La clase de la capacidad hace lo común a todos los proveedores:** validar y normalizar la entrada, exponer si hay un modelo configurado y rechazar con el error de "no configurado" de la capacidad (por ejemplo `mailProvider.assertConfigured()`), en vez de que cada consumidor lo compruebe. El submódulo del proveedor solo habla con el servicio externo y traduce sus fallos a los errores de la capacidad.
- **Cambiar de proveedor** es escribir otro submódulo que implemente la interfaz y cambiar la línea que crea la instancia. Los consumidores no se tocan.
- **Configuración:** las keys van en `common/config/api-keys.config.ts` y los ajustes que cambian por entorno en el `*.config.ts` de la capacidad (por ejemplo `mail.config.ts`); `<capacidad>.provider.ts` los lee y se los pasa al modelo. Lo fijo del proveedor (modelo, timeout, URL base) es una constante de su clase, no una variable de entorno.
- **Tests:** la clase de la capacidad se prueba con un modelo falso que implementa la interfaz; cada proveedor se prueba aparte con `fetch` (o su transporte) simulado.

## Providers implementados

| Provider                   | Propósito                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/rawg/`       | RAWG API: géneros, descripciones, covers, scores. Cada request se corta a los 5 s y es `RAWG_REQUEST_ERROR`               |
| `apps/api/src/igdb/`       | IGDB API (con token de Twitch): búsqueda y detalle de juegos como fuente auxiliar de RAWG                                 |
| `apps/api/src/hltb/`       | HowLongToBeat por scraping de la página de detalle: duraciones Main Story, Main + Extras y Completionist                  |
| `apps/api/src/metacritic/` | Metacritic por scraping de la página de detalle: Metascore, User Score, plataformas y año                                 |
| `apps/api/src/wikidata/`   | Wikidata por su endpoint SPARQL público: descubre el id de HowLongToBeat de un juego a partir de su slug de RAWG o título |
| `apps/api/src/mail/`       | Correo transaccional. Modelos internos: `mail/nodemailer/` y `mail/in-memory/` (tests). Se deshabilita sin `SMTP_HOST`    |
| `apps/api/src/ia/`         | Generación de texto y JSON estructurado con IA. Proveedor interno: `ia/deepseek/`. Se deshabilita sin `DEEPSEEK_API_KEY`  |

**Qué integraciones vienen después no se decide acá:** el roadmap de fuentes externas es planificación de producto, y varias dependen de revisiones de licencia todavía abiertas.

## Provider de IGDB

`apps/api/src/igdb/` habla con la API v4 de IGDB, que se autentica con un token de aplicación de Twitch. Sigue la estructura de RAWG (clase base abstracta, `igdb.interface.ts`, `errors/` en tres capas) y suma `igdb-token.client.ts`, que maneja el token.

```
apps/api/src/igdb/
├── igdb.provider.ts        IgdbClient (create), IgdbProvider y DisabledIgdbProvider
├── igdb-token.client.ts    IgdbTokenClient: pide, cachea y renueva el token de Twitch
├── igdb.interface.ts       IgdbGame, IgdbSearchOptions, IgdbTokenResponse
└── errors/                 Errores en 3 capas (service y módulo "IGDB Provider")
```

- **Credenciales:** `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET`, ambas opcionales en `common/config/api-keys.config.ts`. `IgdbClient.create(clientId, clientSecret)` devuelve `DisabledIgdbProvider` si falta cualquiera de las dos; sus métodos devuelven una promesa rechazada con `IGDB_DISABLED`, sin lanzar de forma síncrona. Al arrancar, `app.ts` deja un warning si falta alguna.
- **Métodos:** `searchGame(query, { limit?, mainGamesOnly? })`, `getGameById(id)` y `getGameBySlug(slug)`. Todos devuelven `IgdbGame` tal como lo manda IGDB, sin mapear: los campos ausentes quedan `undefined`.
- **Request:** `POST https://api.igdb.com/v4/games` con un cuerpo Apicalypse que pide en un solo request todos los campos que usan el mapper y el match (lista en `igdb.provider.ts`).
- **Búsqueda:** el texto se escapa dentro del literal de `search`, así nunca sale de él ni agrega cláusulas a la consulta.
- **Token:** `IgdbTokenClient` lo pide a Twitch con las credenciales en el cuerpo, nunca en la URL, lo guarda en memoria y lo renueva antes de que venza. Las llamadas concurrentes comparten el mismo pedido en curso. El provider no pide token hasta su primera request.
- **401 de IGDB:** se invalida el token (solo si sigue siendo el que falló, para que un 401 tardío no tire uno ya renovado), se pide otro y se reintenta una sola vez. Un segundo 401 es `IGDB_AUTH_ERROR`. Varios 401 concurrentes comparten una sola renovación.
- **Timeout:** cada request a IGDB y a Twitch se corta a los 5 s, incluida la lectura del cuerpo, y cuenta como `IGDB_REQUEST_ERROR`.
- **Sin límite de frecuencia:** el provider no encola ni espera; si se pasa del límite de IGDB, responde 429 y el provider lanza `IGDB_RATE_LIMITED` sin reintentar. Quien lo llama pasa por el turnero descrito en [`rules.md`](../rules.md#datos-externos).

## Providers de scraping: HLTB y Metacritic

`apps/api/src/hltb/` y `apps/api/src/metacritic/` leen páginas HTML públicas, no una API. Siguen la estructura de cualquier provider (clase, `*.interface.ts`, `errors/` en tres capas), con dos diferencias: no tienen credencial, así que no hay clase deshabilitada ni variable de entorno, y toda la red pasa por un cliente HTTP compartido, `apps/api/src/scraping/`.

### Solo páginas de detalle

Los providers respetan el `robots.txt` de cada sitio. HowLongToBeat prohíbe `/api` (lo que usa su buscador) y Metacritic prohíbe `/search`, así que **ningún provider busca**: solo piden páginas de detalle.

- `HltbClient.getGameById(externalId)` pide `https://howlongtobeat.com/game/<id>`. Necesita un id de HLTB ya conocido; el provider no lo descubre. Sale de un `GameExternal` con fuente `hltb` o, si el juego no lo tiene, lo resuelve Wikidata (ver "Provider de Wikidata").
- `MetacriticClient.getGameBySlug(slug)` pide `https://www.metacritic.com/game/<slug>/`. El slug lo aporta quien llama (derivado del título o de un `GameExternal` con fuente `metacritic`).

Un id que no es numérico o un slug que no cumple `^[a-z0-9]+(?:-+[a-z0-9]+)*$` se rechaza con `<MOD>_NOT_FOUND` sin hacer la request: así nunca se construye una URL fuera de `/game/`.

Cada instancia se obtiene con `HltbClient.create()` / `MetacriticClient.create()`, que devuelven siempre la misma instancia, montada sobre `ScrapingHttpClient.shared()`. Así la acción individual y el job comparten la cola por host. Los tests construyen la clase directamente con un `ScrapingHttpClient` propio.

### Qué se parsea

HLTB se lee del JSON de `__NEXT_DATA__` y Metacritic del JSON-LD `VideoGame` del `<head>`, con selectores `data-testid` de respaldo (el User Score solo está en el HTML). Un dato ausente no es un error: una duración o un score ausente, `tbd` o fuera de rango se devuelve como `null`. `<MOD>_PARSE_ERROR` queda para cuando la página no tiene la estructura esperada, que suele indicar un cambio del sitio. Las notas se devuelven crudas: normalizarlas o elegir una es regla de negocio del módulo que consume.

### Cliente HTTP compartido (`apps/api/src/scraping/`)

`ScrapingHttpClient.getHtml(url, options)` devuelve el HTML (`getText(url, headers, options)` hace lo mismo con headers propios, como el `Accept` JSON de Wikidata) o lanza `ScrapingRequestError` con un `kind` (`NOT_FOUND`, `RATE_LIMITED`, `BLOCKED`, `TIMEOUT`, `REQUEST_ERROR`, `ABORTED`) y el detalle (`url`, `status`, `attempts`, `retryAfterMs`). Ese error no sale del provider: cada uno lo traduce con `fromRequestFailure` de su `*.service-error.ts` a `<MOD>_<kind>`.

- **Cola por host:** una sola request a la vez por host; las llamadas concurrentes salen en orden de llegada. Hosts distintos no se esperan entre sí.
- **Prioridad:** `options.priority` es `"background"` (por defecto) o `"interactive"`. Una interactiva pasa delante de todas las de fondo que esperan en la cola del host, pero no interrumpe la que está en curso y respeta el throttle. Entre interactivas se mantiene el orden de llegada. La usa el refresco individual de datos externos; el job y la cola de importación van en fondo.
- **Cancelación:** `options.signal` saca una request de la cola sin llegar a la red, o aborta el `fetch` si ya salió. Un abort en vuelo deja corriendo el throttle del host, porque la request pudo llegar al sitio.
- **Throttle:** entre dos requests al mismo host pasan al menos 5 s más un jitter aleatorio, también entre reintentos. Es una precaución propia, no un límite publicado por los sitios.
- **Reintentos:** uno solo, ante 429, 5xx, fallo de red o timeout, respetando `Retry-After`. Un `Retry-After` mayor que el tope no se espera: se falla en el acto y el host queda frenado hasta ese momento. El backoff de un 429 frena a todo el host (el sitio pidió bajar el ritmo); el de un 5xx o un fallo de red solo demora a esa request.
- **Bloqueos:** un 403, el header `cf-mitigated: challenge` o una página de challenge o CAPTCHA reconocible (Cloudflare, DataDome, PerimeterX, reCAPTCHA, hCaptcha) es `BLOCKED` y nunca se reintenta. No se intenta sortear ningún bloqueo: ni proxies, ni navegadores automatizados, ni cambio de User-Agent.
- **Identificación:** `User-Agent: CompletrBot/1.0 (+https://www.completr.app)`, sin hacerse pasar por un navegador.
- **Inyectable:** el constructor acepta `fetch`, `sleep`, `now` y `random`, para probar colas, esperas y reintentos con un reloj simulado y sin red.

El throttle vive en memoria, así que cubre una sola instancia de la API. Con varias réplicas habría que moverlo a estado compartido.

Los errores son `HLTB_<kind>` y `METACRITIC_<kind>`, más `<MOD>_PARSE_ERROR` cuando la página no tiene la estructura esperada.

## Provider de Wikidata

`apps/api/src/wikidata/` existe porque HLTB solo se lee por página de detalle y su buscador está prohibido por `robots.txt`: hace falta otra forma de conocer el id de un juego. Wikidata publica sus datos bajo CC0 y su servicio de consultas admite tráfico automatizado que se identifique con un User-Agent descriptivo. Tiene el slug de RAWG (P9968), el id de HowLongToBeat (P2816) y la fecha de publicación (P577), y en el catálogo `Game.code` funciona como slug de RAWG.

- `WikidataClient.findHltbCandidates({ rawgSlug, title })` hace **una sola** consulta SPARQL que une los ítems con ese slug de RAWG y los que tienen exactamente ese título como etiqueta en inglés. Elegir entre los candidatos es regla de negocio del módulo que consume (`games/utils/resolve-hltb-id.util.ts`).
- El slug y el título se escapan como literales SPARQL (`escapeSparqlString`), así un título nunca puede salir del literal ni agregar patrones a la consulta.
- `WikidataClient.create()` devuelve siempre la misma instancia, con un `ScrapingHttpClient` **propio** (no el compartido): mismo User-Agent de Completr, timeout y reintentos por defecto, pero un throttle de 1000 ms más un jitter de 0 a 500 ms, porque es una API pensada para consultas y no un sitio que se lee por scraping. Al ser otro host, no espera a la cola de HLTB ni de Metacritic. Sus requests de fondo aceptan un `Retry-After` de hasta 10 minutos (`backgroundMaxRetryAfterMs`): Wikidata a veces pide esperas de varios minutos (por ejemplo, 429 con `Retry-After: 120`) aunque se le hayan hecho pocas consultas, y con el tope de 60 s el job fallaba sin reintentar. Mientras dura esa espera, el host queda frenado también para el refresco individual, que vence por su plazo de 45 s. Las opciones se exportan como `WIKIDATA_HTTP_OPTIONS`.
- Se cablea en `apps/api/src/app.ts` como `hltbIdResolver` del registro de fuentes externas.

No hay `WIKIDATA_NOT_FOUND`: una consulta sin resultados devuelve `[]`.

## Módulo `ia` y su submódulo `deepseek`

`apps/api/src/ia/` es la base de las features de IA y sigue la forma del [provider con modelo inyectable](#provider-con-modelo-inyectable): DeepSeek vive como submódulo interno, `apps/api/src/ia/deepseek/`.

```
apps/api/src/ia/
├── ia.interface.ts        GenerateTextRequest, GenerateJsonRequest, GenerateTextResult y la interfaz IaModel
├── ia.provider.ts         Contrato público: clase IaProvider y su instancia iaProvider
├── errors/                Errores en 3 capas (service "IA Provider", módulo "IA Provider")
└── deepseek/
    └── deepseek.provider.ts    DeepseekModel (create), DeepseekProvider y DisabledDeepseekProvider
```

- **Contrato público:** `iaProvider.generateText({ instructions, content, maxTokens?, temperature?, timeoutMs? })` devuelve `{ text, truncated }`; `truncated` es `true` si el modelo se cortó por el límite de tokens. `iaProvider.generateJson(schema, { ...lo mismo, schemaName })` recibe un schema de zod y devuelve el objeto ya validado: parsea el JSON, lo valida con `schema.safeParse` y, si el JSON está roto, no cumple el schema o vino truncado, lo vuelve a pedir hasta completar 3 intentos; si el último también falla, rechaza con `IA_INVALID_OUTPUT`. Cada reintento agrega a las instrucciones el motivo del rechazo anterior (por ejemplo, el campo que se pasó de largo), para que el modelo lo corrija en vez de repetir lo mismo. Los reintentos existen porque DeepSeek respeta la estructura, los campos obligatorios y los `enum`, pero no `maxLength`. Si el modelo parte la respuesta en varios objetos JSON seguidos (`parseJsonOutput`, en `ia/utils/parse-json-output.util.ts`), se unen en uno solo cuando no repiten claves. `iaProvider.isConfigured` dice si hay un modelo configurado, para que un consumidor pueda degradar en silencio.
- **Modelo inyectado:** el `generateJson` de `IaModel` devuelve el texto crudo, para que la validación y los reintentos vivan en `IaProvider` y no en cada proveedor.
- **El proveedor está nombrado fuera del código:** la política de privacidad (`apps/landing/src/content/legal/privacy-en.md` y `privacy-es.md`, secciones "Where your data goes", "Transfers outside Chile" y "Automated decisions") dice qué proveedor escribe el resumen del Rewind, en qué país procesa y qué datos recibe, y el diálogo de generación (`rewind-generate-dialog.ts`, aviso del botón "Who writes the AI recap") lo nombra. Cambiar de proveedor o de país, o mandarle datos nuevos, exige actualizar ambas versiones de la política (con su `version` y `updated`) y ese aviso en el mismo cambio.
- **Sin datos que identifiquen al usuario:** la política promete que el proveedor no recibe nada que identifique a la persona. El contenido que arma un consumidor (por ejemplo `build-rewind-recap-content.util.ts`) no lleva correo, nombre de usuario, nombre visible ni ids de cuenta o de partida, y la petición sale del servidor, nunca del navegador. Las notas del usuario solo viajan si él las incluye de forma explícita.
- **Validación:** `IaProvider` rechaza con `IA_INVALID_INPUT` una petición inválida antes de llamar a la red.
- **DeepSeek:** SDK oficial `openai` con `baseURL: "https://api.deepseek.com"` (DeepSeek es compatible con OpenAI). `generateText` usa `client.chat.completions.create` con el razonamiento desactivado (`thinking: { type: "disabled" }`, parámetro extra que el SDK reenvía tal cual) y `stream: false`; `truncated` es `finish_reason === "length"`. `generateJson` usa `client.responses.create` con `reasoning: { effort: "none" }`, `max_output_tokens` y `text.format` armado con `zodTextFormat` de `openai/helpers/zod` (`json_schema` estricto); `truncated` es `status === "incomplete"`. No usa `client.responses.parse`: ese helper valida dentro del SDK, parsea cada parte de texto por separado y deja `null` en una respuesta incompleta, y así no se distinguiría un JSON roto del modelo de un cuerpo HTTP roto.
- **Timeout y reintentos:** el cliente se crea con `maxRetries: 0` y el timeout va por petición (`timeoutMs`, 30 s por defecto). Un reintento automático del SDK duplicaría la espera del usuario detrás de un timeout que ya es largo; los únicos reintentos son los de salida inválida de `generateJson`. El `fetch` del cliente se resuelve en cada llamada contra `globalThis.fetch`, y el constructor de `DeepseekProvider` acepta otro `fetch` para los tests.
- **Variables:** solo `DEEPSEEK_API_KEY`, opcional (vacía o ausente = IA no configurada, la API arranca igual).

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
8. Si los errores del provider tienen que llegar al cliente con status code propio, registrarlo en los normalizers globales (mismo patrón que un módulo de negocio). Si no, el service que lo consume captura y traduce.
