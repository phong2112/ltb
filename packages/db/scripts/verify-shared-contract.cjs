const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const shared = require("../../shared/dist/index.js");

const schema = readFileSync(resolve(__dirname, "../prisma/schema.prisma"), "utf8");

const contracts = {
  JobStatus: shared.jobStatuses,
  ApplicationStatus: shared.applicationStatuses,
  CvParseStatus: shared.cvParseStatuses,
  FileKind: shared.fileKinds,
  FileStorageTier: shared.fileStorageTiers,
};

for (const [enumName, sharedValues] of Object.entries(contracts)) {
  assert.deepEqual(readPrismaEnum(enumName), sharedValues, `${enumName} must match @hr-copilot/shared`);
}

function readPrismaEnum(enumName) {
  const match = schema.match(new RegExp(`enum\\s+${enumName}\\s+\\{([\\s\\S]*?)\\}`, "u"));
  assert.ok(match, `Missing Prisma enum ${enumName}`);

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Z_]+$/u.test(line));
}
