# Sistema de errores

3 capas. Cada capa tiene un propósito y un dueño claro.

```
ServiceError → DomainError → HttpError
   (service)    (controller)    (error handler middleware)
```

## Las 3 clases base

Viven en `src/common/errors/`.

### `ServiceError`

Errores técnicos o de negocio detectados en la capa de aplicación / infraestructura.

```ts
class ServiceError extends Error {
    code: string;                  // ej: "GAME_NOT_FOUND"
    serviceError: {
        service: string;           // ej: "Games Service"
        raw: unknown;              // el error original
        externalError?: {...};     // datos del request HTTP si fue provider
    }
}
```

- **Lo lanzan:** `services` y `providers`.
- **Razones típicas:** fallo de DB, unique constraint, validation, recurso no encontrado, timeout de provider externo, rate limit.

### `DomainError`

Errores de reglas de negocio expresados en términos del dominio.

```ts
class DomainError extends Error {
	module: string; // ej: "Game Module"
	code: string; // ej: "GAME_NOT_FOUND"
	message: string; // mensaje legible
	context?: Record<string, unknown> & { correlationId?: string };
}
```

- **Lo lanzan:** `controllers` (directamente) y los `normalizers` de cada módulo (al convertir un `ServiceError` que llegó al middleware global).
- **Razones típicas:** recurso no encontrado en el flujo del controller, acción no permitida, validación cruzada entre módulos.

### `HttpError`

Errores en formato HTTP listos para responder al cliente (siguiendo Problem Details, RFC 7807).

```ts
class HttpError extends Error {
	type: string; // código del error (ej: "GAME_NOT_FOUND")
	title: string;
	status: number; // HTTP status
	detail?: string;
	instance: string; // request.originalUrl
	timestamp: Date;
	correlationId: string;
	context?: Record<string, unknown>;
}
```

- **Lo construyen:** los `domain-to-http.mapper.ts` de cada módulo.
- **Lo serializa:** `errorHandlerMiddleware` como JSON.

## Flujo completo

```
service throws ServiceError
        ↓
controller (no lo captura) → llega al errorHandlerMiddleware
        ↓
globalErrorDomainNormalizer  → enruta por error.serviceError.service
        ↓
<modulo>.error-domain.normalizer  → llama al service-to-domain.mapper
        ↓
<modulo>.service-to-domain.mapper  → ServiceError → DomainError
        ↓
globalErrorHttpNormalizer  → enruta por error.module
        ↓
<modulo>.domain-to-http.mapper  → DomainError → HttpError con status code
        ↓
errorHandlerMiddleware  → response.status(httpError.status).json(httpError)
```

Si el controller lanza un `DomainError` directamente, el `globalErrorDomainNormalizer` lo detecta y se salta el paso de conversión:

```ts
if (error instanceof DomainError) return error;
```

## Archivos en cada módulo

Cada módulo de negocio tiene en su carpeta `errors/`:

```
errors/
├── <modulo>.service-error.ts            Constructores de ServiceError
├── <modulo>.domain-error.ts             Constructores de DomainError
├── <modulo>.service-to-domain.mapper.ts ServiceError → DomainError
├── <modulo>.domain-to-http.mapper.ts    DomainError → HttpError (status code)
└── <modulo>.error-domain.normalizer.ts  Entry point del módulo desde el global
```

## Reglas duras

1. **Los services nunca lanzan `DomainError`.** Solo `ServiceError` (o retornan `null` para que el controller decida).
2. **Los controllers nunca lanzan `ServiceError`.** Solo `DomainError` para reglas de negocio que el controller mismo detecta.
3. **Los providers lanzan `ServiceError` con `service: "<Nombre> Provider"`** — distinto a `"<Nombre> Service"` para diferenciar fallos externos de fallos internos.
4. **El `service` y el `module` se usan como claves de routing en los normalizers globales.** Si los renombras, hay que actualizar `global-error-domain.normalizer.ts` y `global-error-http.normalizer.ts`.
5. **Los códigos de error siguen el patrón `<MODULO>_<CAUSA>`** en `SCREAMING_SNAKE_CASE` (`GAME_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`, `RAWG_RATE_LIMITED`).
6. **El `correlationId` se propaga en el `context`** para trazabilidad en logs.
7. **Cuando uses `rethrowSequelizeError`, todo el cuerpo crítico (incluido el `return`) va dentro del `try`.** La función está tipada `: never`, así que el código tras el catch solo correría en path feliz — declarar variables `let` afuera para llenarlas adentro y consumirlas después es confuso y propenso a bugs. Ver "Patrón `rethrowSequelizeError`" más abajo.

## Patrón `rethrowSequelizeError`

`rethrowSequelizeError(error, mappers)` vive en `src/common/errors/sequelize-error.mapper.ts` y mapea `UniqueConstraintError` / `ValidationError` de Sequelize a `ServiceError`s del módulo. Está tipado como `: never`, por lo que cualquier ruta que pase por el catch lanza.

### CLEAN — todo dentro del try, return desde adentro

```ts
export async function createBacklog(userId: string, dto: RegisterBacklogDto) {
	try {
		const backlogEntry = await Backlog.create({ ...dto, userId });
		await backlogEntry.reload({ include: backlogInclude });
		return backlogEntry;
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: backlogServiceError.uniqueConstraintError,
			validation: backlogServiceError.validationError
		});
	}
}
```

