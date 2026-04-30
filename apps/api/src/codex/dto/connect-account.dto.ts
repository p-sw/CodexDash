import { IsOptional, IsString, MinLength } from 'class-validator';
import { ConnectAccountInput } from '@codexdash/shared-types';

export class ConnectAccountDto implements ConnectAccountInput {
  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  emailHint?: string;

  @IsString()
  @MinLength(20)
  cookieHeader!: string;
}
