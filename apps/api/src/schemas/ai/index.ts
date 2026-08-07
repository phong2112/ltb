import { z } from "zod";

export const extractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  title: z.string().nullable(),
  totalYearsExperience: z.number().min(0).max(60).nullable(),
  skills: z.array(z.string()).max(30),
  languages: z.array(z.string()).max(10),
});

const previewConfidenceSchema = z.number().min(0).max(1).catch(0);

export const applicationPreviewExtractionSchema = z.object({
  fullName: z.string().min(1).nullable(),
  email: z.string().min(3).nullable(),
  phone: z.string().min(6).nullable(),
  applicationArea: z.string().min(1).nullable(),
  confidence: z.object({
    fullName: previewConfidenceSchema,
    email: previewConfidenceSchema,
    phone: previewConfidenceSchema,
    applicationArea: previewConfidenceSchema,
  }),
  evidence: z.object({
    fullName: z.string().min(1).nullable(),
    email: z.string().min(1).nullable(),
    phone: z.string().min(1).nullable(),
    applicationArea: z.string().min(1).nullable(),
  }),
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
  workExperiences: z.array(z.object({
    company: z.string().min(1).max(120),
    title: z.string().min(1).max(120).nullable(),
    duration: z.string().min(1).max(120).nullable(),
  })).max(8).optional().default([]),
  workCompanies: z.array(z.string()).max(8),
  workHighlights: z.array(z.string()).max(6),
  education: z.array(z.string()).max(4),
  languages: z.array(z.string()).max(6),
  notesForTa: z.array(z.string()).max(5),
});
