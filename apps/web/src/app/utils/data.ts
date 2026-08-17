/**
 * Safely coerces an unknown API value to a string.
 * Returns the value as-is when it is already a string, otherwise returns an empty string.
 * Useful for optional JSON fields that should render as text in the UI.
 */
export function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Safely coerces an unknown API value to a string array.
 * Returns only the string elements when the value is an array, otherwise returns an empty array.
 * Useful for optional JSON array fields in API responses.
 */
export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
