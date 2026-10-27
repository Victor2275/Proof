import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePhotoSrc } from './usePhotoSrc';
import { putOne } from './repo/db';
import { PHOTOS_ARRIVED } from './repo/photos';

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:rye');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
});

describe('usePhotoSrc', () => {
  it('passes a web address through', () => {
    expect(renderHook(() => usePhotoSrc('https://example.com/rye.jpg')).result.current).toBe('https://example.com/rye.jpg');
  });

  it('draws a photograph sync brings down after the tile asked for it', async () => {
    const { result } = renderHook(() => usePhotoSrc('photo:p1'));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBeUndefined();

    await putOne('photos', { _id: 'p1', blob: new Blob(['x'], { type: 'image/webp' }), type: 'image/webp', bytes: 1, createdAt: '' });
    act(() => {
      window.dispatchEvent(new CustomEvent(PHOTOS_ARRIVED, { detail: ['photo:p1'] }));
    });
    await waitFor(() => expect(result.current).toBe('blob:rye'));
  });
});
