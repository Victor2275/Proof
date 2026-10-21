import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { putMany, type RecordStore } from '../lib/repo/db';
import type { BakeLog, Note, PantryItem, Recipe } from '../lib/types';

/*
 * Test helpers for screens that read the cookbook.
 *
 * Tests seed the device database directly and render the screen against the
 * real repository (setupTests gives each test an empty in-memory IndexedDB).
 */

const STAMP = '2026-08-01T12:00:00.000Z';
const record = { createdAt: STAMP, updatedAt: STAMP, deletedAt: null };

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    _id: 'r1',
    title: 'Country Sourdough',
    description: '',
    imageUrls: [],
    servings: 2,
    difficulty: 'Medium',
    prepTime: '',
    cookTime: '',
    tags: [],
    ingredients: [],
    instructions: [],
    instructionLinks: [],
    labNotes: '',
    folder: 'Uncategorized',
    ...record,
    ...overrides,
  };
}

export function makeBakeLog(overrides: Partial<BakeLog> = {}): BakeLog {
  return {
    _id: 'b1',
    recipeId: 'r1',
    date: STAMP,
    notes: '',
    images: [],
    imageUrls: [],
    isPersonalBest: false,
    ...record,
    ...overrides,
  };
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return { _id: 'n1', title: 'Note', content: '', ...record, ...overrides };
}

export function makePantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return { _id: 'p1', name: 'Flour', ...record, ...overrides };
}

/** Writes records straight into the device database. */
export async function seed(store: RecordStore, rows: unknown[]) {
  await putMany(store, rows);
}

export const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

/**
 * Renders a screen with a fresh QueryClient and a router. With `path`, the
 * screen is mounted on that route pattern so it can read its params.
 */
export function renderScreen(ui: ReactElement, { route = '/', path }: { route?: string; path?: string } = {}) {
  const client = testQueryClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}
