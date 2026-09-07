import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { EffortSummary } from '../effort-aggregation';

/**
 * Plain response shapes (not class-validator DTOs - these are outputs,
 * nothing to validate). Kept as interfaces so the service stays simple;
 * Nest serializes whatever object literal we return.
 */
export interface TaskListItemResponse {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: number | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Direct + indirect subtask count, so the list view can show "3 subtasks" without a drill-in. */
  subtaskCount: number;
  /** This task's own estimate plus every descendant's, bucketed by status. */
  effortRollup: EffortSummary;
}

export interface TaskDetailResponse extends TaskListItemResponse {
  /** Only the immediate children, each already carrying its own nested subtasks and rollup. */
  subtasks: TaskDetailResponse[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
