import { describe, expect, it } from 'vitest';
import {
  oppositeTheme,
  resolvedTheme,
  toggleTheme,
  THEME_CHOICES,
} from './settingsService';

describe('resolvedTheme', () => {
  it('pins a system preference to the operating system side', () => {
    expect(resolvedTheme('system', true)).toBe('dark');
    expect(resolvedTheme('system', false)).toBe('light');
  });

  it('keeps an explicit choice whatever the operating system says', () => {
    expect(resolvedTheme('light', true)).toBe('light');
    expect(resolvedTheme('dark', false)).toBe('dark');
  });

  it('resolves every choice the settings menu offers', () => {
    for (const choice of THEME_CHOICES) {
      for (const prefersDark of [true, false]) {
        expect(['light', 'dark']).toContain(resolvedTheme(choice, prefersDark));
      }
    }
  });
});

describe('oppositeTheme', () => {
  it('returns the other side', () => {
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('dark')).toBe('light');
  });
});

describe('toggleTheme', () => {
  it('flips away from what is on screen', () => {
    expect(toggleTheme('light', false)).toBe('dark');
    expect(toggleTheme('dark', true)).toBe('light');
  });

  it('lands on a concrete side from system instead of cycling into a third state', () => {
    expect(toggleTheme('system', true)).toBe('light');
    expect(toggleTheme('system', false)).toBe('dark');
  });
});
