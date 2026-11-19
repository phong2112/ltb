import { CHAT_AI_RETRY_BUDGET_MS, chatAiRetryWaitMs } from "./constants";

describe("chatAiRetryWaitMs", () => {
  it("waits for the provider's retry time when it fits the budget", () => {
    expect(chatAiRetryWaitMs({ retryAfterMs: 7_560, attempt: 1, elapsedMs: 1_000 })).toBe(7_560);
  });

  it("waits at least one second to avoid hammering the provider", () => {
    expect(chatAiRetryWaitMs({ retryAfterMs: 10, attempt: 1, elapsedMs: 0 })).toBe(1_000);
  });

  it("gives up when the wait would exceed the guest-facing budget", () => {
    expect(chatAiRetryWaitMs({ retryAfterMs: 20_000, attempt: 1, elapsedMs: CHAT_AI_RETRY_BUDGET_MS - 10_000 })).toBeNull();
  });

  it("gives up after the last attempt", () => {
    expect(chatAiRetryWaitMs({ retryAfterMs: 1_000, attempt: 3, elapsedMs: 0 })).toBeNull();
  });
});
