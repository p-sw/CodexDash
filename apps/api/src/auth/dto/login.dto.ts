import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginInput } from '@codexdash/shared-types';

export class LoginDto implements LoginInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
