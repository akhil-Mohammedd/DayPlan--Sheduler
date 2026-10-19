import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell } from './AppShell';
import type { ResolvedTheme } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** The header and rail render the same control, so both carry the same name. */
function themeButtons(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')].filter((button) =>
    button.getAttribute('aria-label')?.startsWith('Switch to'),
  );
}

describe('AppShell theme toggle', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  function render(theme: ResolvedTheme) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const onToggleTheme = vi.fn();

    act(() =>
      root?.render(
        <AppShell
          route="dashboard"
          onNavigate={() => {}}
          onOpenSearch={() => {}}
          onQuickAdd={() => {}}
          theme={theme}
          onToggleTheme={onToggleTheme}
        >
          <p>Content</p>
        </AppShell>,
      ),
    );

    return { onToggleTheme };
  }

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    document.documentElement.classList.remove('dark');
  });

  it('offers only the opposite side, never a system state', () => {
    render('light');

    const buttons = themeButtons(container!);
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    }
    expect(container!.textContent?.toLowerCase()).not.toContain('system');
  });

  it('names light when the screen is dark', () => {
    render('dark');

    for (const button of themeButtons(container!)) {
      expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    }
  });

  it('calls back once per press', () => {
    const { onToggleTheme } = render('light');

    const [first] = themeButtons(container!);
    act(() => first?.click());

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
