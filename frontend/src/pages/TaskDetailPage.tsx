import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tasksApi } from '../api/tasksApi';
import type { TaskDetail, TaskFormValues } from '../types/task';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { WorkloadSummary } from '../components/WorkloadSummary';
import { TaskForm } from '../components/TaskForm';
import { SubtaskTree } from '../components/SubtaskTree';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setTask(await tasksApi.getOne(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm(`Delete "${task.title}" and all of its subtasks? This can't be undone.`)) return;
    await tasksApi.remove(task.id);
    navigate('/');
  };

  if (loading) return <div className="page">Loading…</div>;
  if (error) return <div className="page error-text">{error}</div>;
  if (!task) return null;

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back to all tasks
      </Link>

      <header className="page__header">
        <div>
          <h1>{task.title}</h1>
          <div className="task-detail__badges">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <div className="task-detail__header-actions">
          <button type="button" className="button button--secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button type="button" className="button button--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </header>

      {editing ? (
        <div className="card">
          <TaskForm
            submitLabel="Save changes"
            initialValues={task}
            onSubmit={async (values: TaskFormValues) => {
              await tasksApi.update(task.id, values);
              setEditing(false);
              await load();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <p className="task-detail__description">{task.description}</p>
      )}

      <section className="task-detail__section">
        <h2>Effort (this task + all subtasks)</h2>
        <WorkloadSummary summary={task.effortRollup} />
        {task.effortEstimate === null && (
          <p className="task-detail__hint">This task itself has no estimate set.</p>
        )}
      </section>

      <section className="task-detail__section">
        <div className="task-detail__section-header">
          <h2>Subtasks {task.subtaskCount > 0 && `(${task.subtaskCount})`}</h2>
          <button type="button" className="link-button" onClick={() => setAddingSubtask((v) => !v)}>
            {addingSubtask ? 'Cancel' : '+ Add subtask'}
          </button>
        </div>

        {addingSubtask && (
          <div className="card">
            <TaskForm
              submitLabel="Add subtask"
              showStatus={false}
              onSubmit={async (values) => {
                await tasksApi.createSubtask(task.id, values);
                setAddingSubtask(false);
                await load();
              }}
              onCancel={() => setAddingSubtask(false)}
            />
          </div>
        )}

        <SubtaskTree subtasks={task.subtasks} onChanged={load} />
      </section>
    </div>
  );
}
