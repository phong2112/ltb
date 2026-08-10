/** API message template record used by admin template management. */
export type ApiTemplate = {
  id: string;
  name: string;
  channel: string;
  content: string;
};

/** API payload for creating or updating an admin message template. */
export type ApiTemplateInput = {
  name: string;
  channel: string;
  content: string;
};
