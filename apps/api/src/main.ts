import { createServer } from 'node:http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CodexService } from './codex/codex.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);

  const codexService = app.get(CodexService);
  const callbackUrl = new URL(
    process.env.CODEX_OAUTH_REDIRECT_URI ??
      'http://localhost:1455/auth/callback',
  );

  const callbackServer = createServer((req, res) => {
    void (async () => {
      if (!req.url) {
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Bad request');
        return;
      }

      const requestedUrl = new URL(req.url, callbackUrl);
      if (
        req.method !== 'GET' ||
        requestedUrl.pathname !== callbackUrl.pathname
      ) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const result = await codexService.handleOauthCallbackRequest(req.url);
      res.writeHead(result.statusCode, {
        'content-type': 'text/html; charset=utf-8',
      });
      res.end(result.html);
    })();
  });

  callbackServer.listen(Number(callbackUrl.port || 80), callbackUrl.hostname);
}
void bootstrap();
