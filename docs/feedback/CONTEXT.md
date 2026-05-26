# CONTEXT — Carpeta `docs/feedback/`

> Como se documenta el feedback de usuarios y beta testers de Completr.

---

## Que vive aqui

Un archivo por fase (`fase-2.md`, `fase-3.md`, etc.) con todo el feedback recopilado durante esa fase del producto. Cada item es una entrada con ID estable (`FB-001`, `FB-002`, ...) que se referencia desde commits, PRs, TODO.md y otras partes del codigo cuando aplica.

El feedback NO se mueve entre fases cuando se posterga — se deja en su archivo original con estado `diferido`. Esto preserva la historia: en que momento se reporto, cuando se decidio postergarlo, y por que.

---

## Convencion de formato

### Header del archivo

```markdown
# Feedback de usuarios — Fase N (titulo de la fase)

> Feedback recopilado de amigos y beta testers usando la app en produccion (web.completr.app).
> Convenciones documentadas en `CONTEXT.md`.

---

## Feedback
```

### Header de entrada

```markdown
### [FB-XXX] Titulo corto y accionable
```

- `FB-XXX` es secuencial dentro de la fase, con 3 digitos (`FB-001`).
- El titulo describe el problema o la mejora — no la solucion. Mantener una linea.

### Campos de la entrada

Lista de bullets con campos en **negrita**, dos puntos y contenido. Solo `Estado` y `Descripcion` son obligatorios. El orden recomendado:

```markdown
- **Fecha:** YYYY-MM-DD
- **Severidad:** critico | alto | medio | bajo
- **Estado:** pendiente | resuelto | descartado | diferido
- **Descripcion:** Que pasa, como reproducirlo. Incluir la cita textual del reporte si la hay.
- **Contexto:** Info adicional util (verificacion contra APIs externas, comportamiento esperado vs actual, modulos involucrados). Omitir si no aporta.
- **Causa raiz:** / **Causa tecnica:** Donde esta el problema en el codigo. Solo cuando se diagnostico.
- **Solucion propuesta:** Que se planea hacer (cuando el estado es `pendiente` o `diferido`).
- **Solucion:** / **Resolucion:** Que se hizo (cuando el estado es `resuelto`).
- **Decision (YYYY-MM-DD):** Explicacion (cuando el estado es `descartado` o `diferido`).
- **Razon de descarte:** Resumen corto de por que no se va a hacer (alternativa a `Decision` para `descartado`).
```

### Campos opcionales

- `Fecha`: solo si se conoce la fecha exacta del reporte. Si no, omitir.
- `Severidad`: solo si se evaluo. Si no, omitir.
- `Causa raiz` / `Causa tecnica`: solo si se diagnostico el problema. No fabricar.
- `Contexto`: solo si aporta info que no cabe en `Descripcion`.

---

## Estados

| Estado     | Significado                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| pendiente  | Sin empezar. Va a entrar a esta fase o en la siguiente sin decision firme.   |
| resuelto   | Fix deployado. La entrada documenta que se hizo (`Solucion` o `Resolucion`). |
| descartado | No se va a implementar. Debe llevar `Razon de descarte` o `Decision`.        |
| diferido   | Postergado a una fase posterior. Debe llevar `Decision (YYYY-MM-DD)`.        |

**No hay "en progreso".** El trabajo en curso vive en TODO.md, plans, branches o tasks — no en los archivos de feedback.

---

## Severidades

| Severidad | Significado                               |
| --------- | ----------------------------------------- |
| critico   | Bloquea uso normal, hay que arreglarlo ya |
| alto      | Afecta experiencia pero se puede usar     |
| medio     | Molesto, no urgente                       |
| bajo      | Nice to fix, cosmetico o menor            |

---

## Reglas editoriales

- **Una entrada por reporte.** No mergear duplicados: multiples reportes del mismo problema desde distintos usuarios son senal, conviene preservarlos. Cuando varias entradas describen lo mismo, referenciarlas entre si en `Contexto`.
- **Inmutable una vez creado el ID.** No renumerar entradas para "compactar" — los IDs son referencias estables desde commits/PRs.
- **No borrar entradas.** Si un reporte resulta ser invalido, marcarlo como `descartado` con `Razon de descarte` explicando por que. Asi queda la historia.
- **Citar al reportar.** Si el reporte llego como mensaje, incluir la cita textual entre comillas dentro de `Descripcion`. Da contexto sobre como lo viven los usuarios.
- **Sin signo del reportador.** No incluir nombres, usernames ni handles del reportador. El feedback se trata como anonimo.
- **Marcar como resuelto cuando se hace, no preguntar.** Apenas el fix esta deployado, actualizar la entrada al instante.
- **Fechas absolutas siempre.** Nunca "ayer" o "la semana pasada". Formato `YYYY-MM-DD`.
- **Sin emojis ni adornos.** Texto plano, profesional, conciso.

---

## Ejemplo completo

```markdown
### [FB-042] Editor de listas pierde cambios al refrescar

- **Fecha:** 2026-05-12
- **Severidad:** alto
- **Estado:** resuelto
- **Descripcion:** "Le hice todos los cambios a mi lista y al recargar la pagina se borraron." Al editar el nombre y descripcion de una lista propia desde `/lists/:id`, los cambios se ven aplicados en pantalla pero al refrescar el navegador vuelven al estado anterior. El boton "Save" del editor no esta llamando al endpoint correcto.
- **Causa tecnica:** `list-edit.component.ts:84` invoca `listsService.updatePreview()` en vez de `listsService.update()`. El preview solo actualiza el state local del cliente.
- **Solucion:** Reemplazado `updatePreview` por `update` en el handler del submit. Agregado test e2e que crea una lista, la edita y refresca para garantizar persistencia. La diferencia entre los dos metodos quedo documentada en el doc-comment de cada uno.
```

```markdown
### [FB-043] Soporte para emojis en titulos de listas

- **Estado:** descartado
- **Descripcion:** Permitir usar emojis al nombrar listas (ej. "🎮 Mis favoritos").
- **Razon de descarte:** Postgres ya acepta emojis (UTF-8) y el frontend los renderiza. No hay accion pendiente — el comportamiento ya funciona, el reporte se origino de una confusion del usuario que probo con un caracter no-emoji.
```

```markdown
### [FB-044] Recomendaciones personalizadas en el feed

- **Estado:** diferido
- **Descripcion:** "Me gustaria que me sugiera juegos parecidos a los que ya jugue."
- **Decision (2026-05-19):** Diferido a Fase 6+. Necesita masa critica de usuarios y juegos co-completados para que el algoritmo (collaborative filtering o content-based) genere recomendaciones utiles. Hoy con menos de 100 usuarios activos cualquier recomendacion seria pobre.
- **Solucion propuesta:** Ver FB-008 (mismo tema, agrupar el trabajo cuando se aborde).
```
