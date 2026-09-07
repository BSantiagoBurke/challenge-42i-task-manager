import type { TaskPriority } from '../types/task';

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`badge badge--priority-${priority.toLowerCase()}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
