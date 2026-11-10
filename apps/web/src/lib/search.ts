/**
 * Turns free-text search into an ILIKE pattern that's safe inside a PostgREST
 * filter string: strips characters with meaning in filters or LIKE patterns.
 */
export function toSearchPattern(q: string): string | null {
  const cleaned = q.replace(/[%_\\,()"*.:]/g, " ").trim().replace(/\s+/g, " ");
  return cleaned ? `%${cleaned}%` : null;
}
