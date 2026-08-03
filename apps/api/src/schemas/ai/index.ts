import { z } from "zod";

export const extractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  title: z.string().nullable(),
  totalYearsExperience: z.number().min(0).max(60).nullable(),
  skills: z.array(z.string()).max(30),
  languages: z.array(z.string()).max(10),
});

export const matchAnalysisSchema = z.object({
  summary: z.string().min(1).max(800),
  evaluations: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(["met", "partial", "not_met", "unknown"]),
    evidence: z.preprocess(
      value => typeof value === "string" ? [value] : value,
      z.array(z.string()).max(3),
    ),
    reason: z.string().min(1).max(500),
  })).max(15),
});

export const cvSummarySchema = z.object({
  overview: z.string().min(1).max(500),
  currentTitle: z.string().nullable(),
  totalExperience: z.string().nullable(),
  keySkills: z.array(z.string()).max(12),
  workCompanies: z.array(z.string()).max(8),
  workHighlights: z.array(z.string()).max(6),
  education: z.array(z.string()).max(4),
  languages: z.array(z.string()).max(6),
  notesForTa: z.array(z.string()).max(5),
});
