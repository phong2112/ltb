import { Logger } from "@nestjs/common";
import type { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Server, ServerOptions } from "socket.io";
import { createCorsOriginOptions } from "@/utils/cors";

type RedisClient = ReturnType<typeof createClient>;

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient?: RedisClient;
  private subClient?: RedisClient;
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis() {
    this.pubClient = createClient({ url: this.config.getOrThrow<string>("REDIS_URL") });
    this.subClient = this.pubClient.duplicate();
    this.pubClient.on("error", () => this.logger.error("Realtime Redis publisher connection error"));
    this.subClient.on("error", () => this.logger.error("Realtime Redis subscriber connection error"));
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient, { key: "hr-copilot:chat" });
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      transports: ["websocket"],
      cors: {
        origin: createCorsOriginOptions(this.config),
        credentials: true,
      },
    }) as Server;
    if (!this.adapterConstructor) throw new Error("Realtime Redis adapter is not initialized");
    server.adapter(this.adapterConstructor);
    return server;
  }

  async close(server: Server) {
    await super.close(server);
    await Promise.allSettled([
      this.pubClient?.isOpen ? this.pubClient.quit() : Promise.resolve(),
      this.subClient?.isOpen ? this.subClient.quit() : Promise.resolve(),
    ]);
  }
}
