import { describe, it, expect } from 'vitest';
import { parseDurationMinutes, totalRecipeMinutes, formatMinutesForSegments } from './duration';

describe('parseDurationMinutes', () => {
  it('reads the schema convention: a bare number of minutes', () => {
    expect(parseDurationMinutes('30')).toBe(30);
    expect(parseDurationMinutes('45')).toBe(45);
  });

  it('strips the literal brackets AI import sometimes leaves in', () => {
    expect(parseDurationMinutes('[50 mins]')).toBe(50);
    expect(parseDurationMinutes('[30]')).toBe(30);
  });

  it('sums compound unit-annotated text', () => {
    expect(parseDurationMinutes('1 hr 30 mins')).toBe(90);
    expect(parseDurationMinutes('2 hours')).toBe(120);
  });

  it('returns null rather than a garbage number for unparseable text', () => {
    expect(parseDurationMinutes('N/A')).toBeNull();
    expect(parseDurationMinutes('overnight')).toBeNull();
    expect(parseDurationMinutes('')).toBeNull();
    expect(parseDurationMinutes(undefined)).toBeNull();
  });
});

describe('totalRecipeMinutes', () => {
  it('sums prep and cook', () => {
    expect(totalRecipeMinutes({ prepTime: '20', cookTime: '45' })).toBe(65);
  });

  it('counts a parseable side even when the other is missing', () => {
    expect(totalRecipeMinutes({ prepTime: '20', cookTime: undefined })).toBe(20);
    expect(totalRecipeMinutes({ prepTime: undefined, cookTime: '45' })).toBe(45);
  });

  it('returns null only when neither side parses', () => {
    expect(totalRecipeMinutes({ prepTime: 'overnight', cookTime: undefined })).toBeNull();
    expect(totalRecipeMinutes({})).toBeNull();
  });
});

describe('formatMinutesForSegments', () => {
  it('stays in minutes under an hour', () => {
    expect(formatMinutesForSegments(45)).toEqual({ value: '45', unit: 'MIN' });
  });

  it('switches to H:MM at an hour and up', () => {
    expect(formatMinutesForSegments(90)).toEqual({ value: '1:30', unit: 'HR' });
    expect(formatMinutesForSegments(60)).toEqual({ value: '1:00', unit: 'HR' });
  });
});
