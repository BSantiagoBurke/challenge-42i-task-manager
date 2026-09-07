# Decision log

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

## Limitación conocida del entorno de desarrollo

El entorno donde armé este proyecto no tiene salida de red hacia Docker Hub, así que no pude correr `docker compose up --build` de punta a punta ahí. Sí verifiqué: que `docker compose config` valida la sintaxis del compose sin errores, que el backend compila y corre contra Postgres real, y que el frontend compila y funciona contra el backend real — pero **corré `docker compose up --build` una vez en tu máquina antes de entregar**, como último chequeo de que todo el empaquetado en contenedores funciona igual que en desarrollo.
