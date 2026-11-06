# Providers

Los **providers** son adapters para integraciones externas: APIs HTTP, scrapers, SDKs de servicios de terceros. Aíslan al resto del código de cómo se habla con ese servicio.

## Qué es y qué no es un provider

Un provider:

- Encapsula la comunicación con un sistema externo (APIs de terceros, sitios que se leen por scraping, pasarelas de pago, SMTP, modelos de IA).
- Expone una interfaz limpia y tipada en términos del dominio del provider.
- Maneja transporte: HTTP, parsing, timeouts, rate limits, errores de red.

Un provider **no** es:

- Un módulo de negocio. No tiene controller, routes, ni habla con la DB.
- Una librería compartida cualquiera. Helpers genéricos viven en `apps/api/src/common/utils/`.
- Un wrapper trivial — si solo reexporta una librería sin agregar valor, no necesitas provider.

## Estructura

Cada provider vive en `apps/api/src/<nombre>/` al mismo nivel que un módulo de negocio; no existe `apps/api/src/common/providers/`. La única forma de anidar es la del provider con modelo inyectable, donde cada proveedor es un submódulo de su capacidad.

Ejemplo — `apps/api/src/acme/`:

```
apps/api/src/acme/
├── acme.provider.ts        Clase base abstracta + implementación activa y deshabilitada
├── acme.interface.ts       Contrato del provider y tipos de request/response
└── errors/
    ├── acme.service-error.ts            Constructores de ServiceError
    ├── acme.domain-error.ts             Constructores de DomainError
    ├── acme.service-to-domain.mapper.ts ServiceError → DomainError
    ├── acme.domain-to-http.mapper.ts    DomainError → HttpError
    └── acme.error-domain.normalizer.ts  Entry point desde el normalizer global
```

Si los tipos del provider son extensos, pueden ir en `interfaces/<algo>.interface.ts` siguiendo la regla 1 → raíz, 2+ → subcarpeta.

## La clase Provider

El contrato es una **clase base abstracta** que declara `isEnabled` y los métodos del provider. De ella cuelgan la implementación real y la deshabilitada, y la elección entre ambas es un **método estático de la propia clase base**:

```ts
// apps/api/src/acme/acme.provider.ts
export abstract class AcmeClient {
	abstract readonly isEnabled: boolean;

	static create(apiKey?: string): AcmeClient {
		return apiKey ? new AcmeProvider(apiKey) : new DisabledAcmeProvider();
	}

	abstract searchItems(query: string): Promise<AcmeSearchResult[]>;
}

export class AcmeProvider extends AcmeClient {
	readonly isEnabled = true;
	private readonly BASE_URL = "https://api.acme.example/v1";

	constructor(private readonly apiKey: string) {
		super();
	}

	async searchItems(query: string): Promise<AcmeSearchResult[]> {
		const url = new URL(`${this.BASE_URL}/items`);
		url.searchParams.set("key", this.apiKey);
		url.searchParams.set("search", query);
		const data = await this.request<AcmeSearchResponse>(url);
		return data.results;
	}

	private async request<T>(url: URL): Promise<T> {
		let response: Response;
		try {
			response = await fetch(url.toString());
		} catch (error) {
			throw acmeServiceError.requestError(error);
		}
		if (response.status === 429) throw acmeServiceError.rateLimitedError();
		if (response.status === 404) throw acmeServiceError.notFoundError();
		if (!response.ok) throw acmeServiceError.requestError(response.status);
		try {
			return (await response.json()) as T;
		} catch (error) {
			throw acmeServiceError.parseError(error);
		}
	}
}

export class DisabledAcmeProvider extends AcmeClient {
	readonly isEnabled = false;

	searchItems(): Promise<AcmeSearchResult[]> {
		return Promise.reject(acmeServiceError.disabledError());
	}
}
```

