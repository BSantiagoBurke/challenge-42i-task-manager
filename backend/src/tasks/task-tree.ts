/**
 * Small pure helpers for turning the flat `tasks` table (adjacency list
 * via `parentId`) into the tree shapes the rest of the app needs, plus
 * the cycle guard that keeps that adjacency list a valid tree.
 *
 * Kept independent of TypeORM/the Task entity (generic over any object
 * with id/parentId) so it can be unit tested with plain fixtures.
 */

export interface TreeRecord {
  id: string;
  parentId: string | null;
}

/**
 * Groups records by their parentId. `null` is a real key here (the
 * top-level tasks), not "missing" - callers ask for `map.get(null)` to
 * get the roots of the forest.
 */
export function groupByParent<T extends TreeRecord>(records: T[]): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const record of records) {
    const siblings = map.get(record.parentId) ?? [];
    siblings.push(record);
    map.set(record.parentId, siblings);
  }
  return map;
}

export interface WithChildren<T> {
  node: T;
  children: WithChildren<T>[];
}

/** Builds the nested subtree rooted at `rootId` from a pre-grouped map. */
export function buildSubtree<T extends TreeRecord>(
  rootId: string,
  all: T[],
  byParent: Map<string | null, T[]> = groupByParent(all),
): WithChildren<T> | null {
  const root = all.find((r) => r.id === rootId);
  if (!root) return null;
  return attachChildren(root, byParent);
}

function attachChildren<T extends TreeRecord>(
  record: T,
  byParent: Map<string | null, T[]>,
): WithChildren<T> {
  const children = (byParent.get(record.id) ?? []).map((child) => attachChildren(child, byParent));
  return { node: record, children };
}

/**
 * True if setting `task.parentId = candidateParentId` would create a
 * cycle - either the candidate parent *is* the task itself, or it is
 * one of the task's own descendants (which would make the task an
 * ancestor of its own ancestor once the change is applied).
 *
 * Walking down from the task via children is used rather than walking
 * up from the candidate via parentId, because both directions detect
 * the same cycle but "is candidateParentId inside task's subtree" reads
 * more directly as the invariant we're protecting.
 */
export function wouldCreateCycle<T extends TreeRecord>(
  taskId: string,
  candidateParentId: string,
  allTasks: T[],
): boolean {
  if (taskId === candidateParentId) return true;

  const byParent = groupByParent(allTasks);
  const stack = [...(byParent.get(taskId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.id === candidateParentId) return true;
    stack.push(...(byParent.get(current.id) ?? []));
  }
  return false;
}
