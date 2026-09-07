// Mirrors the backend's enums/response shapes (backend/src/tasks/...).
// Kept as a hand-written mirror rather than a shared package: for a
// two-service challenge project, a shared types package is more
// plumbing than it's worth, and any drift would show up immediately as
// a type error against the fetch responses during development.

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface EffortSummary {
  notStarted: number;
  inProgress: number;
  done: number;
  total: number;
}

export interface TaskListItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: number | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  subtaskCount: number;
  effortRollup: EffortSummary;
}

export interface TaskDetail extends TaskListItem {
  subtasks: TaskDetail[];
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

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: number | null;
  parentId?: string | null;
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'priority' | 'status' | 'effortEstimate';
  sortOrder?: 'ASC' | 'DESC';
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}
