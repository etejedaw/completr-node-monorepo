# Pósters del hero del feed

**Released:** 2026-10-23

## Summary

El mosaico del hero del feed solo leía `activity.game`, que la API completa únicamente en las actividades co-op, donde el `target` es un usuario. En el resto de las actividades el juego viene en `target`, así que el mosaico repetía el único juego co-op de la página. Ahora toma el juego de `game` o, si no hay, de `target` cuando es un juego.

## Fixed

- El hero del feed muestra los distintos juegos de las actividades de la página, sin repetir, en lugar de un solo juego.

## Changed

- `gamePosters` sale de `feed-page.ts` a `feed-hero-posters.ts`, con su propio spec.

## Files of interest

- `apps/web/src/app/features/feed/feed-hero-posters.ts`

## Commits

- `f2a3c636` — fix(web): build the feed hero posters from game targets of every activity
