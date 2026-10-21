import type { ImgHTMLAttributes } from 'react';
import { usePhotoSrc } from '../../lib/usePhotoSrc';

/*
 * A photograph by reference.
 *
 * Bake-log photographs live on the device as `photo:<id>`, which an <img>
 * cannot draw. This resolves the reference first and draws nothing until it
 * has, so a slow read never flashes a broken-image glyph. A web address passes
 * straight through. For a framed, fixed-size photograph use RecipePlate.
 */
export interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined;
  alt: string;
}

export function Photo({ src: ref, alt, ...rest }: PhotoProps) {
  const src = usePhotoSrc(ref);
  if (!src) return null;
  return <img src={src} alt={alt} {...rest} />;
}
