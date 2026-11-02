# Resumen IA del Rewind atado a los datos de cada juego

**Released:** 2026-10-29

## Summary

Con el prompt basado en patrones, el reto para el año siguiente seguía describiendo juegos con datos que no estaban en la entrada. Por ejemplo, llamaba "RPG largo" a Metal Gear Solid 2, que figura como Action y dura 13 horas, y cerraba con un "cuéntanos" al que nadie puede responder. El prompt ahora exige describir cada juego solo con los géneros, la plataforma, las horas y el estado de su fila, y llamar largo o corto a un juego según los tramos de `byLength`. El reto se basa en un grupo de `patterns` en lugar de nombrar un juego.

## Changed

- Reglas nuevas en `rewind-recap.prompt.ts`:
    - nada de géneros ni rasgos sacados del conocimiento propio del modelo;
    - largo y corto solo según las horas;
    - sin pedirle al jugador que cuente o responda;
    - los nombres de grupo (tramos, trimestres) se dicen en el idioma de salida y sin comillas;
    - en español, imperativos con pronombre bien escritos ("proponte").
- `nextYearChallenge` se apoya en un grupo de `patterns` con su nombre y no nombra un juego concreto.
- El objetivo del prompt para el cuerpo de cada insight baja de 220 a 200 caracteres. El tope de zod sigue en 300.

## Commits

- `81b3d215` — fix(rewind-recap): describe games only from their rows and base the challenge on a pattern group
