/** API response for the current authenticated admin session. */
export type ApiAuthSession = {
  user?: {
    email: string;
    name: string;
  };
};
