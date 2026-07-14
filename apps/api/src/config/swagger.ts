import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from "../modules/auth/jwt-auth.guard";

const SWAGGER_PATH = "docs";
export const ACCESS_TOKEN_SECURITY_NAME = "accessToken";
export const REFRESH_TOKEN_SECURITY_NAME = "refreshToken";

export function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService);

  if (!isSwaggerEnabled(configService)) return;

  const config = new DocumentBuilder()
    .setTitle("HR Copilot API")
    .setDescription("API documentation for the HR Copilot career site and protected HR workspace.")
    .setVersion("0.1.0")
    .addCookieAuth(
      ACCESS_TOKEN_COOKIE_NAME,
      {
        description: "JWT access token stored in an httpOnly cookie after login.",
        type: "apiKey",
        in: "cookie",
      },
      ACCESS_TOKEN_SECURITY_NAME,
    )
    .addCookieAuth(
      REFRESH_TOKEN_COOKIE_NAME,
      {
        description: "JWT refresh token stored in an httpOnly cookie after login.",
        type: "apiKey",
        in: "cookie",
      },
      REFRESH_TOKEN_SECURITY_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: "HR Copilot API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  });
}

function isSwaggerEnabled(configService: ConfigService) {
  const configured = configService.get<string>("SWAGGER_ENABLED");
  if (configured) return configured === "true";

  return configService.get<string>("NODE_ENV") !== "production";
}
