import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithTimers } from './timerParser';

describe('timerParser', () => {
  it('does not alter text without times', () => {
    const { container } = render(renderWithTimers("Mix dough thoroughly"));
    expect(container.textContent).toBe("Mix dough thoroughly");
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('detects "minutes" and renders a button', () => {
    render(renderWithTimers("Bake for 30 minutes."));
    const btn = screen.getByRole('button', { name: /30 minutes/i });
    expect(btn).toBeDefined();
  });

  it('detects "hours" and renders a button', () => {
    render(renderWithTimers("Rest 1.5 hours"));
    const btn = screen.getByRole('button', { name: /1.5 hours/i });
    expect(btn).toBeDefined();
  });

  it('detects "seconds" and renders a button', () => {
    render(renderWithTimers("Knead for 45 seconds."));
    const btn = screen.getByRole('button', { name: /45 seconds/i });
    expect(btn).toBeDefined();
  });

  it('detects short forms (m, h, s)', () => {
    render(renderWithTimers("2h 30m 45s"));
    expect(screen.getByRole('button', { name: /2h/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /30m/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /45s/i })).toBeDefined();
  });

  it('dispatches custom event on click with correct seconds (minutes)', () => {
    render(renderWithTimers("10 minutes"));
    const spy = vi.spyOn(window, 'dispatchEvent');
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(spy).toHaveBeenCalled();
    const eventArg = spy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.type).toBe('add-timer');
    expect(eventArg.detail.durationSecs).toBe(600);
  });

  it('dispatches custom event on click with correct seconds (hours)', () => {
    render(renderWithTimers("2 hours"));
    const spy = vi.spyOn(window, 'dispatchEvent');
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    const eventArg = spy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.detail.durationSecs).toBe(7200);
  });

  it('handles multiple times in same string', () => {
    render(renderWithTimers("Bake 20 mins, turn, bake 10 mins"));
    const btns = screen.getAllByRole('button');
    expect(btns).toHaveLength(2);
  });

  it('is case insensitive', () => {
    render(renderWithTimers("BAKE 5 MINS and 2 HOURS"));
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('passes the provided title to the event detail', () => {
    render(renderWithTimers("5 mins", "Step 3"));
    const spy = vi.spyOn(window, 'dispatchEvent');
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    const eventArg = spy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.detail.name).toBe("Step 3 (5 mins)");
  });
});
