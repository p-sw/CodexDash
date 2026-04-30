import { IsEmail, IsString, MinLength } from 'class-validator';
import { RegisterInput } from '@codexdash/shared-types';

export class RegisterDto implements RegisterInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
