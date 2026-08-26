import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./modules/app.module";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";
import { createCorsOriginOptions } from "./utils/cors";
import { VietnameseExceptionFilter } from "./utils/filters";
import { createVietnameseValidationPipe } from "./utils/pipes";
import { setupSwagger } from "./utils/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const provided = request.header("X-Request-Id");
    const requestId = provided && /^[a-zA-Z0-9_.:-]{1,80}$/.test(provided) ? provided : randomUUID();
    request.headers["x-request-id"] = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  });
  app.set("trust proxy", config.get<number>("TRUST_PROXY_HOPS") ?? 1);

  app.enableCors({
    origin: createCorsOriginOptions(config),
    credentials: true,
  });
  const realtimeAdapter = new RedisIoAdapter(app, config);
  await realtimeAdapter.connectToRedis();
  app.useWebSocketAdapter(realtimeAdapter);

  setupSwagger(app);
  app.use(helmet());
  app.useGlobalFilters(new VietnameseExceptionFilter());
  app.useGlobalPipes(createVietnameseValidationPipe());

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
}

void bootstrap();
