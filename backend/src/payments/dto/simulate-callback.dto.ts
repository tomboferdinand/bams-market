import { IsIn } from 'class-validator';

export class SimulateCallbackDto {
  @IsIn(['SUCCESS', 'FAILURE'])
  outcome!: 'SUCCESS' | 'FAILURE';
}

