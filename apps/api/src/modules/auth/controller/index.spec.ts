import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AuthController } from "./index.controller";

describe("AuthController", () => {
  it("rate-limits login attempts", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.login) as unknown[] | undefined;
    expect(guards).toContain(ThrottlerGuard);
  });
});
