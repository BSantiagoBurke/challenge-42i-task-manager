import { TaskStatus } from './enums/task-status.enum';

/**
 * Minimal shape the aggregation needs from a task. Deliberately not the
 * full Task entity: this function has no dependency on TypeORM, so it
 * can be unit tested with plain objects and reused for both the global
 * workload summary and a single task's subtree rollup.
 */
export interface EffortNode {
  status: TaskStatus;
  effortEstimate: number | null;
  children: EffortNode[];
}

export interface EffortSummary {
  /** Sum of effortEstimate for every TODO task in the (sub)tree. */
  notStarted: number;
  /** Sum of effortEstimate for every IN_PROGRESS task in the (sub)tree. */
  inProgress: number;
  /** Sum of effortEstimate for every DONE task in the (sub)tree. */
  done: number;
  /** notStarted + inProgress + done - the overall estimated effort. */
  total: number;
}

/**
 * Rolls up effort estimates across a task (or the whole forest of
 * top-level tasks) and every descendant, bucketed by status.
 *
 * A task with no estimate contributes 0, not null: an un-estimated
 * container task (common for a task that exists mainly to group
 * subtasks) shouldn't make the whole rollup "unknown" - we want a best-
 * effort total of what the team *has* estimated, same as most task
 * trackers do (Jira, Linear, etc. sum only the estimated items).
 *
 * Depth is unbounded (the challenge explicitly allows subtasks of
 * subtasks of subtasks...), so this recurses rather than assuming a
 * fixed number of levels.
 */
export function aggregateEffort(nodes: EffortNode[]): EffortSummary {
  const summary: EffortSummary = { notStarted: 0, inProgress: 0, done: 0, total: 0 };

  for (const node of nodes) {
    const estimate = node.effortEstimate ?? 0;

    switch (node.status) {
      case TaskStatus.TODO:
        summary.notStarted += estimate;
        break;
      case TaskStatus.IN_PROGRESS:
        summary.inProgress += estimate;
        break;
      case TaskStatus.DONE:
        summary.done += estimate;
        break;
    }

    if (node.children.length > 0) {
      const childSummary = aggregateEffort(node.children);
      summary.notStarted += childSummary.notStarted;
      summary.inProgress += childSummary.inProgress;
      summary.done += childSummary.done;
    }
  }

  summary.total = summary.notStarted + summary.inProgress + summary.done;
  return summary;
}
