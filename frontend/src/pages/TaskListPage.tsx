import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/tasksApi';
import type { EffortSummary, PaginatedResponse, TaskListItem, TaskQuery } from '../types/task';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { WorkloadSummary } from '../components/WorkloadSummary';
import { TaskForm } from '../components/TaskForm';
import { Pagination } from '../components/Pagination';

const DEFAULT_QUERY: TaskQuery = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' };

export function TaskListPage() {
  const [query, setQuery] = useState<TaskQuery>(DEFAULT_QUERY);
  const [result, setResult] = useState<PaginatedResponse<TaskListItem> | null>(null);
  const [summary, setSummary] = useState<EffortSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, workload] = await Promise.all([tasksApi.list(query), tasksApi.getSummary()]);
      setResult(list);
      setSummary(workload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>Team Tasks</h1>
        <button type="button" className="button" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? 'Cancel' : '+ New Task'}
        </button>
      </header>

      {summary && <WorkloadSummary summary={summary} />}

      {showCreateForm && (
        <div className="card">
          <TaskForm
            submitLabel="Create task"
            showStatus={false}
            onSubmit={async (values) => {
              await tasksApi.create(values);
              setShowCreateForm(false);
              await load();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search by title…"
          defaultValue={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, search: e.target.value || undefined }))}
        />

        <select
          value={query.status ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, status: (e.target.value || undefined) as TaskQuery['status'] }))
          }
        >
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={query.priority ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, priority: (e.target.value || undefined) as TaskQuery['priority'] }))
          }
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select
          value={`${query.sortBy}:${query.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(':') as [TaskQuery['sortBy'], TaskQuery['sortOrder']];
            setQuery((q) => ({ ...q, sortBy, sortOrder }));
          }}
        >
          <option value="createdAt:DESC">Newest first</option>
          <option value="createdAt:ASC">Oldest first</option>
          <option value="title:ASC">Title (A-Z)</option>
          <option value="priority:DESC">Priority (high-low)</option>
          <option value="effortEstimate:DESC">Effort (high-low)</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && result && result.data.length === 0 && (
        <p className="empty-state">No tasks match these filters yet.</p>
      )}

      {!loading && result && result.data.length > 0 && (
        <div className="task-table" role="table">
          <div className="task-table__row task-table__row--head" role="row">
            <span>Title</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Effort (task / +subtasks)</span>
            <span>Subtasks</span>
          </div>
          {result.data.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`} className="task-table__row" role="row">
              <span className="task-table__title" data-label="Title">
                {task.title}
              </span>
              <span data-label="Status">
                <StatusBadge status={task.status} />
              </span>
              <span data-label="Priority">
                <PriorityBadge priority={task.priority} />
              </span>
              <span data-label="Effort">
                {task.effortEstimate ?? '—'}
                {task.subtaskCount > 0 && (
                  <span className="task-table__rollup"> / {task.effortRollup.total}</span>
                )}
              </span>
              <span data-label="Subtasks">{task.subtaskCount > 0 ? task.subtaskCount : '—'}</span>
            </Link>
          ))}
        </div>
      )}

      {result && (
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        />
      )}
    </div>
  );
}
