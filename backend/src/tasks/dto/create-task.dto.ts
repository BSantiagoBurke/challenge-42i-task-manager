import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class CreateTaskDto {
  @ApiProperty({ example: 'Set up CI pipeline' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Configure GitHub Actions to run lint + tests on every PR' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: 3,
    description: 'Non-negative effort estimate (unit is up to the team: hours, days, points).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  effortEstimate?: number;

  @ApiPropertyOptional({
    description: 'Set to make this task a subtask of another task.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
