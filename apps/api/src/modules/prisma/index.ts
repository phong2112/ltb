import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./index.service";

export { PrismaService } from "./index.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
