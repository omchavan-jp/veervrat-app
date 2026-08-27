import { IsOptional, IsString, MaxLength } from 'class-validator';

// Both optional: with neither, the caller gets every suggestion they have made. With a route
// (and optionally an entity), they get the ones on that page — which is what the in-place pins
// ask for on every page load.
export class MineQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  entityId?: string;
}
