import { Module } from "@nestjs/common";
import { EmailService } from "./email/index.service";

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
