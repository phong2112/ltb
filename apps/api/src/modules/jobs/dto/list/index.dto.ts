import { API_ROUTES } from "@hr-copilot/shared";
import { IsIn, IsOptional } from "class-validator";

export class ListJobsDto {
  @IsOptional()
  @IsIn([API_ROUTES.jobs.adminScope])
  scope?: typeof API_ROUTES.jobs.adminScope;
}