### UGLY — evitar

```ts
export async function createBacklog(userId: string, dto: RegisterBacklogDto) {
	let backlogEntry: Backlog;
	try {
		backlogEntry = await Backlog.create({ ...dto, userId });
	} catch (error) {
		rethrowSequelizeError(error, { unique: ..., validation: ... });
	}
	await backlogEntry.reload({ include: backlogInclude }); // ← fuera del try
	return backlogEntry;                                     // ← fuera del try
}
```

La versión sucia obliga a declarar `let` afuera, depende de que TS entienda el `: never`, y deja al lector adivinando si el código posterior puede correr tras un error. La versión limpia es lineal y no necesita explicación.

### Aplica también dentro de `sequelize.transaction(...)`

Si el callback de la transacción tiene un try/catch con `rethrowSequelizeError`, el try debe envolver toda la sección crítica (creates + updates + queries finales), no solo una llamada aislada.

## Ejemplos concretos

### Service lanza ServiceError

```ts
// games/errors/games.service-error.ts
import { ServiceError } from "../../common/errors/service-error";
const BASE_OPTIONS = { service: "Games Service" };

export function notFoundError() {
	return new ServiceError("GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
```

```ts
// games/games.service.ts
import * as gamesServiceError from "./errors/games.service-error";

export async function findGameById(id: string) {
	const game = await Game.findByPk(id);
	if (!game) throw gamesServiceError.notFoundError();
	return game;
}
```

### Controller lanza DomainError

```ts
// games/errors/games.domain-error.ts
export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		"Game Module",
		"GAME_NOT_FOUND",
		"Game not found",
		context
	);
}
```

```ts
// games/games.controller.ts
import * as gameDomainError from "./errors/games.domain-error";

const game = await gameService.findGameByCode(code);
if (!game) throw gameDomainError.gameNotFound();
```

### Mapper service-to-domain

```ts
// games/errors/games.service-to-domain.mapper.ts
export function gamesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;
	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_NOT_FOUND")
		return gameDomainError.gameNotFound(context);
	if (error.code === "GAME_UNIQUE_CONSTRAINT")
		return gameDomainError.gameUniqueConstraint(context);
	// ...
	return gameDomainError.gameInternalError(context);
}
```

### Mapper domain-to-http (status codes)

```ts
// games/errors/games.domain-to-http.mapper.ts
export function gamesDomainToHttpMapper(error: DomainError, request: Request): HttpError {
    const baseOptions = { type: error.code, title: error.message, instance: request.originalUrl, ... };

    if (error.code === "GAME_NOT_FOUND") return new HttpError({ ...baseOptions, status: 404 });
    if (error.code === "GAME_UNIQUE_CONSTRAINT") return new HttpError({ ...baseOptions, status: 409 });
    if (error.code === "GAME_VALIDATION_ERROR") return new HttpError({ ...baseOptions, status: 400 });
    if (error.code === "GAME_FORBIDDEN") return new HttpError({ ...baseOptions, status: 403 });
    // ...
    return new HttpError({ ...baseOptions, status: 500 });
}
```

### Normalizer del módulo (entry desde el global)

```ts
// games/errors/games.error-domain.normalizer.ts
export function gamesErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;
	if (error instanceof ServiceError)
		return gamesServiceToDomainMapper(error, correlationId);

	return new DomainError(
		"COMMON",
		"INTERNAL_ERROR",
		"Unexpected internal error",
		{
			raw: error,
			correlationId
		}
	);
}
```

## Registro global

Cuando agregas un módulo nuevo, hay que registrarlo en dos lugares:

### `src/common/errors/global-error-domain.normalizer.ts`

```ts
if (error.serviceError.service === "Games Service")
	return gamesErrorDomainNormalizer(error, correlationId);
```

### `src/common/errors/global-error-http.normalizer.ts`

```ts
if (error.module === "Game Module")
	return gamesDomainToHttpMapper(error, request);
```

Si te saltas este paso, los errores del módulo caerán al fallback genérico (`status: 500`, `INTERNAL_ERROR`) y perderás el status code y el mensaje correcto.

## Response al cliente

`errorHandlerMiddleware` responde así:

```json
{
    "correlationId": "abc-123",
    "type": "GAME_NOT_FOUND",
    "title": "Game not found",
    "status": 404,
    "detail": "...",
    "instance": "/games/super-mario-bros",
    "timestamp": "2026-06-10T12:34:56.789Z",
    "context": { ... }
}
```

El campo `context` solo se incluye fuera de `NODE_ENV=prd` para no filtrar detalles internos en producción.

## Cómo agregar un error nuevo

1. Decide si es **técnico/de servicio** (lo lanza un service) o **de dominio** (lo lanza un controller). Normalmente vas a necesitar ambos.
2. Agrega el constructor en `<modulo>.service-error.ts` (si aplica) y en `<modulo>.domain-error.ts`.
3. Mapea el código en `<modulo>.service-to-domain.mapper.ts`.
4. Mapea el status HTTP en `<modulo>.domain-to-http.mapper.ts`.
5. (No tocas el global si el módulo ya está registrado.)
