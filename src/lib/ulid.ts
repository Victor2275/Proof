/*
 * ULIDs: 26-character, time-ordered, collision-resistant identifiers.
 *
 * A record created on this device needs an identity before any server sees it
 * (LAUNCH_PLAN.md, Phase 1). A ULID sorts by creation time, so "newest first"
 * stays a string sort, and its 80 random bits make a collision between two
 * devices minting in the same millisecond vanishingly unlikely. The server
 * mints the same format (server/services/ulid.ts).
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

export function ulid(now: number = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let random = '';
  for (let i = 0; i < 16; i++) random += ALPHABET[bytes[i] % 32];
  return time + random;
}

export const isUlid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
