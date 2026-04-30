import { IsString, MinLength } from 'class-validator';
import { CompleteCodexManualLoginInput } from '@codexdash/shared-types';

export class CompleteCodexManualLoginDto implements CompleteCodexManualLoginInput {
  @IsString()
  @MinLength(10)
  callbackUrl!: string;
}
