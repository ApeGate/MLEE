const BLOCKED_TERMS = [
  "bitch",
  "chink",
  "coon",
  "cunt",
  "fag",
  "faggot",
  "fuck",
  "hitler",
  "kike",
  "nazi",
  "nigga",
  "nigger",
  "pussy",
  "rape",
  "retard",
  "shit",
  "spic",
] as const;

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[!1|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[@4]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/0/g, "o")
    .replace(/[^a-z]/g, "");
}

export function isBrandSafeLaunchLabel(...values: string[]) {
  const normalized = normalizeLabel(values.join(" "));
  return !BLOCKED_TERMS.some((term) => normalized.includes(term));
}
