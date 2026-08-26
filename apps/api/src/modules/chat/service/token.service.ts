import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class ChatTokenService {
  generate() {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  expiresInDays(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

