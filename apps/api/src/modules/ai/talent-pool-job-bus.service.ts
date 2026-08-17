import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";

export type TalentPoolExtractedPayload = {
  entryId: string;
  targetJobId: string;
};

/**
 * In-process event bus scoped to AI queue → talent-pool domain handoff.
 * Avoids a circular dependency: AiModule emits here; TalentPoolModule subscribes here
 * without AiModule needing to know about TalentPoolModule.
 */
@Injectable()
export class TalentPoolJobBus extends EventEmitter {
  static readonly EXTRACTED = "talent-pool.extracted" as const;
}
