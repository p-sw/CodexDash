import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CodexService } from './codex.service';
import { ConnectAccountDto } from './dto/connect-account.dto';

@UseGuards(JwtAuthGuard)
@Controller('codex')
export class CodexController {
  constructor(private readonly codexService: CodexService) {}

  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.codexService.listAccounts(user.sub);
  }

  @Post('accounts')
  connectAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectAccountDto,
  ) {
    return this.codexService.connectAccount(user.sub, dto);
  }

  @Delete('accounts/:accountId')
  deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
  ) {
    return this.codexService.deleteAccount(user.sub, accountId);
  }

  @Get('usage-summary')
  getUsageSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('refresh') refresh?: string,
  ) {
    return this.codexService.getUsageSummary(user.sub, refresh !== 'false');
  }
}
