import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CodexController } from './codex.controller';
import { CodexService } from './codex.service';

@Module({
  imports: [AuthModule],
  controllers: [CodexController],
  providers: [CodexService],
})
export class CodexModule {}
