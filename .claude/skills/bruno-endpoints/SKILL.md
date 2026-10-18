---
name: bruno-endpoints
description: Keep the Bruno API collection (default docs/api/, OpenCollection YAML format with .yml files, not .bru) in sync whenever an HTTP endpoint is created, modified or removed. Trigger on changes to routes, controllers, request validation schemas or DTOs, and domain error mappings that affect the HTTP surface (method, path, body/query/params, response shape, status codes, errors) in Express, Hono, NestJS or similar backends.
license: Apache-2.0. Complete terms in LICENSE
---

# Bruno Endpoints

Documentación de endpoints HTTP en una colección de Bruno con formato **OpenCollection** (YAML, archivos `.yml`, no `.bru`).

## Configuración del proyecto

| Ajuste                  | Dónde mirarlo                                                                    | Por defecto |
| ----------------------- | -------------------------------------------------------------------------------- | ----------- |
| Carpeta de la colección | La carpeta que contiene `opencollection.yml` (búscala excluyendo `node_modules`) | `docs/api/` |

Lo que defina el `CLAUDE.md` del proyecto manda sobre estos valores. Si la colección ya tiene endpoints, **son la referencia de estilo**: copia su indentación, la forma de armar `http.url`, los campos de `settings` y el idioma y la estructura del bloque `docs`, sin mezclar idiomas. Si la colección está vacía, usa 4 espacios y el idioma del resto de `docs/`. Bruno reescribe los archivos al guardarlos desde la app, así que lo que ya hay es lo que Bruno espera.

Si el proyecto no tiene colección, pregúntale al usuario antes de crear una.

## Cuándo aplicar

Cada vez que se **crea, modifica o elimina** un endpoint, hay que actualizar su documentación. La skill se activa cuando se tocan archivos que afectan la superficie HTTP:

| Qué cambia                                     | Express                                                    | Hono                                           | NestJS                                                        |
| ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Alta/baja de endpoints o cambio de método/path | `router.get(...)`, `app.post(...)`, archivos `*.routes.ts` | `app.get(...)`, `app.route(...)`, `new Hono()` | `@Controller()`, `@Get()`, `@Post()`, etc.                    |
| Request/response shape, status codes, params   | Controllers y handlers                                     | Handlers                                       | Métodos del controller, `@HttpCode()`, `@Param()`, `@Query()` |
| Contrato de validación (body, query, params)   | Schemas Zod/Joi                                            | Schemas de `zValidator` u otro validador       | DTOs con `class-validator`                                    |
| Errores de dominio y su status HTTP            | Error mappers, middleware de errores                       | `app.onError`, `HTTPException`                 | Exception filters, excepciones de dominio                     |

Si el cambio no toca ninguno de estos puntos (refactor interno, rename de variables privadas, etc.), no hace falta tocar la colección.

## Estructura de la colección

```
<colección>/
  opencollection.yml        # config raíz de la colección (no tocar)
  Login.yml                 # endpoints sueltos a nivel raíz
  environments/
    Develop.yml             # variables de entorno (BASE_URL, etc.)
  <module>/
    folder.yml              # config del folder (auth heredada)
    <Endpoint Name>.yml     # un archivo por endpoint
```

- **Nombre del archivo**: Title Case con espacios, sin guiones. Ej: `Create User.yml`, `Get Public Event.yml`.
- **Nombre de la carpeta**: lowercase, espacios permitidos. Ej: `users/`, `event vendors/`.
- **`folder.yml`**: define `info.name` (Title Case del módulo), `info.type: folder`, `info.seq` (orden en la UI) y, si todos los endpoints requieren autenticación, `request.auth: { type: bearer, token: "{{TOKEN}}" }`. Los endpoints públicos del módulo sobrescriben con `auth: none` en su archivo.

## Schema YAML del endpoint

````yaml
info:
    name: <Endpoint Name>
    type: http
    seq: <n>

http:
    method: <GET|POST|PATCH|PUT|DELETE>
    url: "{{BASE_URL}}<path>"
    body:
        type: json
        data: |-
            {
              "field": "value"
            }
    auth: <inherit|none>

runtime:
    scripts:
        - type: after-response
          code: bru.setVar("TOKEN", res.body.data.access_token)

