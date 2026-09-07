import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

type MockRepo = Partial<Record<keyof Repository<Task>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  create: jest.fn((dto) => dto),
  save: jest.fn(async (task) => ({ id: 'generated-id', ...task })),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  delete: jest.fn(),
});

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 'id-1',
    title: 'Task',
    description: 'desc',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    effortEstimate: null,
    parentId: null,
    children: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Task;

describe('TasksService', () => {
  let service: TasksService;
  let repo: MockRepo;

  beforeEach(async () => {
    repo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: getRepositoryToken(Task), useValue: repo }],
    }).compile();
    service = module.get(TasksService);
  });

  describe('create', () => {
    it('creates a top-level task without checking for a parent', async () => {
      await service.create({ title: 'A', description: 'B' });
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('rejects creating a subtask under a parent that does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create({ title: 'Sub', description: 'B', parentId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a subtask once the parent is confirmed to exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 'parent-1' }));
      await service.create({ title: 'Sub', description: 'B', parentId: 'parent-1' });
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException for a task that does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.update('missing', { title: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('rejects re-parenting a task under one of its own descendants', async () => {
      const root = makeTask({ id: 'root', parentId: null });
      const child = makeTask({ id: 'child', parentId: 'root' });

      (repo.findOne as jest.Mock).mockImplementation(async ({ where: { id } }) => {
        if (id === 'root') return root;
        if (id === 'child') return child;
        return null;
      });
      (repo.find as jest.Mock).mockResolvedValue([root, child]);

      await expect(service.update('root', { parentId: 'child' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows re-parenting to an unrelated existing task', async () => {
      const task = makeTask({ id: 't1', parentId: null });
      const other = makeTask({ id: 't2', parentId: null });

      (repo.findOne as jest.Mock).mockImplementation(async ({ where: { id } }) => {
        if (id === 't1') return task;
        if (id === 't2') return other;
        return null;
      });
      (repo.find as jest.Mock).mockResolvedValue([task, other]);

      await service.update('t1', { parentId: 't2' });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ parentId: 't2' }));
    });

    it('allows detaching a task from its parent by setting parentId to null', async () => {
      const task = makeTask({ id: 't1', parentId: 'p1' });
      (repo.findOne as jest.Mock).mockResolvedValue(task);

      await service.update('t1', { parentId: null as unknown as string });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ parentId: null }));
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a task that does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes the task once confirmed to exist (DB cascade handles subtasks)', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 't1' }));
      await service.remove('t1');
      expect(repo.delete).toHaveBeenCalledWith('t1');
    });
  });

  describe('getSummary', () => {
    it('rolls up effort across every top-level task and its subtasks', async () => {
      const tasks = [
        makeTask({ id: 'a', status: TaskStatus.TODO, effortEstimate: 5, parentId: null }),
        makeTask({ id: 'b', status: TaskStatus.IN_PROGRESS, effortEstimate: 2, parentId: 'a' }),
        makeTask({ id: 'c', status: TaskStatus.DONE, effortEstimate: 1, parentId: null }),
      ];
      (repo.find as jest.Mock).mockResolvedValue(tasks);

      const summary = await service.getSummary();
      expect(summary).toEqual({ notStarted: 5, inProgress: 2, done: 1, total: 8 });
    });
  });

  describe('findAll', () => {
    it('defaults to listing only top-level tasks (parentId is null)', async () => {
      (repo.findAndCount as jest.Mock).mockResolvedValue([[], 0]);
      (repo.find as jest.Mock).mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 10 });

      const [options] = (repo.findAndCount as jest.Mock).mock.calls[0];
      // IsNull() is a TypeORM FindOperator; assert its shape rather than reference-equality.
      expect(options.where.parentId).toMatchObject({ type: 'isNull' });
    });

    it('includes each task\'s subtask count and effort rollup', async () => {
      const parent = makeTask({ id: 'p', effortEstimate: 3, status: TaskStatus.TODO });
      const child = makeTask({ id: 'c', parentId: 'p', effortEstimate: 2, status: TaskStatus.DONE });

      (repo.findAndCount as jest.Mock).mockResolvedValue([[parent], 1]);
      (repo.find as jest.Mock).mockResolvedValue([parent, child]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].subtaskCount).toBe(1);
      expect(result.data[0].effortRollup).toEqual({ notStarted: 3, inProgress: 0, done: 2, total: 5 });
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });
  });
});
