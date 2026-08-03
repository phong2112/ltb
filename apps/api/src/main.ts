import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./modules/app.module";
import { createCorsOriginOptions } from "./utils/cors";
import { VietnameseExceptionFilter } from "./utils/filters";
import { createVietnameseValidationPipe } from "./utils/pipes";
import { setupSwagger } from "./utils/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  app.set("trust proxy", config.get<number>("TRUST_PROXY_HOPS") ?? 1);

  app.enableCors({
    origin: createCorsOriginOptions(config),
    credentials: true,
  });
  setupSwagger(app);
  app.use(helmet());
  app.useGlobalFilters(new VietnameseExceptionFilter());
  app.useGlobalPipes(createVietnameseValidationPipe());

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
}

void bootstrap();
