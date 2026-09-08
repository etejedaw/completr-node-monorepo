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
- Una librería compartida cualquiera. Helpers genéricos viven en `src/common/utils/`.
- Un wrapper trivial — si solo reexporta una librería sin agregar valor, no necesitas provider.

## Estructura

Cada provider vive en `src/<nombre>/` al mismo nivel que un módulo de negocio. No tiene `model`, `controller` ni `routes`.

Ejemplo — `src/rawg/`:

```
src/rawg/
├── rawg.provider.ts        Clase con los métodos públicos
├── rawg.interface.ts       Tipos de request/response
└── errors/
    └── rawg.service-error.ts  Constructores de ServiceError del provider
```

Si los tipos del provider son extensos, pueden ir en `interfaces/<algo>.interface.ts` siguiendo la regla 1 → raíz, 2+ → subcarpeta.

## La clase Provider

```ts
// src/rawg/rawg.provider.ts
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

		const response = await fetch(url.toString());
		this.handleErrors(response);

		const data = await response.json();
		return data.results;
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

- **Clase con constructor** que recibe credenciales/configuración. La instancia se crea en el módulo que la consume (o se exporta como singleton si tiene sentido).
- **Métodos públicos** = la interfaz limpia. Nombres en términos del dominio del provider (`searchGame`, `getGameById`).
- **Métodos privados** para parsing, manejo de errores, helpers internos.
- **Sin lógica de negocio** — el provider no decide qué hacer con los datos, solo los entrega.

## Errores

El provider lanza `ServiceError` con `service: "<Nombre> Provider"` — distinto de `"<Nombre> Service"` para distinguir fallos externos de fallos internos.

```ts
// src/rawg/errors/rawg.service-error.ts
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

## Cómo lo consume un módulo

El módulo de negocio importa el provider y lo usa dentro de su service.

```ts
// games/games.service.ts
import { RawgProvider } from "../rawg/rawg.provider";
import { apiKeysConfig } from "../common/config/api-keys.config";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);

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

Las credenciales y endpoints viven en `src/common/config/api-keys.config.ts` (u otro `*.config.ts` según corresponda):

```ts
export const apiKeysConfig = {
	RAWG_API_KEY: process.env.RAWG_API_KEY ?? ""
};
```

El provider las recibe por constructor — **nunca leas `process.env` dentro del provider**. Mantén la configuración inyectada para facilitar tests futuros.

## Providers implementados

| Provider    | Propósito                                        |
| ----------- | ------------------------------------------------ |
| `src/rawg/` | RAWG API: géneros, descripciones, covers, scores |

Es el único que existe hoy. **Qué integraciones vienen después no se decide acá:** el roadmap de fuentes externas es planificación de producto, y varias dependen de revisiones de licencia todavía abiertas.

## Cómo crear un provider nuevo

1. Crear `src/<nombre>/`.
2. Definir tipos en `<nombre>.interface.ts` (request, response, filtros).
3. Implementar `<nombre>.provider.ts` con clase + constructor que reciba credenciales.
4. Crear `errors/<nombre>.service-error.ts` con los códigos del provider y `service: "<Nombre> Provider"`.
5. Agregar la variable de entorno al `.env.example` y al `*.config.ts` correspondiente.
6. **No hace falta** crear `controller`, `routes`, `model`, `serializer`, `dtos` ni `schemas` — el provider no expone HTTP propio.
7. Si los errores del provider tienen que llegar al cliente con status code propio, registrar un normalizer del provider en `global-error-domain.normalizer.ts` (mismo patrón que un módulo de negocio). Si no, el service que lo consume captura y traduce.

## Nota: ¿providers en `src/` o en `src/common/providers/`?

Hoy todos viven directamente en `src/`. La regla vigente es **un provider por carpeta en `src/`**. Mover los genéricos a `src/common/providers/` sigue siendo una decisión abierta.
