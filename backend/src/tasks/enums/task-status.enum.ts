/**
 * Lifecycle of a task within the team's workflow.
 *
 * Kept intentionally small (3 states) rather than a full Kanban board
 * (Backlog/To Do/In Progress/In Review/Done): the challenge asks for a
 * lifecycle "that reflects how work progresses", not a specific board
 * layout, and a 3-state model is enough to answer the required workload
 * questions (not started / in progress / overall effort) without adding
 * UI and validation surface we don't have time to build well.
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}
