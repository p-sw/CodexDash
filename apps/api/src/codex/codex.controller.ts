import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CodexService } from './codex.service';
import { StartCodexLoginDto } from './dto/start-codex-login.dto';

@Controller('codex')
export class CodexController {
  constructor(private readonly codexService: CodexService) {}

  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.codexService.listAccounts(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('accounts/login/start')
  startAccountLogin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartCodexLoginDto,
  ) {
    return this.codexService.startAccountLogin(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounts/login/:attemptId')
  getLoginAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.codexService.getLoginAttempt(user.sub, attemptId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('accounts/login/:attemptId/cancel')
  cancelLoginAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.codexService.cancelLoginAttempt(user.sub, attemptId);
  }

  @Get('accounts/login/callback')
  async oauthCallback(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const search = new URLSearchParams(query);
    const result = await this.codexService.handleOauthCallbackRequest(
      `${search.size > 0 ? `?${search.toString()}` : ''}`,
    );
    return res
      .status(result.statusCode)
      .contentType('text/html')
      .send(result.html);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('accounts/:accountId')
  deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
  ) {
    return this.codexService.deleteAccount(user.sub, accountId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('usage-summary')
  getUsageSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('refresh') refresh?: string,
  ) {
    return this.codexService.getUsageSummary(user.sub, refresh !== 'false');
  }
}
