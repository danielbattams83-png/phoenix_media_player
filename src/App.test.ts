import { describe, expect, it } from 'vitest';
import { formatTime } from './App';

describe('formatTime', () => {
  const cases: Array<[number, string]> = [
    [0, '0:00'],
    [9, '0:09'],
    [60, '1:00'],
    [125.8, '2:05'],
    [-1, '0:00'],
    [Number.NaN, '0:00']
  ];

  it.each(cases)('formats %s seconds as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
