import type { EffortSummary } from '../types/task';

/**
 * The "at a glance" workload view the challenge asks for: how much
 * effort hasn't started, how much is in progress, and the overall
 * estimated effort - already rolled up across every task's full subtask
 * hierarchy by the backend (see GET /tasks/summary).
 */
export function WorkloadSummary({ summary }: { summary: EffortSummary }) {
  return (
    <div className="workload-summary" role="group" aria-label="Team workload summary">
      <div className="workload-summary__item">
        <span className="workload-summary__value">{summary.notStarted}</span>
        <span className="workload-summary__label">Not started</span>
      </div>
      <div className="workload-summary__item">
        <span className="workload-summary__value">{summary.inProgress}</span>
        <span className="workload-summary__label">In progress</span>
      </div>
      <div className="workload-summary__item">
        <span className="workload-summary__value">{summary.done}</span>
        <span className="workload-summary__label">Done</span>
      </div>
      <div className="workload-summary__item workload-summary__item--total">
        <span className="workload-summary__value">{summary.total}</span>
        <span className="workload-summary__label">Total estimated effort</span>
      </div>
    </div>
  );
}
