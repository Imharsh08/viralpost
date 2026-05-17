/**
 * Abbreviate large counts for compact UI display:
 *   1500000 -> "1.5M"
 *   1200    -> "1.2K"
 *   999     -> "999"
 *   1000    -> "1K"  (no trailing ".0")
 *   0       -> "0"
 *   null    -> "0"   (defensive: RPC numeric/bigint fields can come back null
 *                    or as strings; we coerce safely)
 *
 * Used everywhere user-facing counts appear (likes, comments, views, shares,
 * followers, points, etc.) so the whole app reads consistently on mobile.
 */
export function formatCount(input: number | string | null | undefined): string {
  const n = typeof input === 'number' ? input : input == null ? 0 : Number(input);
  if (!Number.isFinite(n)) return '0';

  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));

  // Tier configuration: each tier picks its divisor + suffix.
  // We trim trailing ".0" so "1000 -> 1K" not "1.0K".
  let value: number;
  let suffix: string;
  if (abs >= 1_000_000_000) { value = n / 1_000_000_000; suffix = 'B'; }
  else if (abs >= 1_000_000) { value = n / 1_000_000; suffix = 'M'; }
  else { value = n / 1_000; suffix = 'K'; }

  // 1 decimal place, but drop it if it'd be a trailing zero.
  const rounded = Math.round(value * 10) / 10;
  const str = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${str}${suffix}`;
}
