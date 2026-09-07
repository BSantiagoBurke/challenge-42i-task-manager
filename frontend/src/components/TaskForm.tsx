import { useState, type FormEvent } from 'react';
import { TASK_PRIORITIES, TASK_STATUSES } from '../types/task';
import type { TaskFormValues } from '../types/task';

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel?: () => void;
  /** Hide the status field (e.g. when creating a brand-new task, which always starts as To Do). */
  showStatus?: boolean;
}

const EMPTY_VALUES: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  effortEstimate: null,
};

export function TaskForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  showStatus = true,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!values.title.trim() || !values.description.trim()) {
      setError('Title and description are required.');
      return;
    }
    if (values.effortEstimate !== null && values.effortEstimate < 0) {
      setError('Effort estimate cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {error && <p className="task-form__error">{error}</p>}

      <label className="task-form__field">
        <span>Title</span>
        <input
          type="text"
          value={values.title}
          maxLength={200}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          autoFocus
        />
      </label>

      <label className="task-form__field">
        <span>Description</span>
        <textarea
          value={values.description}
          rows={3}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />
      </label>

      <div className="task-form__row">
        {showStatus && (
          <label className="task-form__field">
            <span>Status</span>
            <select
              value={values.status}
              onChange={(e) => setValues({ ...values, status: e.target.value as typeof values.status })}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="task-form__field">
          <span>Priority</span>
          <select
            value={values.priority}
            onChange={(e) => setValues({ ...values, priority: e.target.value as typeof values.priority })}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="task-form__field">
          <span>Effort estimate</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={values.effortEstimate ?? ''}
            placeholder="optional"
            onChange={(e) =>
              setValues({
                ...values,
                effortEstimate: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </label>
      </div>

      <div className="task-form__actions">
        {onCancel && (
          <button type="button" className="button button--secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