- **El archivo exporta clases, no funciones sueltas**, y no instancia nada: sin estado global ni side effects al importar.
- **`create` es el único lugar donde vive la decisión** "con credencial → real, sin credencial → deshabilitado". El módulo que consume crea su instancia con `AcmeClient.create(...)`.
- **Métodos públicos** = la interfaz limpia, con nombres en términos del dominio del provider (`searchItems`, `getItemById`). **Métodos privados** para red, parsing y errores.
- **Ningún error crudo sale del provider**: los fallos de red y los cuerpos ilegibles también se traducen a `ServiceError`.
- **Sin lógica de negocio**: el provider no decide qué hacer con los datos, solo los entrega.
- **La disponibilidad se le pregunta a la instancia** (`acme.isEnabled`), no a un flag por integración en el config. Si un flujo debe degradar en silencio, chequea `isEnabled` antes de llamar (por ejemplo, una búsqueda que cae a datos locales). Si debe fallar visible, no chequea nada: el provider deshabilitado rechaza con `<MOD>_DISABLED` y el normalizer lo convierte en 503. Los métodos deshabilitados devuelven una promesa rechazada, no lanzan de forma síncrona.

## Errores

El provider lanza `ServiceError` con `service: "<Nombre> Provider"` (ver [`errors.md`](./errors.md#reglas-duras)). Si sus errores tienen que llegar al cliente con status propio, se registra en los normalizers globales de `common/errors/` como un módulo más.

```ts
// apps/api/src/acme/errors/acme.service-error.ts
const BASE_OPTIONS = { service: "ACME Provider" };

export function rateLimitedError() {
	return new ServiceError("ACME_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
```

Un constructor por código, todos con el mismo `BASE_OPTIONS`.

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
// <modulo>/<modulo>.service.ts
import { apiKeysConfig } from "../common/config/api-keys.config";
import { AcmeClient } from "../acme/acme.provider";

const acme = AcmeClient.create(apiKeysConfig.ACME_API_KEY);

export async function importItemFromAcme(acmeId: number) {
	const detail = await acme.getItemById(acmeId);
	// ... lógica de negocio: mapear, guardar, etc.
}
```

Si el provider lanza un `ServiceError`, el service puede:

- Dejarlo fluir → el middleware global lo convierte a `HttpError`, si el provider está registrado (ver "Errores").
- Capturarlo y traducirlo a un error del módulo (ej: `ACME_NOT_FOUND` → `<MODULO>_ACME_NOT_FOUND`).
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
		ACME_API_KEY: optionalApiKey
	})
	.readonly();
```

Las credenciales de providers son **opcionales**: un provider sin key deshabilita su integración, no tumba el arranque. Agregar un provider nuevo es una línea más en el schema, reusando `optionalApiKey`.

Las clases del provider reciben la credencial por constructor — **nunca leas `process.env` ni importes el config dentro del provider**. Quien lee el config es el módulo que instancia.

## Provider con modelo inyectable

Cuando una capacidad puede cumplirla más de un proveedor externo (IA, correo), el provider no es el proveedor: es una clase propia de la capacidad que recibe por constructor la implementación concreta.

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

## Providers de scraping

Un provider que lee páginas HTML públicas sigue la estructura de cualquier provider, con dos diferencias: no tiene credencial (no hay clase deshabilitada ni variable de entorno) y toda su red pasa por un cliente HTTP compartido de scraping.

- **Se respeta el `robots.txt` del sitio.** Si prohíbe su buscador, el provider no busca: solo pide páginas de detalle con un id o slug que aporta quien llama. Un id o slug con forma inválida se rechaza con `<MOD>_NOT_FOUND` sin hacer la request, para no construir nunca una URL fuera de la ruta prevista.
- **Un dato ausente no es un error.** Un valor ausente, `tbd` o fuera de rango se devuelve como `null`. `<MOD>_PARSE_ERROR` queda para cuando la página no tiene la estructura esperada, que suele indicar un cambio del sitio. Los valores se devuelven crudos: normalizarlos o elegir uno es regla de negocio del módulo que consume.
- **Una sola instancia por proceso**, montada sobre el cliente compartido, para que todos los consumidores (acción individual, jobs, colas) compartan la cola por host. Los tests construyen la clase directamente con un cliente propio.

### Cliente HTTP compartido

Devuelve el HTML o lanza un error con un `kind` (`NOT_FOUND`, `RATE_LIMITED`, `BLOCKED`, `TIMEOUT`, `REQUEST_ERROR`, `ABORTED`) y el detalle (`url`, `status`, `attempts`, `retryAfterMs`). Ese error no sale del provider: cada uno lo traduce a `<MOD>_<kind>`.

- **Cola por host:** una sola request a la vez por host, en orden de llegada. Hosts distintos no se esperan entre sí.
- **Prioridad:** una request interactiva pasa delante de las de fondo que esperan en la cola del host, sin interrumpir la que está en curso y respetando el throttle.
- **Cancelación:** un `AbortSignal` saca una request de la cola sin llegar a la red, o aborta el `fetch` si ya salió. Un abort en vuelo deja corriendo el throttle del host, porque la request pudo llegar al sitio.
- **Throttle:** una espera mínima con jitter aleatorio entre dos requests al mismo host, también entre reintentos.
- **Reintentos:** uno solo, ante 429, 5xx, fallo de red o timeout, respetando `Retry-After`. Un `Retry-After` mayor que el tope no se espera: se falla en el acto y el host queda frenado hasta ese momento. El backoff de un 429 frena a todo el host (el sitio pidió bajar el ritmo); el de un 5xx o un fallo de red solo demora a esa request.
- **Bloqueos:** un 403, el header `cf-mitigated: challenge` o una página de challenge o CAPTCHA reconocible es `BLOCKED` y nunca se reintenta. No se intenta sortear ningún bloqueo: ni proxies, ni navegadores automatizados, ni cambio de User-Agent.
- **Identificación:** un User-Agent propio y descriptivo, con una URL de contacto, sin hacerse pasar por un navegador.
- **Inyectable:** el constructor acepta `fetch`, `sleep`, `now` y `random`, para probar colas, esperas y reintentos con un reloj simulado y sin red.

Una API de consultas pública (no un sitio leído por scraping) puede usar el mismo cliente con su propia instancia y un throttle más corto, para no esperar a la cola de los sitios.

## Providers de IA

- **La validación y los reintentos viven en la clase de la capacidad**, no en cada proveedor: el modelo devuelve el texto crudo y la capacidad lo parsea, lo valida con el schema de Zod y, si está roto, truncado o fuera del schema, lo vuelve a pedir un número acotado de veces, agregando a las instrucciones el motivo del rechazo para que el modelo lo corrija.
- **Sin reintentos automáticos del SDK** y con timeout por petición: un reintento oculto duplica la espera del usuario detrás de un timeout que ya es largo.
- **Lo que se le manda al proveedor no identifica a la persona** (ni correo, ni nombre de usuario, ni ids de cuenta) y la petición sale del servidor, nunca del navegador.
- **Cambiar de proveedor, de país o de datos enviados exige actualizar la política de privacidad** y cualquier aviso de la UI que lo nombre, en el mismo cambio.

## Extraer valores de un provider

Qué campo de la respuesta de un provider se guarda, y bajo qué fuente, es regla de negocio: vive en el módulo que consume el provider, no en el provider. Se escribe como un array explícito de extractores, uno por campo (`source` + `extract(payload) => number | null`), tipados contra la respuesta del provider para que un campo inexistente falle al compilar, y un runner genérico que los recorre. Sumar un campo es agregar una entrada al array; el mapper no cambia. El registry es un array explícito, sin registro por efecto secundario al importar, para que lo que no está en el array no exista.

## Cómo crear un provider nuevo

1. Crear la carpeta con la estructura de "Estructura" y sus tipos en `<nombre>.interface.ts`.
2. Escribir la clase base, la implementación y la deshabilitada como en "La clase Provider".
3. Crear sus errores como en "Errores", incluido `<MOD>_DISABLED`.
4. Agregar la credencial al `.env.example` y al `*.config.ts` correspondiente, como en "Configuración".
