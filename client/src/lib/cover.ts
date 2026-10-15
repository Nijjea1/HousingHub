/** What a listing without photos shows instead: its street name on one of five muted tones. */

export const TONES = ['bg-tone-1', 'bg-tone-2', 'bg-tone-3', 'bg-tone-4', 'bg-tone-5'] as const;

/** "Unit 2, 45 Sterling St" and "45A Sterling St" both become "Sterling St". */
export function streetName(address: string): string {
  const street = address.split(',').pop()!.trim();
  const withoutNumber = street.replace(/^(unit|apt|suite)?\s*#?[\d-]+[a-z]?\s+/i, '').trim();
  return withoutNumber || street || address;
}

/** The same listing always gets the same tone, so a house looks the same on every page. */
export function toneFor(id: string): (typeof TONES)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}
