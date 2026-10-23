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

/*
 * Monotonic within a millisecond: two records made in the same millisecond
 * (a recipe's missing ingredients added to Shop at once) get ids that sort in
 * the order they were made, by incrementing the last random part rather than
 * drawing a fresh one. Lists that tie on `createdAt` break the tie by `_id`.
 */
let lastTime = -1;
let lastRandom: number[] = [];

function freshRandom(): number[] {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b % 32);
}

/** The next value of a base32 digit string; null on the (80-bit) overflow. */
function increment(digits: number[]): number[] | null {
  const next = [...digits];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i] < 31) {
      next[i]++;
      return next;
    }
    next[i] = 0;
  }
  return null;
}

export function ulid(now: number = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const random = (now === lastTime && increment(lastRandom)) || freshRandom();
  lastTime = now;
  lastRandom = random;
  return time + random.map((d) => ALPHABET[d]).join('');
}

export const isUlid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
