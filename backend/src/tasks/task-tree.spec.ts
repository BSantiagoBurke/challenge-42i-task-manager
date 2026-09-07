import { buildSubtree, groupByParent, wouldCreateCycle, TreeRecord } from './task-tree';

const rec = (id: string, parentId: string | null): TreeRecord => ({ id, parentId });

describe('groupByParent', () => {
  it('groups top-level records under the null key', () => {
    const map = groupByParent([rec('a', null), rec('b', null)]);
    expect(map.get(null)).toHaveLength(2);
  });
});

describe('buildSubtree', () => {
  it('returns null when the root does not exist', () => {
    expect(buildSubtree('missing', [rec('a', null)])).toBeNull();
  });

  it('nests children arbitrarily deep', () => {
    const all = [rec('a', null), rec('b', 'a'), rec('c', 'b'), rec('d', 'a')];
    const tree = buildSubtree('a', all)!;

    expect(tree.node.id).toBe('a');
    expect(tree.children.map((c) => c.node.id).sort()).toEqual(['b', 'd']);

    const b = tree.children.find((c) => c.node.id === 'b')!;
    expect(b.children).toHaveLength(1);
    expect(b.children[0].node.id).toBe('c');
  });

  it('returns a leaf with no children when the task has no subtasks', () => {
    const tree = buildSubtree('a', [rec('a', null)])!;
    expect(tree.children).toEqual([]);
  });
});

describe('wouldCreateCycle', () => {
  const all = [rec('a', null), rec('b', 'a'), rec('c', 'b')];

  it('rejects a task becoming its own parent', () => {
    expect(wouldCreateCycle('a', 'a', all)).toBe(true);
  });

  it('rejects re-parenting a task under its own descendant', () => {
    // a -> b -> c ; trying to make a's parent be c (its grandchild)
    expect(wouldCreateCycle('a', 'c', all)).toBe(true);
  });

  it('allows re-parenting under an unrelated task', () => {
    const withUnrelated = [...all, rec('z', null)];
    expect(wouldCreateCycle('c', 'z', withUnrelated)).toBe(false);
  });

  it('allows re-parenting to null-unrelated ancestor branch (sibling, not descendant)', () => {
    // b has children c; moving b under a fresh sibling of a is fine
    const withSibling = [...all, rec('sibling', null)];
    expect(wouldCreateCycle('b', 'sibling', withSibling)).toBe(false);
  });
});
