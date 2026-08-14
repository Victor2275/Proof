import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function ProblemChild() {
  throw new Error('Test crash in child component');
  return <div>Normal Content</div>;
}

describe('ErrorBoundary Component', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    // Suppress console.error from error boundary test logs
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>All is well</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('All is well')).toBeDefined();
  });

  it('renders fallback error UI when a child component throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeDefined();
    expect(screen.getByText(/Test crash in child component/)).toBeDefined();
    expect(screen.getByText('Go Home')).toBeDefined();
  });
});
