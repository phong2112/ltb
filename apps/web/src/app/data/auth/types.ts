export type ApiAuthSession = {
  user?: {
    email: string;
    name: string;
  };
};

export type LoginResult = { ok: true } | { ok: false; reason: "invalidCredentials" | "apiUnavailable" };

