import { aggregateEffort, EffortNode } from './effort-aggregation';
import { TaskStatus } from './enums/task-status.enum';

const node = (
  status: TaskStatus,
  effortEstimate: number | null,
  children: EffortNode[] = [],
): EffortNode => ({ status, effortEstimate, children });

describe('aggregateEffort', () => {
  it('returns all zeros for an empty forest', () => {
    expect(aggregateEffort([])).toEqual({ notStarted: 0, inProgress: 0, done: 0, total: 0 });
  });

  it('buckets a single flat task by its status', () => {
    expect(aggregateEffort([node(TaskStatus.TODO, 5)])).toEqual({
      notStarted: 5,
      inProgress: 0,
      done: 0,
      total: 5,
    });
  });

  it('treats a missing effort estimate as 0, not as unknown', () => {
    const result = aggregateEffort([node(TaskStatus.TODO, null), node(TaskStatus.DONE, 4)]);
    expect(result).toEqual({ notStarted: 0, inProgress: 0, done: 4, total: 4 });
  });

  it('rolls up a multi-level subtask hierarchy into the parent totals', () => {
    // Task (IN_PROGRESS, 2)
    //  └─ Subtask A (TODO, 3)
    //       └─ Subtask A.1 (DONE, 1)
    //  └─ Subtask B (IN_PROGRESS, 4)
    const tree = node(TaskStatus.IN_PROGRESS, 2, [
      node(TaskStatus.TODO, 3, [node(TaskStatus.DONE, 1)]),
      node(TaskStatus.IN_PROGRESS, 4),
    ]);

    expect(aggregateEffort([tree])).toEqual({
      notStarted: 3,
      inProgress: 6, // 2 (root) + 4 (subtask B)
      done: 1,
      total: 10,
    });
  });

  it('aggregates independently across a forest of unrelated top-level tasks', () => {
    const forest = [
      node(TaskStatus.TODO, 5, [node(TaskStatus.TODO, 2)]),
      node(TaskStatus.DONE, 3),
    ];

    expect(aggregateEffort(forest)).toEqual({
      notStarted: 7,
      inProgress: 0,
      done: 3,
      total: 10,
    });
  });

  it('does not let an un-estimated container task hide its estimated subtasks', () => {
    const tree = node(TaskStatus.TODO, null, [node(TaskStatus.IN_PROGRESS, 8)]);
    expect(aggregateEffort([tree])).toEqual({
      notStarted: 0,
      inProgress: 8,
      done: 0,
      total: 8,
    });
  });
});
