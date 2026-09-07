# Cómo usé IA en este challenge

Este proyecto se desarrolló con **Claude** (Cowork) como asistente de programación, bajo las siguientes instrucciones explícitas que le di al empezar (transcriptas tal cual las configuré):

> Actuá como par de programación, no como quien resuelve todo por mí. Explicame el razonamiento de cada decisión técnica para poder defenderla si me preguntan en una entrevista.
>
> Priorizá el stack que ya domino (NestJS/PostgreSQL o React/TypeScript) salvo que el challenge pida explícitamente otra tecnología.
>
> Ayudame a mantener un registro breve de decisiones (qué elegí, por qué, qué alternativas descarté) para documentarlo en el README o en los commits, ya que la empresa evalúa explícitamente el uso de IA.
>
> Código limpio, comentado donde haga falta, con buenas prácticas (nombres claros, separación de responsabilidades, manejo de errores).

## Cómo se tradujo eso en el trabajo real

- **Decisiones de producto/arquitectura las tomé yo, explícitamente.** Antes de escribir una sola línea de código, Claude me preguntó (no asumió) cuatro decisiones concretas: React+Vite vs. Next.js, monorepo vs. repos separados, cantidad de estados del ciclo de vida, y cómo representar la prioridad. Elegí las cuatro opciones recomendadas después de leer el trade-off de cada una.
- **El resto de las decisiones técnicas (modelado de la jerarquía, cómo calcular los rollups de esfuerzo, versiones de librerías, testing, Docker) las propuso Claude con su razonamiento explícito, y quedaron documentadas en [`DECISIONS.md`](./DECISIONS.md)** para poder defenderlas en una entrevista — es literalmente el archivo que le pedí que mantuviera.
- **Cuando el scaffolding automático trajo versiones demasiado nuevas y frágiles** (Nest 12 + ESM + Vitest, TypeORM 1.x recién salido), Claude no lo aceptó porque "es lo último": evaluó el riesgo contra el deadline de 2 días, encontró un conflicto real (Jest no podía parsear el ESM de `@nestjs/typeorm@12`), y bajó a versiones estables y ampliamente documentadas (Nest 10 + TypeORM 0.3.x). Esto está en el decision log porque es exactamente el tipo de "toma de decisiones durante el desarrollo con IA" que quiero poder mostrar.
- **Verificación, no solo generación:** antes de dar por terminada cada parte, se corrió la API real contra una instancia de PostgreSQL real (no mocks) ejercitando CRUD, jerarquía de 3 niveles, cascada de borrado y validaciones, y el frontend real contra ese backend en un navegador headless (capturas en el proceso de desarrollo), además de la suite de tests unitarios.

## Alcance de la asistencia de IA

Todo el código de este repositorio (backend, frontend, Docker, tests) fue generado con asistencia de Claude siguiendo el enfoque de arriba. La revisión, las decisiones de diseño explícitas, y la responsabilidad final por la corrección y calidad de lo entregado son mías — tal como indica el challenge.
