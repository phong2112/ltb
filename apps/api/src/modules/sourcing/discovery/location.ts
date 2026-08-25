import type { SourcingDiscoveryLocationScope } from "@/modules/sourcing/search";
import { includesSourcingSignal, normalizeSourcingText } from "@/modules/sourcing/scoring/signals";
import type { LinkedinDiscoveryResult } from "./types";

export type LocationEligibility =
  | "ELIGIBLE"
  | "NEEDS_VERIFICATION"
  | "INELIGIBLE"
  | "NOT_APPLICABLE";

export type LocationAssessment = {
  eligibility: LocationEligibility;
  evidence?: string;
};

const VIETNAM_SIGNALS = [
  "Vietnam",
  "Viet Nam",
  "Hanoi",
  "Ha Noi",
  "Ho Chi Minh",
  "HCMC",
  "Saigon",
  "Da Nang",
  "Danang",
  "Hai Phong",
  "Can Tho",
  "Hue",
  "Nha Trang",
  "Binh Duong",
  "Dong Nai",
];

const NON_VIETNAM_SIGNALS = [
  "India",
  "Bengaluru",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "New Delhi",
  "Delhi",
  "Chennai",
  "Noida",
  "Gurugram",
  "Gurgaon",
  "Kolkata",
  "Ahmedabad",
  "Karnataka",
  "Telangana",
  "Tamil Nadu",
  "Singapore",
  "Malaysia",
  "Philippines",
  "Indonesia",
  "Thailand",
  "Pakistan",
  "Bangladesh",
  "China",
  "Japan",
  "South Korea",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
];

export function assessLinkedinLocation(
  result: LinkedinDiscoveryResult,
  scope: SourcingDiscoveryLocationScope,
): LocationAssessment {
  if (scope === "GLOBAL") return { eligibility: "NOT_APPLICABLE" };

  const evidence = normalizeSourcingText([
    result.displayName,
    result.headline,
    result.snippet,
  ].filter(Boolean).join(" "));
  const vietnamSignal = firstMatchingSignal(evidence, VIETNAM_SIGNALS);
  const nonVietnamSignal = firstMatchingSignal(evidence, NON_VIETNAM_SIGNALS);

  if (vietnamSignal && !nonVietnamSignal) {
    return { eligibility: "ELIGIBLE", evidence: vietnamSignal };
  }
  if (nonVietnamSignal && !vietnamSignal) {
    return { eligibility: "INELIGIBLE", evidence: nonVietnamSignal };
  }
  return {
    eligibility: "NEEDS_VERIFICATION",
    ...(vietnamSignal && nonVietnamSignal
      ? { evidence: `${vietnamSignal} / ${nonVietnamSignal}` }
      : {}),
  };
}

function firstMatchingSignal(evidence: string, signals: string[]) {
  return signals.find(signal => includesSourcingSignal(evidence, signal));
}
