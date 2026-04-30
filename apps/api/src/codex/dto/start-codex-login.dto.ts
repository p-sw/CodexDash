import { IsOptional, IsString, MinLength } from 'class-validator';
import { StartCodexLoginInput } from '@codexdash/shared-types';

export class StartCodexLoginDto implements StartCodexLoginInput {
  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  emailHint?: string;
}
