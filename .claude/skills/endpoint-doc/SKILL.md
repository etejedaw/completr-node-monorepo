---
name: endpoint-doc
description: Update the Bruno API documentation in docs/api/ whenever an HTTP endpoint is created, modified, or removed. Trigger on changes to *.routes.ts, *.controller.ts, *.schema.ts, *.error.ts or *.error-mapper.ts files that affect the HTTP surface (method, path, body/query/params, response shape, status codes, domain errors). Uses Bruno v3.1+ YAML format (.yml, not .bru).
---

# Endpoint Doc

Documentación de endpoints HTTP en `docs/api/` siguiendo el formato de **Bruno v3.1+** (YAML, no `.bru`).

## Cuándo aplicar

Cada vez que se **crea, modifica o elimina** un endpoint, hay que actualizar su documentación. Concretamente, la skill se activa cuando se tocan archivos que afectan la superficie HTTP de un módulo:

- `*.routes.ts` — alta/baja de endpoints o cambio de método/path
- `*.controller.ts` — cambio en request/response shape, status codes, query/path params
- `*.schema.ts` — cambio en el contrato de validación (body, query, params)
- `*.error-mapper.ts` o `*.error.ts` — nuevo error de dominio o cambio de status HTTP

Si el cambio no toca ninguno de estos puntos (refactor interno, rename de variables privadas, etc.), no hace falta tocar `docs/api/`.

## Estructura de la colección

```
docs/api/
  opencollection.yml        # config raíz de la colección (no tocar)
  Login.yml                 # endpoints sueltos a nivel raíz
  environments/
    Develop.yml             # vars de entorno (BASE_URL, etc.)
  <module>/
    folder.yml              # config del folder (auth bearer heredado)
    <Endpoint Name>.yml     # un archivo por endpoint
```

- **Nombre del archivo**: Title Case con espacios, sin guiones. Ej: `Create Event.yml`, `Get Public Event.yml`, `Reset Stands.yml`.
- **Nombre de la carpeta**: lowercase, espacios permitidos. Ej: `event vendors/`, `stands/`, `auth/`.
- **`folder.yml`**: define `info.name` (Title Case del módulo), `info.seq` (orden en la UI) y, si todos los endpoints requieren auth admin, `request.auth: { type: bearer, token: "{{TOKEN}}" }`. Los endpoints públicos del módulo deben sobrescribir con `auth: none` en su archivo.

## Schema YAML del endpoint

Indentación: **4 espacios** (lo que Bruno genera; respetar). No usar tabs.

````yaml
info:
    name: <Endpoint Name> # mismo string que el filename sin .yml
    type: http
    seq: <n> # orden dentro del folder, empezando en 1

http:
    method: <GET|POST|PATCH|PUT|DELETE>
    url: http://{{BASE_URL}}<path> # path con vars Bruno: {{EVENT_ID}}, {{USER_ID}}, etc.
    body: # solo si tiene body
        type: json
        data: |-
            {
              "field": "value"
            }
    auth: <inherit|none> # inherit = hereda del folder (bearer); none = público

runtime: # opcional, solo si necesita scripts
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

    **Auth:** <Bearer token | public | token via query string (no Bearer token)>

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

    <Notas adicionales sobre el contrato si las hay.>

    ## Response <status>
    ```json
    { "data": { ... } }
    ```

    <Notas sobre transiciones de estado o efectos secundarios si los hay.>

    ## Errors
    - `<status> <ERROR_CODE>` — descripción breve de cuándo se dispara
````

### Reglas del bloque `docs`

- Markdown dentro del block scalar `|-` (preserva newlines, sin newline final).
- Encabezado H1 con el mismo nombre que `info.name`.
- Secciones con H2: `Path params`, `Query`, `Request body`, `Response <status>`, `Errors`. Solo incluir las que aplican.
- **`Auth:`** siempre presente. Valores comunes:
    - `Bearer token` — endpoints admin (folder con auth heredada)
    - `public` — sin autenticación
    - `token via query string (no Bearer token)` — endpoints que validan vía `?token=<uuid>` (vendor approval flow)
- En **Errors** listar todos los códigos de dominio que el `error-mapper` puede emitir + `401 UNAUTHORIZED` y `422 SCHEMA_VALIDATION_ERROR` cuando apliquen. Formato exacto: `` `<status> <CODE>` — descripción ``.

## Variables Bruno disponibles

Definidas en `environments/Develop.yml` o seteadas runtime por scripts. Usar las existentes antes de inventar nuevas.

- `{{BASE_URL}}` — host + puerto del backend
- `{{TOKEN}}` — JWT del admin logueado (lo setea `Login.yml` en `after-response`)
- `{{USER_ID}}` — id del admin user
- `{{EVENT_ID}}`, `{{EVENT_SLUG}}` — evento bajo prueba
- `{{VENDOR_ID}}` — vendor admin
- `{{VENDOR_TOKEN}}` — token de aprobación del vendor (flow público)
- `{{STAND_ID}}` — stand individual

Para datos sensibles en bodies de auth (`Login.yml`), usar `{{process.env.EMAIL}}` / `{{process.env.PASSWORD}}` desde el `.env` local de Bruno.

## Mapeo de cambios en código → archivo a tocar

| Cambio                                | Archivo doc                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| Endpoint nuevo                        | Crear `docs/api/<module>/<Endpoint Name>.yml` con `seq` siguiente    |
| Cambio de método/path                 | Actualizar `http.method` y `http.url`                                |
| Cambio en schema de body/query/params | Actualizar `http.body.data` (sample) + bloque `docs` correspondiente |
| Cambio en response shape o status     | Actualizar bloque `## Response <status>`                             |
| Nuevo error de dominio                | Agregar línea en `## Errors` del/los endpoints afectados             |
| Endpoint eliminado                    | Borrar el `.yml` y reordenar `seq` de los hermanos si es necesario   |
| Módulo nuevo                          | Crear carpeta + `folder.yml` con `seq` siguiente del nivel raíz      |

## Convenciones de contenido

- **Sample bodies realistas**: usar valores plausibles (`"Akiba Fest 2026"`, fechas reales en `YYYY-MM-DD`, etc.), no `"string"` ni `"foo"`.
- **`<uuid>`** como placeholder en responses para campos generados por el server.
- **PATCH** se usa para updates parciales (todos los campos del body son opcionales). Mencionarlo en la descripción.
- **Soft deletes** se documentan como `204 No Content` con nota explicando que se preserva el record (`isActive = false`).
- Respetar el inglés en `docs:` (es lo que ya hay; no mezclar con español).

## Antes de cerrar el cambio

1. Verificar que el `seq` no choque con otro endpoint del mismo folder.
2. Verificar que todos los errores listados en `## Errors` existen en el `error-mapper` correspondiente del módulo.
3. Verificar que las path/query vars del bloque `docs` matchean exactamente las del schema Zod.
4. Si se agregó un endpoint público que valida por token query string, dejar `auth: none` en el `.yml` (no heredar del folder).
