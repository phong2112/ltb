import { applicationAreas, defaultMaxCvFileSizeMb } from "@hr-copilot/shared";
import type { FormState, Translate } from "../types";

type TranslationKey = Parameters<Translate>[0];

const megabyte = 1024 * 1024;

const applicationAreaLabelKeys = {
  "Hà Nội": "apply.areaHaNoi",
  "Đà Nẵng": "apply.areaDaNang",
  "Hải Phòng": "apply.areaHaiPhong",
  "Quảng Ninh": "apply.areaQuangNinh",
  "TP Hồ Chí Minh": "apply.areaTpHcm",
  Remote: "apply.areaRemote",
} as const satisfies Record<(typeof applicationAreas)[number], TranslationKey>;

const MAX_CV_FILE_SIZE_MB = readMaxCvFileSizeMb(import.meta.env.VITE_MAX_CV_FILE_SIZE_MB);
export const MAX_CV_FILE_SIZE_BYTES = MAX_CV_FILE_SIZE_MB * megabyte;

export const APPLICATION_AREA_OPTIONS = applicationAreas.map((area) => ({
  value: area,
  labelKey: applicationAreaLabelKeys[area],
}));

export const fieldControlClassName =
  "min-h-[42px] w-full rounded-[10px] border bg-white px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_rgba(209,87,126,0.12)] disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-70";

export const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  applicationArea: "",
  note: "",
  agreed: false,
};

function readMaxCvFileSizeMb(value: unknown) {
  const configured = Number(value ?? defaultMaxCvFileSizeMb);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMaxCvFileSizeMb;
}
