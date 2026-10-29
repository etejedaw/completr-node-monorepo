# Regla contra tests intermitentes

**Released:** 2026-10-29

## Summary

`docs/architecture.md` suma a sus decisiones clave que no se aceptan tests intermitentes. Un test que falla en una corrida y pasa en otra se trata como un bug, del código o del test: se busca la causa y se corrige, en vez de darlo por bueno porque pasa al repetirlo, aislado o en otra máquina.

## Added

- Decisión clave en `docs/architecture.md` con las causas típicas que hay que revisar: estado compartido entre tests, timers vivos tras destruir un servicio, elementos que quedan en el DOM, dos registros con el mismo `createdAt` y orden sin desempate por id.
- Criterio de validación: un cambio que toque la suite se integra solo después de 3 corridas seguidas sin fallos.

## Files of interest

- `docs/architecture.md`

## Commits

- `09bd8eab` — docs: forbid flaky tests in the key decisions
