import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

/**
 * Every field is optional on update (PATCH semantics). We reuse
 * CreateTaskDto's validators via PartialType instead of redeclaring
 * them, so a rule change (e.g. title length) only has one place to edit.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
