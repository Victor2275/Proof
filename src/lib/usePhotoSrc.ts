import { useEffect, useState } from 'react';
import { getPhotoBlob, isPhotoRef, PHOTOS_ARRIVED } from './repo/photos';

/*
 * Turns a photograph reference into something an <img> can draw.
 *
 * A web address is returned as it is. A `photo:<id>` reference is read from
 * the device's photo store and handed out as an object URL. Object URLs are
 * shared and counted, so a cover photograph drawn by forty tiles is read once,
 * and released when the last of them unmounts. A photograph not on the device
 * yet is read again when sync brings it down (PHOTOS_ARRIVED).
 */

interface Entry {
  url: Promise<string | undefined>;
  resolved?: string;
  count: number;
}

const entries = new Map<string, Entry>();

function read(ref: string, entry: Entry) {
  entry.url = getPhotoBlob(ref)
    .then((blob) => {
      if (!blob || typeof URL.createObjectURL !== 'function') return undefined;
      entry.resolved = URL.createObjectURL(blob);
      return entry.resolved;
    })
    .catch(() => undefined);
}

function acquire(ref: string): Entry {
  let entry = entries.get(ref);
  if (!entry) {
    const created: Entry = { count: 0, url: Promise.resolve(undefined) };
    read(ref, created);
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
  const [arrivals, setArrivals] = useState(0);

  // Missing here, and sync has just brought it: read it again, in place, so
  // every tile sharing the entry keeps its count.
  useEffect(() => {
    if (!local || !ref || src) return;
    const onArrived = (e: Event) => {
      if (!(e as CustomEvent<string[]>).detail?.includes(ref)) return;
      const entry = entries.get(ref);
      if (entry && !entry.resolved) read(ref, entry);
      setArrivals((n) => n + 1);
    };
    window.addEventListener(PHOTOS_ARRIVED, onArrived);
    return () => window.removeEventListener(PHOTOS_ARRIVED, onArrived);
  }, [ref, local, src]);

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
  }, [ref, local, arrivals]);

  return src;
}
