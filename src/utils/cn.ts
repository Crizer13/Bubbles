/**
 * Utility for conditionally joining class names.
 * Simple inline implementation — no external dependencies needed.
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}