import { Injectable } from "@nestjs/common";
import { MatchSummary } from "@hr-copilot/shared";

type CandidateSignal = {
  fullName: string;
  jobTitle: string;
  jobRequirements: string;
  fileName: string;
};

@Injectable()
export class AiService {
  createInitialMatch(signal: CandidateSignal): MatchSummary {
    const requirementKeywords = this.extractKeywords(signal.jobRequirements);
    const fileKeywords = this.extractKeywords(signal.fileName);
    const overlap = requirementKeywords.filter((keyword) => fileKeywords.includes(keyword));
    const score = Math.min(85, Math.max(45, 55 + overlap.length * 8));

    return {
      summary: `${signal.fullName} applied for ${signal.jobTitle}. CV has been received and is waiting for full parsing.`,
      matchScore: score,
      strengths:
        overlap.length > 0
          ? overlap.map((keyword) => `CV filename or metadata suggests ${keyword} relevance.`)
          : ["Candidate submitted a CV through the career site."],
      risks: ["Full CV text extraction is not enabled yet in this MVP stub."],
      missingRequirements: requirementKeywords.slice(0, 4),
      screeningQuestions: [
        "What is your expected salary range?",
        "What is your notice period?",
        `Which recent experience is most relevant to ${signal.jobTitle}?`,
      ],
    };
  }

  private extractKeywords(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3)
      .slice(0, 20);
  }
}

