export type { ApiAuthSession } from "@/app/apis/models";

export type LoginResult = { ok: true } | { ok: false; reason: "invalidCredentials" | "apiUnavailable" };
