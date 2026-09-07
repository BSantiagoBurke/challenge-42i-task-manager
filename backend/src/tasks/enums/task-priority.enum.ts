/**
 * Urgency of a task, so the team can tell what to focus on at a glance.
 * Modeled as an enum (not a raw number) so the API and UI stay
 * self-documenting and sortable without a lookup table.
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
