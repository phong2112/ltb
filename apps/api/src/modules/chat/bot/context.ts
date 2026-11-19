export type ChatBotKnowledge = {
  id: string;
  category: string;
  title: string;
  content: string;
};

export type ChatBotJob = {
  id: string;
  title: string;
  company: string | null;
  locations: string[];
  employment: string | null;
  level: string | null;
  salaryRange: string | null;
  description: string;
  requirements: string;
  benefits: string | null;
};

export type ChatBotTurn = {
  sender: "GUEST" | "TA" | "BOT";
  content: string;
};

export type ChatBotContext = {
  knowledge: ChatBotKnowledge[];
  jobs: ChatBotJob[];
  history: ChatBotTurn[];
};

export type ChatBotReply = {
  content: string;
  handoff: boolean;
};

export function jobPath(job: Pick<ChatBotJob, "id">) {
  return `/jobs/${job.id}`;
}
