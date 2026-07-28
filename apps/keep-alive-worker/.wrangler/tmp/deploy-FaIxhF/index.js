var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var HEALTH_REQUEST_TIMEOUT_MS = 12e4;
async function pingRenderHealth(healthUrl, fetcher = fetch) {
  assertHealthUrl(healthUrl);
  const startedAt = Date.now();
  const response = await fetcher(healthUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "ltb-cloudflare-keep-alive/1.0"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS)
  });
  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`Render health check failed with HTTP ${response.status}`);
  }
  return {
    durationMs: Date.now() - startedAt,
    status: response.status
  };
}
__name(pingRenderHealth, "pingRenderHealth");
function assertHealthUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.pathname !== "/health") {
    throw new Error("RENDER_HEALTH_URL must be a full HTTPS /health URL");
  }
}
__name(assertHealthUrl, "assertHealthUrl");
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        service: "ltb-render-keep-alive",
        status: "ok"
      });
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(controller, env) {
    try {
      const result = await pingRenderHealth(env.RENDER_HEALTH_URL);
      console.log(JSON.stringify({
        cron: controller.cron,
        event: "render_health_ping_succeeded",
        scheduledTime: controller.scheduledTime,
        ...result
      }));
    } catch (error) {
      console.error(JSON.stringify({
        cron: controller.cron,
        error: error instanceof Error ? error.message : "Unknown error",
        event: "render_health_ping_failed",
        scheduledTime: controller.scheduledTime
      }));
      throw error;
    }
  }
};
export {
  assertHealthUrl,
  index_default as default,
  pingRenderHealth
};
//# sourceMappingURL=index.js.map
