import { describe, expect, it } from 'vitest';
import { answer, REVIEW_ACCOUNT, type ReviewServer } from './api.ts';

const server: ReviewServer = {
  shared: [
    { _id: 'pub-1', slug: 'country-loaf', title: 'Country loaf', featured: true },
    { _id: 'pub-2', slug: 'focaccia', title: 'Focaccia', featured: false },
    { _id: 'pub-3', slug: 'babka', title: 'Babka', featured: true },
  ],
  extracted: { title: 'Imported scones' },
};

const ask = (method: string, path: string, authorized = false) =>
  answer(method, new URL(`http://localhost:3001/api${path}`), authorized, server);

describe('the review server', () => {
  it('pages the shared cookbook and filters it to featured', () => {
    expect(ask('GET', '/published?limit=2')).toEqual({
      status: 200,
      body: { items: server.shared.slice(0, 2), total: 3, offset: 0, limit: 2 },
    });
    const featured = ask('GET', '/published?featured=1')!.body as { items: { slug: string }[] };
    expect(featured.items.map((p) => p.slug)).toEqual(['country-loaf', 'babka']);
  });

  it('answers the index Discover searches, which the last audit left unanswered', () => {
    expect(ask('GET', '/published/index')).toEqual({ status: 200, body: { items: server.shared } });
  });

  it('opens a shared recipe by slug or id, and says when one is not there', () => {
    expect(ask('GET', '/published/focaccia')!.body).toMatchObject({ _id: 'pub-2' });
    expect(ask('GET', '/published/pub-3')!.body).toMatchObject({ slug: 'babka' });
    expect(ask('GET', '/published/missing')!.status).toBe(404);
  });

  it('signs a reviewer up, then knows them only with the token', () => {
    const signed = ask('POST', '/auth/signup')!.body as { token: string; user: unknown };
    expect(signed.user).toEqual(REVIEW_ACCOUNT);
    expect(ask('GET', '/auth/me')!.status).toBe(401);
    expect(ask('GET', '/auth/me', true)).toEqual({ status: 200, body: REVIEW_ACCOUNT });
  });

  it('hands an import its recipe', () => {
    expect(ask('POST', '/extract')!.body).toEqual({ title: 'Imported scones' });
    expect(ask('POST', '/ai-restructure')!.body).toEqual({ title: 'Imported scones' });
  });

  it('stands in for publishing with a named refusal, not silence', () => {
    expect(ask('POST', '/published')!.status).toBe(401);
    expect(ask('POST', '/published', true)!.status).toBe(503);
  });

  it('returns nothing for an endpoint it does not know, so the caller can log it', () => {
    expect(ask('GET', '/library')).toBeNull();
    expect(ask('DELETE', '/published/pub-1')).toBeNull();
  });
});
