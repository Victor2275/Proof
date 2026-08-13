// src/setupTests.ts
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});
