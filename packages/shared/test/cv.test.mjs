import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedCvExtension,
  isAllowedCvMimeType,
  normalizeCvExtension,
  normalizeWorkExperienceDuration,
  API_ROUTES,
  apiPath,
} from "../dist/index.js";

test("normalizes and validates allowed CV extensions", () => {
  assert.equal(normalizeCvExtension(" .PDF "), "pdf");
  assert.equal(isAllowedCvExtension(".docx"), true);
  assert.equal(isAllowedCvExtension("exe"), false);
});

test("validates the supported CV MIME types", () => {
  assert.equal(isAllowedCvMimeType("application/pdf"), true);
  assert.equal(isAllowedCvMimeType("application/octet-stream"), false);
});

test("keeps only complete work-experience durations", () => {
  assert.equal(normalizeWorkExperienceDuration("2021 - Present"), "2021 - Present");
  assert.equal(normalizeWorkExperienceDuration("3.5 years"), "3.5 years");
  assert.equal(normalizeWorkExperienceDuration("2024"), null);
  assert.equal(normalizeWorkExperienceDuration("Started in 2021"), null);
});

test("builds browser paths from the shared API route contract", () => {
  assert.equal(apiPath(API_ROUTES.auth.base, API_ROUTES.auth.login), "/auth/login");
  assert.equal(apiPath("/admin/chat/", API_ROUTES.adminChat.conversations, "id"), "/admin/chat/conversations/id");
});
