import type { Request } from "express";

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
