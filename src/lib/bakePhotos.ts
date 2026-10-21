import type { BakeLog } from './types';

/*
 * A bake's photographs, in order.
 *
 * A bake log carries its photographs twice: `images`, labelled ("Dough",
 * "Crumb"), and `imageUrls`, the bare list. The repository keeps the two in
 * step, but bakes logged before Phase 1 sometimes filled only one of them, so
 * a surface that read just `imageUrls` drew a photographed bake as if it had
 * no photograph at all. Every surface asks here instead.
 */
export function bakePhotoUrls(log: Pick<BakeLog, 'images' | 'imageUrls'>): string[] {
  const labelled = (log.images ?? []).map((img) => img.url).filter(Boolean);
  return labelled.length > 0 ? labelled : (log.imageUrls ?? []).filter(Boolean);
}
