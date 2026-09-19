# Landing en el monorepo

**Released:** 2026-09-18

## Summary

La landing (`www.completr.app`) vivía en un repositorio aparte, con su propio lockfile, su propia configuración de ESLint y Prettier y versiones de dependencias distintas a las del resto del producto. Se suma al monorepo como `apps/landing`, con el mismo esquema que `apps/api` y `apps/web`: workspace de npm, tooling de la raíz, Dockerfile con el contexto de build en la raíz y su propio `captain-definition-landing`. Se conserva su historial completo bajo `apps/landing`.

## Highlights

- `npm run dev:landing` y `npm run build:landing` desde la raíz.
- La landing usa la misma configuración de ESLint 10 y Prettier que las otras apps, extendida con `eslint-plugin-astro` y `prettier-plugin-astro`.
- La landing pasa a AGPL-3.0, la licencia del resto del repo.
- `docs/context/landing.md` documenta su stack, el changelog público, las variables de build y la CSP.

## Added

- `apps/landing`: sitio Astro 7 estático con su historial.
- `captain-definition-landing`, que apunta a `apps/landing/Dockerfile`.
- Scripts de la raíz `dev:landing` y `build:landing`. `typecheck` corre también `astro check` de la landing.
- `eslint-plugin-astro`, `prettier-plugin-astro` y `@astrojs/compiler` en la raíz.
- `docs/context/landing.md`.

## Changed

- `eslint.config.mjs`: las reglas comunes (`strict`, `stylistic`, `simple-import-sort`, `consistent-type-imports`) también aplican a los `.astro`, y se suma `eslintPluginAstro.configs.recommended`. Se reordenan los imports de la landing.
- `.prettierrc` carga `prettier-plugin-astro` con el parser `astro` para `*.astro`. `lint-staged` incluye `.astro`.
- `.gitignore`, `.prettierignore`, `.dockerignore` y ESLint ignoran `.astro/`.
- Paquete renombrado a `@completr/landing`, `private`, sin `version` propia. Pierde `lint`, `format`, `prepare`, `lint-staged` y `allowScripts`; `check` pasa a llamarse `typecheck`.
- ESLint, Prettier, Husky, lint-staged, TypeScript y `typescript-eslint` dejan de declararse en la landing y usan las versiones de la raíz. Prettier sube a 3.9.8 y lint-staged a 17.5 para todo el repo.
- `apps/web` declara Tailwind 4.3.3, igual que la landing.
- Dockerfile reescrito para el contexto de build en la raíz, con `npm ci -w apps/landing`. Conserva el `ARG PUBLIC_CONTACT_ENDPOINT`.
- `README.md`, `docs/README.md`, `docs/architecture.md`, `CLAUDE.md` y las skills `commit` y `changelog` incluyen la landing. La skill `commit` suma el scope `landing`.

## Removed

- `.prettierrc`, `.prettierignore`, `.nvmrc`, `.husky`, `.gitignore`, `.dockerignore`, `LICENSE`, `README.md`, `eslint.config.js`, `package-lock.json` y la skill `commit` de la landing: los reemplazan los de la raíz.

## Migration

- **Deploy:** la app de la landing debe apuntar a `./captain-definition-landing` y al repositorio unificado. `PUBLIC_CONTACT_ENDPOINT` se sigue pasando como build arg. Desde ahora, cada push a `main` reconstruye las tres apps.
- **Comandos:** `npm run dev:landing` levanta el sitio en `http://localhost:4321`. Otros scripts: `npm run <script> -w apps/landing`.
- **Dependencias:** `cookie` queda declarado en `apps/landing` para que el prerender de Astro no resuelva el `cookie@0.x` de la API. Ver `docs/context/landing.md`.
- **Licencia:** el código de la landing pasa de GPL-3.0 a AGPL-3.0.

## Files of interest

- `apps/landing/package.json` — scripts y dependencias de la landing.
- `eslint.config.mjs`, `.prettierrc` — soporte de `.astro`.
- `apps/landing/Dockerfile`, `captain-definition-landing` — build de producción.
- `docs/context/landing.md` — arquitectura de la landing.

## Commits

- `b7e64d6a` — chore(repo): import landing history into apps/landing
- `30f1749c` — chore(repo): consolidate landing config into root
- `d22944d6` — build(repo): add landing workspace
- `2affb576` — build(landing): adapt scripts to workspace layout
- `a7b30dfe` — build(repo): extend eslint and prettier config to landing
- `10146445` — style(landing): apply shared eslint rules
- `4f3a3097` — build(landing): adapt dockerfile and captain definition to monorepo
- `43f541a7` — docs(repo): add landing to claude context
- `abf17d05` — docs(skills): add landing scope to commit and changelog skills
- `f9d118c2` — docs(landing): document landing app and repo structure
