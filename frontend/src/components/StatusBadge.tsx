import type { TaskStatus } from '../types/task';

const LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge--status-${status.toLowerCase()}`}>{LABELS[status]}</span>;
}
