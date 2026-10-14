# Puertos de desarrollo y worktrees

**Released:** 2026-10-14

## Summary

Ajustes del entorno de desarrollo. Los puertos de las bases de datos de desarrollo y de pruebas y de pgAdmin del `docker-compose.yml` pasan a ser configurables, y el repo ignora los worktrees locales en git y en ESLint.

## Changed

- `apps/api/docker-compose.yml`: puertos por variable de entorno (`PG_PORT`, `PG_TEST_PORT`, `PGADMIN_PORT`), con los valores anteriores por defecto (5432, 5433 y 80), y `restart: unless-stopped` en vez de `always`.
- `README.md` explica las variables y corrige el puerto por defecto de pgAdmin (80, no 8080).
- `.gitignore` y `eslint.config.mjs` ignoran `.worktree/`.

## Commits

- `d9f7b85c` — build(api): make dev database and pgadmin ports configurable
- `c1ca0387` — docs(repo): fix default pgadmin port in readme
- `6c1161f8` — chore: ignore local git worktrees directory
- `a9333180` — chore(repo): ignore git worktrees in eslint
