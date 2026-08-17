import type { ProfileForm } from "./types";

export const POLL_INTERVAL_MS = 5_000;

export const EMPTY_FORM: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  title: "",
  skills: "",
  notes: "",
};
