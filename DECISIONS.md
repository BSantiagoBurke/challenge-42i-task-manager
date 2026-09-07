# Decision log

**Idioma / Language:** Español (este documento) · [English ⤵](#english)

Registro breve de las decisiones técnicas tomadas durante el challenge, las alternativas consideradas y por qué las descarté. Lo mantengo separado del README para que este último quede enfocado en "cómo correr el proyecto" y este documento en "por qué quedó así" — es lo que quiero poder defender en una entrevista.

## Stack

**Elegido:** NestJS + TypeORM + PostgreSQL (backend), React + Vite + TypeScript (frontend), monorepo con un solo `docker-compose.yml`.

**Por qué:** es el stack que ya domino de SoyHenry y de mi proyecto Bustix, y el challenge pide explícitamente "priorizar el stack que ya domino salvo que se pida otra tecnología explícitamente" — no era el caso acá.

**Alternativas descartadas:**
- **Next.js** en vez de Vite: para una herramienta interna sin necesidad de SSR/SEO, Next agrega complejidad (App Router, server components) que no aporta nada al challenge y sí consume tiempo de un deadline de 2 días.
- **Repos separados** backend/frontend: complica cumplir "single docker-compose command" y no aporta valor a este tamaño de proyecto.

## Versiones fijadas a propósito (Nest 10 / TypeORM 0.3.x, no las últimas)

Al scaffoldear con `@nestjs/cli@latest` me trajo Nest 12 + TypeScript 6 + módulos ESM + Vitest (en vez de Jest) y, al instalar TypeORM sin fijar versión, se instaló TypeORM 1.1.1. Downgradeé explícitamente a **Nest 10 (CommonJS + Jest)** y **TypeORM ^0.3.31** con **@nestjs/typeorm ^10.0.2**.

**Por qué:** son combinaciones muchísimo más documentadas y probadas (es lo que enseña la mayoría del material de NestJS, incluido lo que vi en el bootcamp), y de hecho me topé con un problema real: `@nestjs/typeorm@12` se distribuye como ESM puro y Jest (con la config CommonJS por defecto del scaffold) no podía ni parsear el import (`SyntaxError: Unexpected token 'export'`). Con un deadline de 2 días, no tenía sentido asumir el riesgo de depurar fricciones de un stack recién salido cuando la versión estable resuelve exactamente lo mismo. Lo dejo documentado acá porque es exactamente el tipo de decisión que el challenge pide poder explicar: usé el asistente para scaffoldear rápido, pero evalué el resultado y lo ajusté con criterio propio en vez de aceptarlo a ciegas.

## Modelado de la jerarquía de subtareas

**Elegido:** lista de adyacencia (`Task.parentId` autorreferenciado, nullable) + `ON DELETE CASCADE`. Para calcular rollups de esfuerzo o navegar un subárbol completo, el `TasksService` carga **todas** las tareas de una sola consulta y arma el árbol en memoria (`task-tree.ts` / `effort-aggregation.ts`), en vez de hacer una query recursiva por cada nivel.

**Por qué:** es el modelo más simple de un árbol sobre una tabla relacional, no requiere una tabla auxiliar y es fácil de explicar. La contrapartida es que leer un subárbol no es una única query indexada — pero para "un equipo chico" (el contexto que da el challenge), cargar todas las tareas en memoria una vez por request es una sola query y es perfectamente razonable. Si esto tuviera que escalar a miles de tareas, migraría a una **closure table** o a una **CTE recursiva** de Postgres — lo anoto para poder hablarlo en la entrevista, no lo implementé porque hubiese sido sobre-ingeniería para el alcance actual.

**Cascada de borrado:** borrar una tarea borra todas sus subtareas (a nivel de base de datos, vía la FK). Alternativa descartada: bloquear el borrado si tiene subtareas (obligar a borrarlas primero) — lo descarté porque agrega una interacción extra sin un beneficio claro para este caso de uso; las subtareas existen para descomponer a su tarea padre, no como entidades independientes.

## Lógica de negocio: agregación de esfuerzo

La función central (`aggregateEffort` en `backend/src/tasks/effort-aggregation.ts`) es una función pura, sin dependencia de TypeORM, que recorre un árbol de tareas y devuelve `{ notStarted, inProgress, done, total }`. La separé del resto del servicio a propósito para poder testearla con objetos planos, sin mockear un repositorio ni levantar una base — es el corazón de la lógica de negocio que pide el challenge y quería que quedara clarísima y 100% cubierta por tests.

Reglas que decidí y por qué:
- Una tarea sin estimación cuenta como `0`, no como "desconocido" — así una tarea contenedora sin estimar no oculta el esfuerzo ya cargado en sus subtareas (es el mismo criterio que usan Jira/Linear).
- El resumen global (`GET /tasks/summary`) recorre **todas** las tareas de la jerarquía completa, no solo las de nivel superior — es justo el punto que el challenge remarca ("these calculations should consider the full subtask hierarchy").
- Además del resumen global expuse un rollup **por tarea** (`effortRollup` en cada respuesta): cuánto esfuerzo tiene esa tarea más todos sus descendientes. Interpreté que "entender la carga de trabajo" aplica tanto a nivel equipo (vista de lista) como a nivel de una tarea puntual con sus subtareas (vista de detalle).

## Ciclo de vida y prioridad

- **Estados:** 3 estados simples (`TODO → IN_PROGRESS → DONE`) en vez de un tablero Kanban de 5 columnas. Decisión tomada junto con Santiago: cubre el requisito de "lifecycle" sin sumar UI/validación que no alcanzaba a construir bien en 2 días.
- **Prioridad:** enum (`LOW/MEDIUM/HIGH/URGENT`) en vez de un número. Es más legible en la UI y en la API, y alcanza para ordenar/filtrar.
- **Sin máquina de estados:** cualquier transición de estado está permitida (no valido que no se pueda volver de `DONE` a `TODO`, por ejemplo). Simplificación consciente — en un equipo real reabrir una tarea es algo común, y restringir transiciones hubiese sido complejidad sin un requerimiento explícito que la pidiera.
- **No implementado (a propósito):** que el estado de una tarea padre se recalcule solo en base a sus subtareas (ej. marcarla "In Progress" automáticamente si alguna subtarea avanzó). Lo dejo como mejora futura en el README — no lo pidió el challenge y hubiese consumido tiempo del resto de los requerimientos obligatorios.

## Prevención de ciclos en la jerarquía

Al reasignar el `parentId` de una tarea (PATCH), el servicio valida que el nuevo padre no sea la propia tarea ni uno de sus descendientes (`wouldCreateCycle` en `task-tree.ts`), devolviendo 400 si es así. Es lógica de negocio no trivial y tiene tests dedicados — sin esta validación sería posible crear una referencia circular y romper cualquier recorrido del árbol.

## Persistencia del esquema: `synchronize: true`, sin migraciones

TypeORM crea el esquema automáticamente al arrancar en vez de usar migraciones versionadas. Para este challenge (un solo comando de Docker Compose, sin entorno productivo ni historial de datos que preservar) es la opción correcta: cero pasos extra para levantar el proyecto. En un servicio real usaría migraciones versionadas — lo dejo explícito para que quede claro que es una decisión de contexto, no que no sepa por qué las migraciones importan.

## Frontend: sin librería de manejo de estado

Todo el estado vive en `useState`/`useEffect` por componente/página, sin Redux/Zustand/React Query. Con dos vistas (lista y detalle) y sin estado compartido complejo entre pantallas, agregar una librería de estado global era complejidad innecesaria. Si el proyecto creciera (más vistas, caché de requests, invalidación cruzada), evaluaría sumar React Query.

## Testing

El challenge pide "unit tests to validate business logic". Prioricé tests unitarios puros para:
- `aggregateEffort` (la agregación recursiva de esfuerzo).
- `task-tree.ts` (armado del árbol y detección de ciclos).
- `TasksService` completo, con el repositorio de TypeORM mockeado (sin base de datos real), cubriendo creación con/sin padre, rechazo de ciclos, borrado, y el resumen global.

No sumé tests e2e contra una base real porque el challenge no lo pide explícitamente y hubiese significado levantar infraestructura de test adicional (una base de test, seeds, cleanup) a costa de tiempo. En cambio, verifiqué el flujo completo manualmente contra una instancia real de Postgres (todas las operaciones CRUD, jerarquía de 3 niveles, cascada de borrado, validaciones) y contra el frontend real corriendo en un navegador (Playwright) antes de dar el backend/frontend por terminados — el detalle está en el README.

## Verificación final con Docker Compose

El entorno donde arranqué este proyecto no tenía salida de red hacia Docker Hub, así que la primera verificación de `docker compose up --build` de punta a punta se hizo en mi propia máquina, no en ese entorno de desarrollo. Ahí surgió un problema real y menor: el puerto 5432 (Postgres) ya estaba ocupado por una instancia de Postgres que tengo corriendo localmente para otro proyecto. Lo resolví remapeando el puerto que expone el servicio `db` en `docker-compose.yml` de `5432:5432` a `5433:5432` — el backend sigue hablando con la base por la red interna de Docker (puerto 5432 ahí adentro, sin cambios), así que esto no afecta en nada el funcionamiento de la app; solo cambia el puerto por el que alguien podría conectarse a la base desde afuera con un cliente como pgAdmin. Lo dejo anotado porque es exactamente el tipo de choque de puertos que le puede pasar a cualquiera que ya tenga Postgres instalado localmente para levantar este proyecto.

Con ese ajuste, `docker compose up --build` levantó los tres servicios (Postgres, backend, frontend) sin errores y la aplicación funcionó correctamente end-to-end.

---

## English

**Language:** [Español ⤴](#decision-log) · English (this section)

A short log of the technical decisions made during the challenge, the alternatives I considered, and why I discarded them. I keep it separate from the README so the README stays focused on "how to run the project" and this document on "why it ended up this way" — this is what I want to be able to defend in an interview.

### Stack

**Chosen:** NestJS + TypeORM + PostgreSQL (backend), React + Vite + TypeScript (frontend), a monorepo with a single `docker-compose.yml`.

**Why:** it's the stack I already know well from SoyHenry and from my Bustix project, and the challenge explicitly asks to "prioritize the stack you already know unless another technology is explicitly required" — that wasn't the case here.

**Alternatives discarded:**
- **Next.js** instead of Vite: for an internal tool with no need for SSR/SEO, Next adds complexity (App Router, server components) that adds nothing to the challenge and costs time against a 2-day deadline.
- **Separate repos** for backend/frontend: complicates meeting the "single docker-compose command" requirement and adds no value at this project's size.

### Versions deliberately pinned (Nest 10 / TypeORM 0.3.x, not the latest)

Scaffolding with `@nestjs/cli@latest` brought in Nest 12 + TypeScript 6 + ESM modules + Vitest (instead of Jest), and installing TypeORM without pinning a version pulled in TypeORM 1.1.1. I explicitly downgraded to **Nest 10 (CommonJS + Jest)** and **TypeORM ^0.3.31** with **@nestjs/typeorm ^10.0.2**.

**Why:** these are far more documented and battle-tested combinations (it's what most NestJS material teaches, including what I saw in the bootcamp), and I actually ran into a real problem: `@nestjs/typeorm@12` ships as pure ESM, and Jest (with the scaffold's default CommonJS config) couldn't even parse the import (`SyntaxError: Unexpected token 'export'`). With a 2-day deadline, it didn't make sense to take on the risk of debugging friction from a just-released stack when the stable version solves exactly the same problem. I'm documenting this here because it's exactly the kind of decision the challenge asks me to be able to explain: I used the assistant to scaffold quickly, but I evaluated the result and adjusted it with my own judgment instead of accepting it blindly.

### Modeling the subtask hierarchy

**Chosen:** an adjacency list (a self-referencing, nullable `Task.parentId`) + `ON DELETE CASCADE`. To compute effort rollups or walk a full subtree, `TasksService` loads **every** task in a single query and builds the tree in memory (`task-tree.ts` / `effort-aggregation.ts`), instead of running a recursive query per level.

**Why:** it's the simplest way to model a tree on a relational table, needs no auxiliary table, and is easy to explain. The tradeoff is that reading a subtree isn't a single indexed query — but for "a small team" (the context the challenge gives), loading every task into memory once per request is a single query and perfectly reasonable. If this had to scale to thousands of tasks, I'd move to a **closure table** or a Postgres **recursive CTE** — I'm noting it here so I can discuss it in the interview; I didn't implement it because it would have been over-engineering for the current scope.

**Cascade delete:** deleting a task deletes all of its subtasks (at the database level, via the FK). Alternative discarded: blocking deletion if a task has subtasks (forcing them to be deleted first) — I discarded this because it adds an extra interaction with no clear benefit for this use case; subtasks exist to break down their parent task, not as independent entities.

### Business logic: effort aggregation

The core function (`aggregateEffort` in `backend/src/tasks/effort-aggregation.ts`) is a pure function, with no TypeORM dependency, that walks a tree of tasks and returns `{ notStarted, inProgress, done, total }`. I deliberately separated it from the rest of the service so it could be tested with plain objects, without mocking a repository or spinning up a database — it's the heart of the business logic the challenge asks for, and I wanted it to be crystal clear and 100% covered by tests.

Rules I decided on, and why:
- A task with no estimate counts as `0`, not "unknown" — so an un-estimated container task never hides the effort already logged on its subtasks (the same criterion Jira/Linear use).
- The global summary (`GET /tasks/summary`) walks **every** task in the full hierarchy, not just top-level ones — this is exactly the point the challenge calls out ("these calculations should consider the full subtask hierarchy").
- Besides the global summary, I exposed a **per-task** rollup (`effortRollup` on every response): how much effort that task has plus all of its descendants. I interpreted "understanding the workload" as applying both at the team level (list view) and at the level of one task and its subtasks (detail view).

### Lifecycle and priority

- **Statuses:** 3 simple states (`TODO → IN_PROGRESS → DONE`) instead of a 5-column Kanban board. Decided together with Santiago: it covers the "lifecycle" requirement without adding UI/validation I didn't have time to build well in 2 days.
- **Priority:** an enum (`LOW/MEDIUM/HIGH/URGENT`) instead of a number. It's more readable in the UI and API, and it's enough to sort/filter by.
- **No state machine:** any status transition is allowed (I don't validate that a task can't go from `DONE` back to `TODO`, for example). A conscious simplification — reopening a task is common on a real team, and restricting transitions would have been complexity with no explicit requirement asking for it.
- **Deliberately not implemented:** a parent task's status recalculating automatically from its subtasks' statuses (e.g. marking it "In Progress" automatically once a subtask advances). I'm leaving this as a future improvement in the README — the challenge didn't ask for it and it would have cost time against the rest of the mandatory requirements.

### Preventing cycles in the hierarchy

When re-assigning a task's `parentId` (PATCH), the service validates that the new parent is neither the task itself nor one of its descendants (`wouldCreateCycle` in `task-tree.ts`), returning a 400 if it is. This is non-trivial business logic with dedicated tests — without this validation it would be possible to create a circular reference and break any traversal of the tree.

### Schema persistence: `synchronize: true`, no migrations

TypeORM creates the schema automatically on boot instead of using versioned migrations. For this challenge (a single Docker Compose command, no production environment or data history to preserve) this is the right call: zero extra steps to bring the project up. For a real service I'd use versioned migrations — I'm stating this explicitly so it's clear this is a decision shaped by context, not that I don't understand why migrations matter.

### Frontend: no state-management library

All state lives in per-component/page `useState`/`useEffect`, with no Redux/Zustand/React Query. With two views (list and detail) and no complex state shared across screens, adding a global state library was unnecessary complexity. If the project grew (more views, request caching, cross-view invalidation), I'd consider adding React Query.

### Testing

The challenge asks for "unit tests to validate business logic." I prioritized pure unit tests for:
- `aggregateEffort` (the recursive effort aggregation).
- `task-tree.ts` (tree building and cycle detection).
- The full `TasksService`, with the TypeORM repository mocked (no real database), covering creation with/without a parent, cycle rejection, deletion, and the global summary.

I didn't add e2e tests against a real database because the challenge doesn't explicitly ask for them, and it would have meant standing up extra test infrastructure (a test database, seeds, cleanup) at the cost of time. Instead, I manually verified the full flow against a real Postgres instance (every CRUD operation, a 3-level hierarchy, cascade delete, validation) and against the real frontend running in a browser (Playwright) before considering the backend/frontend done — the detail is in the README.

### Final verification with Docker Compose

The environment where I built this project had no network access to Docker Hub, so the first true end-to-end verification of `docker compose up --build` happened on my own machine, not in that development environment. That surfaced one real, minor issue: port 5432 (Postgres) was already taken by a Postgres instance I run locally for another project. I fixed it by remapping the `db` service's exposed port in `docker-compose.yml` from `5432:5432` to `5433:5432` — the backend still talks to the database over Docker's internal network (port 5432 in there, unchanged), so this doesn't affect how the app works at all; it only changes the port someone could use to connect to the database from outside with a client like pgAdmin. I'm noting it because it's exactly the kind of port clash that can happen to anyone who already has Postgres installed locally when they try to bring this project up.

With that adjustment, `docker compose up --build` brought up all three services (Postgres, backend, frontend) with no errors, and the application worked correctly end to end.