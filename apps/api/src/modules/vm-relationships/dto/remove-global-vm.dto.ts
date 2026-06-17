import { IsIn, IsOptional } from 'class-validator';

export type GlobalVmCascade = 'keep' | 'unassign';

export class RemoveGlobalVmDto {
  // How to cascade to the outgoing VM's journey assignments (spec/26 R2):
  //   keep     — leave them intact (default; backwards-compatible no-body DELETE)
  //   unassign — also end the outgoing VM's journey assignments on this VA's journeys
  @IsOptional()
  @IsIn(['keep', 'unassign'])
  cascade?: GlobalVmCascade;
}