settings:
    encodeUrl: true
    timeout: 0
    followRedirects: true
    maxRedirects: 5

docs: |-
    # <Endpoint Name>

    <Descripción funcional en 1-3 líneas. Qué hace y cuándo se usa.>

    **Auth:** <Bearer token | public | ...>

    ## Path params
    - `paramName` (tipo) — descripción

    ## Query
    - `paramName` (tipo) — descripción

    ## Request body
    ```json
    {
      "field": "value"
    }
    ```

    <Notas sobre el contrato si las hay.>

    ## Response <status>
    ```json
    { "id": "<uuid>" }
    ```

    <Notas sobre efectos secundarios si los hay.>

    ## Errors
    - `<status> <ERROR_CODE>` — cuándo se dispara
````

- `info.name`: el mismo string que el filename sin `.yml`.
- `info.seq`: orden dentro del folder, empezando en 1.
- `http.url`: path con variables de Bruno (`{{USER_ID}}`, `{{EVENT_ID}}`). Arma la URL igual que los demás endpoints de la colección (con o sin protocolo, con o sin prefijo de versión).
- `http.body`: solo si el endpoint recibe body.
- `http.auth`: `inherit` hereda del folder.
- `runtime`: opcional, solo si el endpoint necesita scripts (por ejemplo, guardar el token del login).

### Reglas del bloque `docs`

- Markdown dentro del block scalar `|-` (preserva newlines, sin newline final).
- Encabezado H1 con el mismo nombre que `info.name`.
- Secciones con H2: `Path params`, `Query`, `Request body`, `Response <status>`, `Errors`. Solo incluir las que aplican.
- **`Auth:`** siempre presente: `Bearer token` (con el permiso requerido si el proyecto usa permisos), `public`, o el mecanismo que corresponda (ej: `token via query string`).
- En **Errors** listar todos los errores que el endpoint puede emitir: los de dominio, los de autenticación/autorización y el de validación del body si aplica, con los códigos exactos que usa el proyecto. Formato: `` `<status> <CODE>` — descripción ``.

## Variables

Usa las variables que ya existen en `environments/*.yml` o que setean los scripts antes de inventar nuevas. Si necesitas una nueva (por ejemplo, el id de un recurso nuevo), agrégala a cada archivo de `environments/` con su `description`.

Para datos sensibles en bodies de autenticación, usa `{{process.env.EMAIL}}` / `{{process.env.PASSWORD}}` desde el `.env` local de Bruno en vez de valores reales.

## Mapeo de cambios en código → archivo a tocar

| Cambio                                | Archivo doc                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| Endpoint nuevo                        | Crear `<module>/<Endpoint Name>.yml` con el `seq` siguiente           |
| Cambio de método/path                 | Actualizar `http.method` y `http.url`                                 |
| Cambio en schema de body/query/params | Actualizar `http.body.data` (sample) + bloque `docs` correspondiente  |
| Cambio en response shape o status     | Actualizar el bloque `## Response <status>`                           |
| Nuevo error de dominio                | Agregar línea en `## Errors` de los endpoints afectados               |
| Endpoint eliminado                    | Borrar el `.yml` y reordenar el `seq` de los hermanos si es necesario |
| Módulo nuevo                          | Crear carpeta + `folder.yml` con el `seq` siguiente del nivel raíz    |

## Convenciones de contenido

- **Sample bodies realistas**: valores plausibles para el dominio del proyecto, fechas reales en `YYYY-MM-DD`. Nada de `"string"` ni `"foo"`.
- **`<uuid>`** como placeholder en responses para los ids que genera el servidor.
- **PATCH** para updates parciales (todos los campos del body son opcionales). Mencionarlo en la descripción.
- **Soft deletes**: documentar el status que devuelve el endpoint y una nota explicando que el registro se preserva.

## Antes de cerrar el cambio

1. El `seq` no choca con otro endpoint del mismo folder.
2. Todos los errores listados en `## Errors` existen en el código del módulo (error mapper, excepciones o filtros).
3. Las path/query vars y los campos del body coinciden exactamente con el schema o DTO de validación.
4. Un endpoint público dentro de un folder con auth tiene `auth: none` en su `.yml`.
