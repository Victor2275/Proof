import { ulid } from '../services/ulid.js';

/*
 * The fields every cookbook record carries on the server, matching the device
 * (src/lib/types.ts): an id minted by whoever created the record, so a record
 * made offline has its identity before the server ever sees it; the account it
 * belongs to; and a tombstone, because sync has to tell "deleted" from "never
 * existed". Timestamps come from each schema's `timestamps` option.
 *
 * Records created before Phase 1 had Mongo ObjectIds. scripts/migrate-string-ids.js
 * rewrites them as their hex strings, which is the id the device already holds
 * for them.
 */
export const recordFields = {
  _id: { type: String, default: () => ulid() },
  ownerId: { type: String, default: null, index: true },
  deletedAt: { type: Date, default: null },
};
