import { randomBytes } from 'crypto';

/*
 * ULIDs: 26-character, time-ordered, collision-resistant identifiers.
 *
 * Records are created on a device before any server sees them, so their
 * identity cannot come from the database. A ULID sorts by creation time, which
 * keeps "newest first" a plain string sort, and its 80 random bits make two
 * devices minting the same id in the same millisecond vanishingly unlikely.
 * The client mints the same format (src/lib/ulid.ts).
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

export function ulid(now: number = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let random = '';
  for (let i = 0; i < 16; i++) random += ALPHABET[bytes[i] % 32];
  return time + random;
}

export const isUlid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
