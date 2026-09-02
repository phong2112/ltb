import { UnauthorizedException } from "@nestjs/common";
import type { AuthService } from "@/modules/auth/service/index.service";
import { JobsListGuard } from "./jobs-list.guard";

describe("JobsListGuard", () => {
  const authService = { verifyAccessToken: jest.fn() } as unknown as AuthService;

  beforeEach(() => jest.clearAllMocks());

  it("allows the public list without reading an admin cookie", async () => {
    const request = { query: {}, headers: {} };

    await expect(new JobsListGuard(authService).canActivate(contextFor(request))).resolves.toBe(true);
    expect(authService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("rejects the admin list without an access-token cookie", async () => {
    const request = { query: { scope: "admin" }, headers: {} };

    await expect(new JobsListGuard(authService).canActivate(contextFor(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("verifies the access token for the admin list", async () => {
    const request = { query: { scope: "admin" }, headers: { cookie: "access_token=valid-token" } };
    (authService.verifyAccessToken as jest.Mock).mockResolvedValue({ sub: "admin-1" });

    await expect(new JobsListGuard(authService).canActivate(contextFor(request))).resolves.toBe(true);
    expect(authService.verifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(request).toMatchObject({ user: { sub: "admin-1" } });
  });
});

function contextFor(request: object) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}
