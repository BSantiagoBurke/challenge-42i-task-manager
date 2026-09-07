import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TaskDetail, TaskFormValues, TaskStatus } from '../types/task';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskForm } from './TaskForm';
import { tasksApi } from '../api/tasksApi';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

interface SubtaskTreeProps {
  subtasks: TaskDetail[];
  onChanged: () => void;
  /** How deep this level is, purely for indentation. */
  depth?: number;
}

/**
 * Renders a task's subtasks recursively - depth is whatever the data
 * has, there's no hardcoded limit on how many levels this walks.
 * Editing a subtask's own fields happens on its detail page (linked by
 * title) to avoid duplicating the full edit form at every depth; this
 * tree focuses on the operations that make sense in-context: adding a
 * child, a quick status cycle, and delete.
 */
export function SubtaskTree({ subtasks, onChanged, depth = 0 }: SubtaskTreeProps) {
  if (subtasks.length === 0) {
    return depth === 0 ? <p className="subtask-tree__empty">No subtasks yet.</p> : null;
  }

  return (
    <ul className="subtask-tree" style={{ marginLeft: depth > 0 ? '1.25rem' : 0 }}>
      {subtasks.map((subtask) => (
        <SubtaskNode key={subtask.id} task={subtask} onChanged={onChanged} depth={depth} />
      ))}
    </ul>
  );
}

function SubtaskNode({
  task,
  onChanged,
  depth,
}: {
  task: TaskDetail;
  onChanged: () => void;
  depth: number;
}) {
  const [addingChild, setAddingChild] = useState(false);
  const [busy, setBusy] = useState(false);

  const cycleStatus = async () => {
    setBusy(true);
    try {
      await tasksApi.update(task.id, { status: NEXT_STATUS[task.status] });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}" and all of its subtasks?`)) return;
    setBusy(true);
    try {
      await tasksApi.remove(task.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleAddChild = async (values: TaskFormValues) => {
    await tasksApi.createSubtask(task.id, values);
    setAddingChild(false);
    onChanged();
  };

  return (
    <li className="subtask-tree__node">
      <div className="subtask-tree__row">
        <button
          type="button"
          className="subtask-tree__status-toggle"
          onClick={cycleStatus}
          disabled={busy}
          title="Click to advance status"
        >
          <StatusBadge status={task.status} />
        </button>
        <PriorityBadge priority={task.priority} />
        <Link to={`/tasks/${task.id}`} className="subtask-tree__title">
          {task.title}
        </Link>
        {task.effortEstimate !== null && (
          <span className="subtask-tree__effort">{task.effortEstimate}</span>
        )}
        {task.subtaskCount > 0 && (
          <span className="subtask-tree__count">{task.subtaskCount} nested</span>
        )}
        <div className="subtask-tree__actions">
          <button type="button" className="link-button" onClick={() => setAddingChild((v) => !v)}>
            {addingChild ? 'Cancel' : '+ Subtask'}
          </button>
          <button type="button" className="link-button link-button--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {addingChild && (
        <div className="subtask-tree__add-form">
          <TaskForm submitLabel="Add subtask" showStatus={false} onSubmit={handleAddChild} onCancel={() => setAddingChild(false)} />
        </div>
      )}

      {task.subtasks.length > 0 && (
        <SubtaskTree subtasks={task.subtasks} onChanged={onChanged} depth={depth + 1} />
      )}
    </li>
  );
}
