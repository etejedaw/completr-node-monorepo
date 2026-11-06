# Sistema de errores

3 capas. Cada capa tiene un propósito y un dueño claro.

```
ServiceError → DomainError → HttpError
   (service)    (controller)    (error handler middleware)
```

## Las 3 clases base

Viven en `apps/api/src/common/errors/`.

| Clase          | Qué expresa                                                                                                                                                                             | Quién la lanza o construye                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ServiceError` | Fallo técnico o de negocio detectado en la capa de aplicación o en un provider (DB, constraint, no encontrado, timeout, rate limit). Lleva el `service` que la originó y el error crudo | `services` y `providers`                                                             |
| `DomainError`  | Regla de negocio violada, en términos del dominio. Lleva el `module` y el `correlationId` en su `context`                                                                               | `controllers`, y los normalizers de cada módulo al convertir un `ServiceError`       |
| `HttpError`    | Respuesta en formato Problem Details (RFC 7807) con su status                                                                                                                           | Los `domain-to-http.mapper.ts` de cada módulo; la serializa `errorHandlerMiddleware` |

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

`rethrowSequelizeError(error, mappers)` vive en `apps/api/src/common/errors/sequelize-error.mapper.ts` y mapea `UniqueConstraintError` / `ValidationError` / `ForeignKeyConstraintError` de Sequelize a `ServiceError`s del módulo (claves `unique`, `validation` y `foreignKey`). Un borrado que puede quedar bloqueado por una FK se envuelve en `rethrowSequelizeError` con `foreignKey` mapeado a `<MODULO>_IN_USE` (409). Está tipado como `: never`, por lo que cualquier ruta que pase por el catch lanza.

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

### Fallback para `ForeignKeyConstraintError` sin mapear

`globalErrorDomainNormalizer` convierte un `ForeignKeyConstraintError` que ningún módulo mapeó en un `DomainError` de `Common Module` (constructores en `apps/api/src/common/errors/common.domain-error.ts`):

| Caso                                                   | Código                       | Status |
| ------------------------------------------------------ | ---------------------------- | ------ |
| Borrar o actualizar un padre que todavía tiene hijos   | `COMMON_RESOURCE_IN_USE`     | 409    |
| Insertar o actualizar un hijo con un padre inexistente | `COMMON_REFERENCE_NOT_FOUND` | 422    |

El fallback es una red de seguridad: un borrado que puede quedar bloqueado por una FK se sigue mapeando en su módulo con `foreignKey` a `<MODULO>_IN_USE`.

### Errores al leer el body

`express.json()` corre antes que cualquier ruta, así que sus errores llegan directo a `errorHandlerMiddleware` sin pasar por ningún módulo. `globalErrorDomainNormalizer` los reconoce por su `type` (`body-parser-error.mapper.ts`) y los convierte en un `DomainError` de `Common Module`, en todas las rutas y antes de la autenticación:

| `type` de body-parser | Código                     | Status |
| --------------------- | -------------------------- | ------ |
| `entity.parse.failed` | `COMMON_INVALID_JSON`      | 400    |
| `entity.too.large`    | `COMMON_PAYLOAD_TOO_LARGE` | 413    |

Cualquier otro error sin mapear sigue siendo `INTERNAL_ERROR` (500). Un body bien formado que no cumple el schema de la ruta sigue respondiendo 422 `COMMON_SCHEMA_INVALID`.

## Ejemplo completo

`apps/api/src/games/errors/` tiene los cinco archivos de un módulo, y su registro está en los dos normalizers globales de `common/errors/`. Un módulo nuevo copia esa forma. Si te saltas el registro global, los errores del módulo caen al fallback genérico (500, `INTERNAL_ERROR`) y se pierden el status y el mensaje.

## Response al cliente

`errorHandlerMiddleware` responde con `correlationId`, `type` (el código), `title`, `status`, `detail`, `instance`, `timestamp` y `context`.

El campo `context` solo se incluye fuera de `NODE_ENV=prod` para no filtrar detalles internos en producción.

## Cómo agregar un error nuevo

1. Decide si es **técnico/de servicio** (lo lanza un service) o **de dominio** (lo lanza un controller). Normalmente vas a necesitar ambos.
2. Agrega el constructor en `<modulo>.service-error.ts` (si aplica) y en `<modulo>.domain-error.ts`.
3. Mapea el código en `<modulo>.service-to-domain.mapper.ts`.
4. Mapea el status HTTP en `<modulo>.domain-to-http.mapper.ts`.
5. (No tocas el global si el módulo ya está registrado.)
