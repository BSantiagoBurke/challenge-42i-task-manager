# Task Manager — 42i technical challenge

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
| Postgres  | localhost:5432 (user/pass: `postgres`/`postgres`, db: `task_manager`) |

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
