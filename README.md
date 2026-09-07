# Task Manager — 42i technical challenge

**Idioma / Language:** Español (este documento) · [English ⤵](#english)

Herramienta para que un equipo chico de desarrollo gestione sus tareas: creación/edición/borrado, subtareas anidadas a cualquier profundidad, prioridad, estado, y estimaciones de esfuerzo agregadas para entender la carga de trabajo del equipo de un vistazo.

Ver [`DECISIONS.md`](./DECISIONS.md) para el detalle de las decisiones técnicas y alternativas descartadas, y [`CLAUDE.md`](./CLAUDE.md) para cómo se usó IA durante el desarrollo.

## Stack

- **Backend:** NestJS + TypeORM + PostgreSQL. API REST, validación con `class-validator`, documentación con Swagger.
- **Frontend:** React + TypeScript + Vite, sin librerías de UI ni de estado global (ver `DECISIONS.md`).
- **Infra:** Docker Compose (Postgres + backend + frontend en Nginx), sin dependencias de terceros ni cuentas en la nube.

## Cómo correr el proyecto

Requiere Docker y Docker Compose. Desde la raíz del repo:

```bash
docker compose up --build
```

Esto levanta:

| Servicio  | URL                              |
|-----------|-----------------------------------|
| Frontend  | http://localhost:5173             |
| Backend   | http://localhost:3000             |
| Swagger   | http://localhost:3000/api/docs    |
| Postgres  | localhost:5433 (user/pass: `postgres`/`postgres`, db: `task_manager`) — remapeado desde el 5432 por defecto para no chocar con una Postgres local ya corriendo |

El esquema de la base se crea automáticamente al arrancar (`synchronize: true` en desarrollo — ver `DECISIONS.md`), no hace falta correr ninguna migración a mano.

Para bajar todo:

```bash
docker compose down
```

Para bajar todo y borrar los datos de Postgres:

```bash
docker compose down -v
```

## Cómo correr los tests

Los tests unitarios corren sin necesidad de Docker ni de una base de datos real (el repositorio de TypeORM se mockea):

```bash
cd backend
npm install
npm test
```

Cobertura:

```bash
npm run test:cov
```

## Desarrollo local sin Docker (opcional)

**Backend** (necesita una Postgres accesible; podés levantar solo esa parte con `docker compose up db`):

```bash
cd backend
npm install
cp .env.example .env   # ajustá las credenciales si hace falta
npm run start:dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Arquitectura

### Modelo de datos

Una única entidad `Task` (`backend/src/tasks/entities/task.entity.ts`) que se referencia a sí misma con un `parentId` opcional — una subtarea es, para el modelo, una `Task` más. Campos: `title`, `description`, `status` (`TODO` / `IN_PROGRESS` / `DONE`), `priority` (`LOW` / `MEDIUM` / `HIGH` / `URGENT`), `effortEstimate` (número no negativo, opcional), y `parentId`. Borrar una tarea borra en cascada todas sus subtareas.

### Cálculo de carga de trabajo

`backend/src/tasks/effort-aggregation.ts` expone `aggregateEffort`, una función pura que recorre un árbol de tareas (a cualquier profundidad) y devuelve cuánto esfuerzo está `notStarted`, `inProgress`, `done` y el `total`. Se usa en dos lugares:

- **`GET /tasks/summary`** — el resumen global del equipo (para la vista principal), considerando cada tarea de cada jerarquía completa.
- **El campo `effortRollup`** en cada tarea devuelta por la API — el esfuerzo de esa tarea puntual más todos sus descendientes (para la vista de detalle).

### API

| Método | Ruta                    | Descripción                                                        |
|--------|-------------------------|---------------------------------------------------------------------|
| POST   | `/tasks`                | Crea una tarea (opcionalmente con `parentId` para crearla como subtarea) |
| POST   | `/tasks/:id/subtasks`   | Alias de conveniencia: crea una subtarea de `:id`                   |
| GET    | `/tasks`                | Lista tareas de nivel superior (paginado, ordenable, filtrable por `status`/`priority`/`search`, o por `parentId` para listar subtareas de otra tarea) |
| GET    | `/tasks/summary`        | Resumen global de esfuerzo del equipo                                |
| GET    | `/tasks/:id`            | Detalle de una tarea, con su árbol de subtareas completo             |
| PATCH  | `/tasks/:id`            | Actualiza cualquier campo, incluido re-asignar `parentId` (con validación anti-ciclos) |
| DELETE | `/tasks/:id`            | Borra la tarea y toda su descendencia                                |

Documentación interactiva completa en `/api/docs` (Swagger) una vez levantado el backend.

### Vistas

- **Lista principal** (`/`): resumen de carga de trabajo del equipo, filtros (estado, prioridad, búsqueda por título), orden, paginación, y cada tarea con su esfuerzo propio y el acumulado de sus subtareas.
- **Detalle** (`/tasks/:id`): toda la información de la tarea, edición inline, árbol de subtareas navegable y editable a cualquier profundidad (agregar, cambiar estado con un clic, borrar), y su propio rollup de esfuerzo.

Responsive: la tabla de la lista principal pasa a formato de tarjetas apiladas en pantallas angostas.

## Limitaciones conocidas / no implementado

Decisiones conscientes para priorizar los requerimientos obligatorios dentro del deadline (detalladas en `DECISIONS.md`):

- El estado de una tarea padre no se recalcula automáticamente en base al estado de sus subtareas.
- No hay máquina de estados que restrinja transiciones (cualquier cambio de estado es válido).
- No hay autenticación/usuarios — el challenge no lo pide y el foco estaba en el modelo de tareas.
- El árbol de tareas se resuelve cargando todas las tareas en memoria por request en vez de una consulta recursiva en base — una decisión de escala consciente para el tamaño de "equipo chico" que plantea el challenge (ver `DECISIONS.md`).

---

## English

**Language:** [Español ⤴](#task-manager--42i-technical-challenge) · English (this section)

A tool for a small development team to manage their work: create/edit/delete tasks, subtasks nested to any depth, priority, status, and aggregated effort estimates so the team can see its workload at a glance.

See [`DECISIONS.md`](./DECISIONS.md) for the detailed technical decisions and discarded alternatives, and [`CLAUDE.md`](./CLAUDE.md) for how AI was used during development.

### Stack

- **Backend:** NestJS + TypeORM + PostgreSQL. REST API, validation with `class-validator`, Swagger docs.
- **Frontend:** React + TypeScript + Vite, no UI or global-state libraries (see `DECISIONS.md`).
- **Infra:** Docker Compose (Postgres + backend + Nginx-served frontend), no third-party accounts or cloud services.

### Running the project

Requires Docker and Docker Compose. From the repo root:

```bash
docker compose up --build
```

This brings up:

| Service   | URL                              |
|-----------|-----------------------------------|
| Frontend  | http://localhost:5173             |
| Backend   | http://localhost:3000             |
| Swagger   | http://localhost:3000/api/docs    |
| Postgres  | localhost:5433 (user/pass: `postgres`/`postgres`, db: `task_manager`) — remapped from the default 5432 to avoid clashing with a local Postgres install |

The schema is created automatically on boot (`synchronize: true` in development — see `DECISIONS.md`), no migration needs to be run by hand.

To bring everything down:

```bash
docker compose down
```

To bring everything down and delete the Postgres data:

```bash
docker compose down -v
```

### Running the tests

Unit tests run without Docker or a real database (the TypeORM repository is mocked):

```bash
cd backend
npm install
npm test
```

Coverage:

```bash
npm run test:cov
```

### Local development without Docker (optional)

**Backend** (needs a reachable Postgres; you can bring up just that piece with `docker compose up db`):

```bash
cd backend
npm install
cp .env.example .env   # adjust credentials if needed
npm run start:dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Architecture

#### Data model

A single `Task` entity (`backend/src/tasks/entities/task.entity.ts`) that references itself via an optional `parentId` — to the model, a subtask is just another `Task`. Fields: `title`, `description`, `status` (`TODO` / `IN_PROGRESS` / `DONE`), `priority` (`LOW` / `MEDIUM` / `HIGH` / `URGENT`), `effortEstimate` (optional non-negative number), and `parentId`. Deleting a task cascades to all of its subtasks.

#### Workload calculation

`backend/src/tasks/effort-aggregation.ts` exposes `aggregateEffort`, a pure function that walks a tree of tasks (to any depth) and returns how much effort is `notStarted`, `inProgress`, `done`, and the `total`. It's used in two places:

- **`GET /tasks/summary`** — the team-wide summary (for the main view), considering every task across every full hierarchy.
- **The `effortRollup` field** on every task returned by the API — that task's own effort plus all of its descendants' (for the detail view).

#### API

| Method | Route                   | Description                                                          |
|--------|-------------------------|------------------------------------------------------------------------|
| POST   | `/tasks`                | Creates a task (optionally with `parentId` to create it as a subtask) |
| POST   | `/tasks/:id/subtasks`   | Convenience alias: creates a subtask of `:id`                        |
| GET    | `/tasks`                | Lists top-level tasks (paginated, sortable, filterable by `status`/`priority`/`search`, or by `parentId` to list another task's subtasks) |
| GET    | `/tasks/summary`        | Team-wide effort summary                                              |
| GET    | `/tasks/:id`            | A task's detail, with its full subtask tree                          |
| PATCH  | `/tasks/:id`            | Updates any field, including re-assigning `parentId` (with anti-cycle validation) |
| DELETE | `/tasks/:id`            | Deletes the task and all of its descendants                          |

Full interactive documentation at `/api/docs` (Swagger) once the backend is running.

#### Views

- **Main list** (`/`): team workload summary, filters (status, priority, title search), sorting, pagination, and each task shown with its own effort plus its subtasks' rolled-up effort.
- **Detail** (`/tasks/:id`): all of a task's information, inline editing, a navigable and editable subtask tree at any depth (add, one-click status change, delete), and its own effort rollup.

Responsive: the main list's table collapses into stacked cards on narrow screens.

### Known limitations / not implemented

Conscious decisions to prioritize the mandatory requirements within the deadline (detailed in `DECISIONS.md`):

- A parent task's status isn't automatically recalculated from its subtasks' statuses.
- There's no state machine restricting status transitions (any change is valid).
- No authentication/users — the challenge doesn't ask for it and the focus was the task model.
- The task tree is resolved by loading all tasks into memory per request instead of a recursive database query — a conscious scale decision for the "small team" size the challenge describes (see `DECISIONS.md`).