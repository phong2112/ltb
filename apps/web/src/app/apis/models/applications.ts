/** API response for CV preview parsing before the candidate submits an application. */
export type ApiApplicationCvPreview = {
  profile: {
    fullName?: string;
    title?: string;
    email?: string;
    phone?: string;
    normalizedPhone?: string;
    applicationArea?: string;
    skills?: string[];
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
  metadata: {
    parser: string;
    qualityScore?: number;
    lowConfidenceOcr?: boolean;
    profileSource?: string;
  };
};
