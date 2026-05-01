import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ensureSqliteSchema } from './sqlite-bootstrap';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await ensureSqliteSchema();
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
