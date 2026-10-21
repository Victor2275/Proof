import { useEffect, useState } from 'react';
import { getPhotoBlob, isPhotoRef } from './repo/photos';

/*
 * Turns a photograph reference into something an <img> can draw.
 *
 * A web address is returned as it is. A `photo:<id>` reference is read from
 * the device's photo store and handed out as an object URL. Object URLs are
 * shared and counted, so a cover photograph drawn by forty tiles is read once,
 * and released when the last of them unmounts.
 */

interface Entry {
  url: Promise<string | undefined>;
  resolved?: string;
  count: number;
}

const entries = new Map<string, Entry>();

function acquire(ref: string): Entry {
  let entry = entries.get(ref);
  if (!entry) {
    const created: Entry = {
      count: 0,
      url: getPhotoBlob(ref)
        .then((blob) => {
          if (!blob || typeof URL.createObjectURL !== 'function') return undefined;
          created.resolved = URL.createObjectURL(blob);
          return created.resolved;
        })
        .catch(() => undefined),
    };
    entry = created;
    entries.set(ref, entry);
  }
  entry.count++;
  return entry;
}

function release(ref: string) {
  const entry = entries.get(ref);
  if (!entry) return;
  entry.count--;
  if (entry.count > 0) return;
  entries.delete(ref);
  void entry.url.then((url) => {
    if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  });
}

/** Resolves a reference to a drawable src. A device photo is undefined until it has been read. */
export function usePhotoSrc(ref: string | undefined): string | undefined {
  const local = isPhotoRef(ref);
  const [src, setSrc] = useState<string | undefined>(() =>
    local ? entries.get(ref!)?.resolved : ref,
  );

  useEffect(() => {
    if (!local || !ref) {
      setSrc(ref);
      return;
    }
    let live = true;
    const entry = acquire(ref);
    void entry.url.then((url) => {
      if (live) setSrc(url);
    });
    return () => {
      live = false;
      release(ref);
    };
  }, [ref, local]);

  return src;
}
