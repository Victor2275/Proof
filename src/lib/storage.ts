/*
 * Keeping the cookbook on the device.
 *
 * Browsers evict storage from sites they consider unimportant when space runs
 * low. A cookbook that lives only on the device cannot afford that, so the
 * first write asks for persistent storage, and Settings reports how much room
 * the cookbook is using.
 */

/** How the cookbook's home is described wherever it comes up (decision B17): honest, not alarming. */
export const STORED_ON_DEVICE = 'Stored on this device. Export any time; an account adds backup.';

export interface StorageReport {
  /** Whether the browser has promised not to evict the cookbook. null when it can't say. */
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}

let asked = false;

/** Asks once per session, on the first write. A refusal is not an error; it is reported in Settings. */
export async function ensurePersistentStorage(): Promise<void> {
  if (asked) return;
  asked = true;
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return;
    await navigator.storage?.persist?.();
  } catch {
    // Some browsers throw instead of answering; Settings reports the state.
  }
}

/** For tests. */
export function resetPersistenceRequest() {
  asked = false;
}

export async function storageReport(): Promise<StorageReport> {
  const report: StorageReport = { persisted: null, usage: null, quota: null };
  try {
    if (navigator.storage?.persisted) report.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      report.usage = estimate.usage ?? null;
      report.quota = estimate.quota ?? null;
    }
  } catch {
    // Leave the unknowns as unknown rather than reporting zero.
  }
  return report;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** "1.2 MB", "340 KB": tabular, no false precision. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
