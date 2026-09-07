import { apiRequest } from './client';
import type {
  EffortSummary,
  PaginatedResponse,
  TaskDetail,
  TaskFormValues,
  TaskListItem,
  TaskQuery,
} from '../types/task';

function toQueryString(query: TaskQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const tasksApi = {
  list: (query: TaskQuery) =>
    apiRequest<PaginatedResponse<TaskListItem>>(`/tasks${toQueryString(query)}`),

  getSummary: () => apiRequest<EffortSummary>('/tasks/summary'),

  getOne: (id: string) => apiRequest<TaskDetail>(`/tasks/${id}`),

  create: (values: Partial<TaskFormValues> & { title: string; description: string }) =>
    apiRequest<TaskDetail>('/tasks', { method: 'POST', body: JSON.stringify(values) }),

  createSubtask: (parentId: string, values: Partial<TaskFormValues> & { title: string; description: string }) =>
    apiRequest<TaskDetail>(`/tasks/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),

  update: (id: string, values: Partial<TaskFormValues>) =>
    apiRequest<TaskDetail>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(values) }),

  remove: (id: string) => apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
