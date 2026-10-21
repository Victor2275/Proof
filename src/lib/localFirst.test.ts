import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ulid, isUlid } from './ulid';
import { fitWithin, compressImage, MAX_EDGE } from './image';
import { formatAmount, formatIngredient, scaledQuantity } from './ingredients';
import { ensurePersistentStorage, formatBytes, resetPersistenceRequest, storageReport } from './storage';
import { aiAllowanceLine, setAccount, setOperatorToken, useOwnership, usePlan, useSession } from './session';
import { makeRecipe } from '../test/utils';
import type { PublishedRecipe } from './types';

describe('ulid', () => {
  it('is 26 Crockford characters and sorts by creation time', () => {
    const a = ulid(1_700_000_000_000);
    const b = ulid(1_700_000_000_001);
    expect(isUlid(a)).toBe(true);
    expect(a < b).toBe(true);
    expect(isUlid('not-a-ulid')).toBe(false);
    expect(isUlid('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toBe(false); // I is not Crockford
  });

  it('does not repeat itself within a millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => ulid(1_700_000_000_000)));
    expect(ids.size).toBe(1000);
  });
});

describe('image compression', () => {
  it('fits the long edge inside the limit and never enlarges', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_EDGE, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_EDGE });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('keeps the photograph as it came when there is no decoder to shrink it with', async () => {
    const input = new Blob(['x'], { type: 'image/jpeg' });
    expect((await compressImage(input)).blob).toBe(input);
  });
});

describe('ingredient amounts', () => {
  it('prints an amount, a bare count, or nothing at all', () => {
    expect(formatAmount({ quantity: 2, unit: 'tbsp' })).toBe('2 tbsp');
    expect(formatAmount({ quantity: 3, unit: '' })).toBe('3');
    expect(formatAmount({ quantity: null, unit: 'to serve' })).toBe('');
    expect(formatIngredient({ name: 'Salt, to taste', quantity: null, unit: '' })).toBe('Salt, to taste');
    expect(formatIngredient({ name: 'Eggs', quantity: 2, unit: '' }, 1.5)).toBe('3 Eggs');
  });

  it('rounds a scaled quantity for reading', () => {
    expect(scaledQuantity(2, 1 / 3)).toBe(0.67);
    expect(scaledQuantity(Number.NaN)).toBeNull();
  });
});

describe('storage', () => {
  afterEach(() => {
    resetPersistenceRequest();
    vi.unstubAllGlobals();
  });

  it('asks the browser to keep the cookbook, once per session', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(false), persist } });
    await ensurePersistentStorage();
    await ensurePersistentStorage();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('reports unknowns as unknown rather than zero', async () => {
    vi.stubGlobal('navigator', {});
    expect(await storageReport()).toEqual({ persisted: null, usage: null, quota: null });
  });

  it('formats sizes without false precision', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(340 * 1024)).toBe('340 KB');
    expect(formatBytes(1.25 * 1024 * 1024)).toBe('1.3 MB');
  });
});

describe('session, ownership and plan', () => {
  afterEach(() => setOperatorToken(null));

  it('follows the operator token as it is set and cleared', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.session.isOperator).toBe(false);
    act(() => setOperatorToken('t'));
    expect(result.current.session.isOperator).toBe(true);
    act(() => result.current.signOutOperator());
    expect(result.current.session.isOperator).toBe(false);
  });

  it("calls a record in this device's cookbook mine, and a shared one someone else's", () => {
    const local = renderHook(() => useOwnership(makeRecipe())).result.current;
    expect(local).toEqual({ isMine: true, isFork: false, canEdit: true, isAuthor: false });

    const fork = makeRecipe({ forkedFrom: { publishedId: 'p', slug: 's', authorHandle: 'a', title: 't' } });
    expect(renderHook(() => useOwnership(fork)).result.current.isFork).toBe(true);

    const shared = { _id: 'p', slug: 's' } as PublishedRecipe;
    expect(renderHook(() => useOwnership(shared)).result.current.isMine).toBe(false);
  });

  it('opens the AI to the operator only, until accounts carry a quota', () => {
    const { result } = renderHook(() => usePlan());
    expect(result.current.can('ai')).toBe(false);
    act(() => setOperatorToken('t'));
    expect(result.current.can('ai')).toBe(true);
    expect(result.current.can('sync')).toBe(false);
  });
});

describe('bake photographs', () => {
  it('reads the labelled list first, and the bare list when that is all a bake has', async () => {
    const { bakePhotoUrls } = await import('./bakePhotos');
    expect(bakePhotoUrls({ images: [{ url: 'a', label: 'Crumb' }], imageUrls: [] })).toEqual(['a']);
    expect(bakePhotoUrls({ images: [], imageUrls: ['b', 'c'] })).toEqual(['b', 'c']);
    expect(bakePhotoUrls({ imageUrls: [] })).toEqual([]);
  });
});

describe('accounts on the device', () => {
  afterEach(() => setAccount(null));

  const ADA = {
    id: 'u1', email: 'ada@example.com', handle: 'ada', displayName: 'Ada', bio: '', emailVerified: true,
    plan: 'free' as const, pro: false, joinedAt: '2026-10-01', planExpiresAt: null,
    ai: { used: 2, limit: 5, period: '2026-10' },
  };

  it('knows who is signed in with no network, and forgets on sign-out', () => {
    const { result } = renderHook(() => useSession());
    act(() => setAccount('token', ADA));
    expect(result.current.session.user?.handle).toBe('ada');
    act(() => setAccount(null));
    expect(result.current.session.user).toBeNull();
  });

  it('opens the AI and publishing to a confirmed account only', () => {
    const { result } = renderHook(() => usePlan());
    act(() => setAccount('token', { ...ADA, emailVerified: false }));
    expect(result.current.can('ai')).toBe(false);
    expect(result.current.can('publish')).toBe(false);
    act(() => setAccount('token', ADA));
    expect(result.current.can('ai')).toBe(true);
    expect(result.current.can('publish')).toBe(true);
  });

  it("says what is left of the month's AI", () => {
    expect(aiAllowanceLine(ADA)).toBe('3 of 5 left this month');
    expect(aiAllowanceLine({ ...ADA, ai: { used: 9, limit: 5, period: '2026-10' } })).toBe('0 of 5 left this month');
    expect(aiAllowanceLine({ ...ADA, emailVerified: false })).toBeNull();
  });

  it("calls a shared recipe the signed-in author's own", () => {
    act(() => setAccount('token', ADA));
    const shared = { _id: 'p', slug: 's', authorHandle: 'ada' } as PublishedRecipe;
    expect(renderHook(() => useOwnership(shared)).result.current.isAuthor).toBe(true);
  });
});
