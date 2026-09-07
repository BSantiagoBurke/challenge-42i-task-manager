# Cómo usé IA en este challenge

**Idioma / Language:** Español (este documento) · [English ⤵](#english)

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

---

## English

**Language:** [Español ⤴](#cómo-usé-ia-en-este-challenge) · English (this section)

This project was built with **Claude** (Cowork) as a coding assistant, under the following explicit instructions I gave it at the start (translated from what I configured):

> Act as a programming pair, not as something that solves everything for me. Explain the reasoning behind every technical decision so I can defend it if asked about it in an interview.
>
> Prioritize the stack I already know (NestJS/PostgreSQL or React/TypeScript) unless the challenge explicitly requires another technology.
>
> Help me keep a short decision log (what I chose, why, what alternatives I discarded) to document in the README or in the commits, since the company explicitly evaluates AI usage.
>
> Clean code, commented where needed, with good practices (clear names, separation of concerns, error handling).

### How that translated into the actual work

- **Product/architecture decisions were mine, explicitly.** Before writing a single line of code, Claude asked me (rather than assuming) four concrete decisions: React+Vite vs. Next.js, monorepo vs. separate repos, how many lifecycle states, and how to represent priority. I picked all four recommended options after reading the trade-off for each.
- **The rest of the technical decisions (hierarchy modeling, how to compute effort rollups, library versions, testing scope, Docker) were proposed by Claude with its reasoning made explicit, and documented in [`DECISIONS.md`](./DECISIONS.md)** so I can defend them in an interview — that's literally the file I asked it to maintain.
- **When the automatic scaffolding brought in versions that were too new and fragile** (Nest 12 + ESM + Vitest, a just-released TypeORM 1.x), Claude didn't accept it just because it was "the latest": it weighed the risk against the 2-day deadline, found a real conflict (Jest couldn't parse `@nestjs/typeorm@12`'s ESM output), and downgraded to stable, well-documented versions (Nest 10 + TypeORM 0.3.x). This is in the decision log because it's exactly the kind of "decision-making during AI-assisted development" I want to be able to show.
- **Verification, not just generation:** before considering any part done, the real API was run against a real PostgreSQL instance (no mocks), exercising CRUD, a 3-level hierarchy, cascade delete, and validation, and the real frontend was run against that backend in a headless browser (screenshots taken during development), on top of the unit test suite.
- **Getting the app actually running was a real back-and-forth, not a one-shot.** Bringing the stack up on my own machine surfaced real friction along the way — installing Docker Desktop, a `git branch` naming mismatch (`master` vs. `main`) when pushing to GitHub, and a Postgres port already in use by a different local install — each diagnosed and fixed as it came up, including one small fix to `docker-compose.yml` (documented in `DECISIONS.md`) once the real environment revealed it.

### Scope of the AI assistance

All the code in this repository (backend, frontend, Docker, tests) was generated with Claude's assistance following the approach above. The review, the explicit design decisions, and the final responsibility for the correctness and quality of what's delivered are mine — as the challenge requires.