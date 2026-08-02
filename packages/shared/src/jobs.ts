export const applicationAreas = ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "TP Hồ Chí Minh", "Remote"] as const;
export type ApplicationArea = (typeof applicationAreas)[number];

export const jobEmploymentOptions = ["Full-time", "Hybrid", "Remote", "Part-time"] as const;
export type JobEmployment = (typeof jobEmploymentOptions)[number];

export const jobLevelOptions = ["Intern", "Junior", "Mid-level", "Senior", "Manager", "Director"] as const;
export type JobLevel = (typeof jobLevelOptions)[number];

export type JobLocation = ApplicationArea;

export const jobLogoOptions = ["🌸", "🌹", "🌷", "🍑", "💻", "📊", "🎨", "🌿", "⭐", "🦋"] as const;
export type JobLogo = (typeof jobLogoOptions)[number];
