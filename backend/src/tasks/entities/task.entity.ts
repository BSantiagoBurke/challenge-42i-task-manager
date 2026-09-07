import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

/**
 * A task (or subtask - they're the same entity) in the tracker.
 *
 * Hierarchy design: adjacency list (a single nullable `parentId` pointing
 * at another Task), not a closure table or nested-set model. It's the
 * simplest representation of a tree, native to a relational FK, and easy
 * to reason about. The tradeoff is that reading a whole subtree isn't a
 * single indexed query - the service loads the full task set once and
 * walks it in memory instead (see TasksService), which is the right
 * tradeoff at "small dev team" scale and keeps the aggregation logic
 * pure and unit-testable. A closure table would pay for itself at a much
 * larger scale, at the cost of extra write-time bookkeeping.
 *
 * `onDelete: 'CASCADE'` on the self-relation means deleting a task
 * deletes its whole subtree (Postgres cascades through each level's FK
 * in turn). That matches how subtasks are framed in the challenge: they
 * exist to break down their parent, not as independent work items, so a
 * subtask never outlives the task it belongs to.
 */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  /**
   * Effort estimate, optional and non-negative (enforced at the DTO
   * level with class-validator, and again defensively in the service).
   * Stored as `numeric` so fractional estimates (e.g. 0.5 days, 2.5
   * story points) aren't truncated; TypeORM maps `numeric` to a JS
   * string by default, so we add a transformer to keep it a `number`
   * everywhere in application code.
   */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value?: number | null) => value ?? null,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  effortEstimate: number | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Task, (task) => task.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Task | null;

  @OneToMany(() => Task, (task) => task.parent)
  children: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
