# Sistema de errores

3 capas. Cada capa tiene un propósito y un dueño claro.

```
ServiceError → DomainError → HttpError
   (service)    (controller)    (error handler middleware)
```

## Las 3 clases base

Viven en `apps/api/src/common/errors/`.

| Clase          | Qué expresa                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ServiceError` | Fallo técnico o de negocio detectado en la capa de aplicación o en un provider (DB, constraint, no encontrado, timeout, rate limit). Lleva el `service` que la originó y el error crudo |
| `DomainError`  | Regla de negocio violada, en términos del dominio. Lleva el `module` y el `correlationId` en su `context`                                                                               |
| `HttpError`    | Respuesta en formato Problem Details (RFC 7807) con su status. La construyen los `domain-to-http.mapper.ts` de cada módulo y la serializa `errorHandlerMiddleware`                      |

Quién lanza cada una está en las [reglas duras](#reglas-duras).

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
5. **Los códigos de error siguen el patrón `<MODULO>_<CAUSA>`** en `SCREAMING_SNAKE_CASE` (`ORDER_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`, `PAYMENTS_RATE_LIMITED`).
6. **El `correlationId` se propaga en el `context`** para trazabilidad en logs.
7. **Cuando uses `rethrowSequelizeError`, todo el cuerpo crítico (incluido el `return`) va dentro del `try`.** La función está tipada `: never`, así que el código tras el catch solo correría en path feliz — declarar variables `let` afuera para llenarlas adentro y consumirlas después es confuso y propenso a bugs. Ver "Patrón `rethrowSequelizeError`" más abajo.

## Patrón `rethrowSequelizeError`

`rethrowSequelizeError(error, mappers)` vive en `apps/api/src/common/errors/sequelize-error.mapper.ts` y mapea `UniqueConstraintError` / `ValidationError` / `ForeignKeyConstraintError` de Sequelize a `ServiceError`s del módulo (claves `unique`, `validation` y `foreignKey`). Un borrado que puede quedar bloqueado por una FK se envuelve en `rethrowSequelizeError` con `foreignKey` mapeado a `<MODULO>_IN_USE` (409). Está tipado como `: never`, por lo que cualquier ruta que pase por el catch lanza.

### CLEAN — todo dentro del try, return desde adentro

```ts
export async function createOrder(userId: string, dto: RegisterOrderDto) {
	try {
		const order = await Order.create({ ...dto, userId });
		await order.reload({ include: orderInclude });
		return order;
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: ordersServiceError.uniqueConstraintError,
			validation: ordersServiceError.validationError
		});
	}
}
```

### UGLY — evitar

```ts
export async function createOrder(userId: string, dto: RegisterOrderDto) {
	let order: Order;
	try {
		order = await Order.create({ ...dto, userId });
	} catch (error) {
		rethrowSequelizeError(error, { unique: ..., validation: ... });
	}
	await order.reload({ include: orderInclude }); // ← fuera del try
	return order;                                     // ← fuera del try
}
```

La versión sucia obliga a declarar `let` afuera, depende de que TS entienda el `: never`, y deja al lector adivinando si el código posterior puede correr tras un error. La versión limpia es lineal y no necesita explicación.

### Aplica también dentro de `sequelize.transaction(...)`

Si el callback de la transacción tiene un try/catch con `rethrowSequelizeError`, el try debe envolver toda la sección crítica (creates + updates + queries finales), no solo una llamada aislada.

### Errores que no pasan por ningún módulo

- **Un `ForeignKeyConstraintError` que ningún módulo mapeó** lo convierte `globalErrorDomainNormalizer` en un `DomainError` de `Common Module`. Es solo una red de seguridad: el mapeo correcto es el del módulo, con [`rethrowSequelizeError`](#patrón-rethrowsequelizeerror).
- **Los errores de `express.json()`** (JSON inválido, cuerpo demasiado grande) llegan a `errorHandlerMiddleware` antes de cualquier ruta y de la autenticación, así que también los resuelve el normalizer global como errores de `Common Module`.
- Cualquier otro error sin mapear responde `INTERNAL_ERROR` (500).

## Ejemplo completo

Cualquier módulo existente tiene los cinco archivos de `errors/`, y su registro está en los dos normalizers globales de `common/errors/`. Un módulo nuevo copia esa forma. Si te saltas el registro global, los errores del módulo caen al fallback genérico (500, `INTERNAL_ERROR`) y se pierden el status y el mensaje.

## Response al cliente

`errorHandlerMiddleware` responde con `correlationId`, `type` (el código), `title`, `status`, `detail`, `instance`, `timestamp` y `context`.

El campo `context` solo se incluye fuera de `NODE_ENV=prod` para no filtrar detalles internos en producción.

## Cómo agregar un error nuevo

1. Decide si es **técnico/de servicio** (lo lanza un service) o **de dominio** (lo lanza un controller). Normalmente vas a necesitar ambos.
2. Agrega el constructor en `<modulo>.service-error.ts` (si aplica) y en `<modulo>.domain-error.ts`.
3. Mapea el código en `<modulo>.service-to-domain.mapper.ts`.
4. Mapea el status HTTP en `<modulo>.domain-to-http.mapper.ts`.
5. (No tocas el global si el módulo ya está registrado.)
