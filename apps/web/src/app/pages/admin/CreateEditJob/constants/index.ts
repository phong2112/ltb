import { applicationAreas, jobEmploymentOptions, jobLevelOptions, jobLogoOptions } from "@hr-copilot/shared";
import type { Job } from "@/app/data";
import type { JobForm } from "../types";

export const statusDotClass: Record<Job["status"], string> = {
  published: "bg-emerald-500",
  draft: "bg-slate-400",
  closed: "bg-amber-500",
  archived: "bg-slate-600",
};

const DEFAULT_JOB_DESCRIPTION = [
  "<h3>About VinSmart Future:</h3>",
  "<p><em>VinSmartFuture (formerly VinIT) is a technology subsidiary of <strong>Vingroup</strong>, leading the development of a comprehensive <strong>SuperApp and digital ecosystem</strong> that serves tens of millions of users across key sectors: payments, healthcare, education, mobility, commerce, and entertainment.</em></p>",
  "<p><em>Our mission is to build the <strong>\"Digital Core\"</strong> - the foundational technology platform that powers Vingroup's unified digital operations, enabling smart management, data-driven decision-making, and scalable infrastructure on a national level.</em></p>",
  "<p><em><strong>Work Location:</strong></em></p>",
  "<ul>",
  "<li><p><em><strong>Hanoi:</strong> TechnoPark Tower, Vinhomes Ocean Park, Hanoi</em></p></li>",
  "<li><p><em><strong>HCM:</strong> Vincom Dong Khoi, HCM</em></p></li>",
  "</ul>",
  "<h3>Job overview:</h3>",
  "<p><br></p>",
].join("");

const DEFAULT_JOB_BENEFITS = [
  "<ul>",
  "<li><p>Flexible working hours and attendance policy. Work from home on alternate working Saturdays.</p></li>",
  "<li><p>Attractive compensation package and competitive bonus schemes.</p></li>",
  "<li><p>Lunch allowance.</p></li>",
  "<li><p>Exclusive benefits across Vingroup's ecosystem, including preferential rates for education (Vinschool), healthcare services (Vinmec), hospitality and resorts (Vinpearl), vehicle purchases (VinFast), and housing rental and ownership programs (Vinhomes), in accordance with the Group's policies.</p></li>",
  "<li><p>Full statutory insurance coverage in accordance with Vietnamese Labor Law, including Social Insurance, Health Insurance, and Unemployment Insurance.</p></li>",
  "<li><p>Additional private healthcare insurance provided based on job grade and position.</p></li>",
  "<li><p>Annual health check-ups at reputable hospitals and healthcare centers nationwide.</p></li>",
  "<li><p>Opportunity to participate in large-scale, strategic technology projects.</p></li>",
  "<li><p>Opportunity to work in a professional technology environment alongside scientists, experts, and engineers from leading technology companies in Vietnam and around the world.</p></li>",
  "<li><p>Access to free learning resources on Udemy, Coursera, and O'Reilly, as well as internal workshops and seminars.</p></li>",
  "<li><p>Sponsorship for professional certifications and special mentorship programs from Company and Group leadership.</p></li>",
  "<li><p>Opportunity to join Vingroup's technology clubs and internal technology communities, contributing ideas and projects to real-world applications.</p></li>",
  "<li><p>Internal Trainer development programs with special benefits for knowledge-sharing contributors.</p></li>",
  "<li><p>12 annual leave days, plus public holidays in accordance with Vietnamese Labor Law.</p></li>",
  "<li><p>Participation in company activities, team-building programs, and annual corporate events.</p></li>",
  "</ul>",
].join("");

export const EMPTY_JOB_FORM: JobForm = {
  title: "",
  company: "",
  locations: [],
  type: "Full-time",
  level: "Mid-level",
  salary: "",
  tags: [],
  description: DEFAULT_JOB_DESCRIPTION,
  requirements: "",
  benefits: DEFAULT_JOB_BENEFITS,
  status: "draft",
  urgent: false,
  logo: "🌷",
  questions: [],
};

export const SALARY_CURRENCIES = ["VND", "USD"] as const;
export const MAX_SALARY_VALUE = 1_000_000_000_000;
export const MAX_SALARY_DISPLAY = "1,000,000,000,000";
export const LOGOS = jobLogoOptions;
export const JOB_LOCATIONS = applicationAreas;
export const JOB_TYPES = jobEmploymentOptions;
export const JOB_LEVELS = jobLevelOptions;
export const TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’()&/+:#-]+$/u;
export const TAG_PATTERN = /^[\p{L}\p{N}\s+#./-]+$/u;
export const MAX = {
  title: 120,
  company: 100,
  salary: 40,
  tags: 240,
  description: 5000,
  requirements: 4000,
  benefits: 3000,
  questions: 10,
  questionLabel: 300,
};
export const MAX_SALARY_AMOUNT = MAX.salary - " VND".length;
