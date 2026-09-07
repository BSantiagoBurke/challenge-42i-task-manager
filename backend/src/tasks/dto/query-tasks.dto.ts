import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

const SORTABLE_FIELDS = ['createdAt', 'title', 'priority', 'status', 'effortEstimate'] as const;
export type TaskSortField = (typeof SORTABLE_FIELDS)[number];

/**
 * Query params for GET /tasks (the main list view).
 *
 * By default this lists top-level tasks only (parentId IS NULL) - the
 * main view is meant to give an at-a-glance overview of the team's work
 * items, and subtasks are a breakdown detail you drill into via the
 * detail view, not independent rows competing for space in the main
 * list. Passing `parentId` explicitly lists the children of that task
 * instead, which the frontend reuses to render a subtask's own subtasks.
 */
export class QueryTasksDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: TaskSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Case-insensitive match against the title.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'List the children of this task instead of top-level tasks. Pass "null" (string) explicitly to be explicit about top-level.',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
