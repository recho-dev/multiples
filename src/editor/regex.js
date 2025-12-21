/**
 * Returns a regex pattern for matching numbers that are not part of identifiers.
 *
 * This regex matches standalone numbers (e.g., "4", "-3.14", "42", ".5", "-.5") but excludes
 * numbers that are part of identifiers (e.g., the "4" in "vec4", "2" in "vec2").
 *
 * Uses negative lookbehind and lookahead to ensure the number is not preceded
 * or followed by word characters (letters, digits, or underscores).
 *
 * @param {string} flags - Optional regex flags (default: "g" for global)
 * @returns {RegExp} A regex that matches standalone numbers
 */
export function getNumberRegex(flags = "g") {
  // Match numbers that are not part of identifiers (e.g., not the "4" in "vec4")
  // Supports both regular numbers (5, 5.5) and decimals without leading zero (.5, -.5)
  // Uses negative lookbehind and lookahead to ensure not preceded/followed by word characters
  return new RegExp("(?<![a-zA-Z0-9_])(-?(\\d+\\.?\\d*|\\.\\d+))(?![a-zA-Z0-9_])", flags);
}
