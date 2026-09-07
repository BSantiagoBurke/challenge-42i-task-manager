import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import {
  PaginatedResponse,
  TaskDetailResponse,
  TaskListItemResponse,
} from './dto/task-response.dto';
import { aggregateEffort, EffortNode, EffortSummary } from './effort-aggregation';
import { buildSubtree, groupByParent, WithChildren, wouldCreateCycle } from './task-tree';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    if (dto.parentId) {
      await this.findOrThrow(dto.parentId);
    }
    const task = this.tasksRepository.create(dto);
    return this.tasksRepository.save(task);
  }

  async findAll(query: QueryTasksDto): Promise<PaginatedResponse<TaskListItemResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Record<string, unknown> = {
      // No explicit parentId in the query => top-level tasks only.
      parentId: query.parentId ?? IsNull(),
    };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) where.title = ILike(`%${query.search}%`);

    const [tasks, total] = await this.tasksRepository.findAndCount({
      where,
      order: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // The subtree rollup for each listed task needs to see its
    // descendants, which the paginated page above doesn't include. We
    // load the full task set once (id/parentId/status/effortEstimate is
    // all that's needed) rather than re-querying per row - see the Task
    // entity's doc comment for why this is the right tradeoff here.
    const allTasks = await this.tasksRepository.find();
    const byParent = groupByParent(allTasks);

    const data = tasks.map((task) => this.toListItem(task, allTasks, byParent));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOne(id: string): Promise<TaskDetailResponse> {
    await this.findOrThrow(id);
    const allTasks = await this.tasksRepository.find();
    const byParent = groupByParent(allTasks);
    const tree = buildSubtree(id, allTasks, byParent)!;
    return this.toDetail(tree, byParent);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOrThrow(id);

    if (dto.parentId !== undefined && dto.parentId !== task.parentId) {
      if (dto.parentId !== null) {
        await this.findOrThrow(dto.parentId);
        const allTasks = await this.tasksRepository.find();
        if (wouldCreateCycle(id, dto.parentId, allTasks)) {
          throw new BadRequestException(
            'Cannot set parent: a task cannot become a subtask of its own descendant.',
          );
        }
      }
    }

    Object.assign(task, dto);
    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    // ON DELETE CASCADE on the self-referential FK takes care of the
    // whole subtree at the database level - see Task entity comment.
    await this.tasksRepository.delete(id);
  }

  async getSummary(): Promise<EffortSummary> {
    const allTasks = await this.tasksRepository.find();
    const byParent = groupByParent(allTasks);
    const roots = byParent.get(null) ?? [];
    const forest: EffortNode[] = roots.map((root) =>
      this.toEffortNode(buildSubtree(root.id, allTasks, byParent)!),
    );
    return aggregateEffort(forest);
  }

  private async findOrThrow(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  private toEffortNode(tree: WithChildren<Task>): EffortNode {
    return {
      status: tree.node.status,
      effortEstimate: tree.node.effortEstimate,
      children: tree.children.map((c) => this.toEffortNode(c)),
    };
  }

  private countDescendants(tree: WithChildren<Task>): number {
    return tree.children.reduce((sum, child) => sum + 1 + this.countDescendants(child), 0);
  }

  private toListItem(
    task: Task,
    allTasks: Task[],
    byParent: Map<string | null, Task[]>,
  ): TaskListItemResponse {
    const tree = buildSubtree(task.id, allTasks, byParent)!;
    return {
      ...this.toPlain(task),
      subtaskCount: this.countDescendants(tree),
      effortRollup: aggregateEffort([this.toEffortNode(tree)]),
    };
  }

  private toDetail(
    tree: WithChildren<Task>,
    byParent: Map<string | null, Task[]>,
  ): TaskDetailResponse {
    return {
      ...this.toPlain(tree.node),
      subtaskCount: this.countDescendants(tree),
      effortRollup: aggregateEffort([this.toEffortNode(tree)]),
      subtasks: tree.children.map((child) => this.toDetail(child, byParent)),
    };
  }

  private toPlain(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      effortEstimate: task.effortEstimate,
      parentId: task.parentId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
