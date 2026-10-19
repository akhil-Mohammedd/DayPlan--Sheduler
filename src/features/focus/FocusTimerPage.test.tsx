import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ToastProvider } from '../../components/ui';
import { FocusTimerPage } from './FocusTimerPage';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('FocusTimerPage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  const click = (el: Element | null | undefined) => {
    act(() => {
      el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  it('starts a session, shows the countdown, and confirms before resetting', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ToastProvider>
          <FocusTimerPage />
        </ToastProvider>,
      );
    });

    // Idle setup: presets are choices, not actions.
    expect(container.textContent).toContain('New session');
    const preset = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === '45 min',
    );
    expect(preset?.getAttribute('aria-pressed')).toBe('false');
    click(preset);
    expect(
      [...container.querySelectorAll('button')].find(
        (b) => b.textContent === '45 min',
      )?.getAttribute('aria-pressed'),
    ).toBe('true');

    const start = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Start session'),
    );
    await act(async () => {
      start?.click();
    });

    const timer = document.querySelector('[role="timer"]');
    expect(timer).not.toBeNull();
    expect(timer?.getAttribute('aria-label')).toMatch(/minutes.*seconds remaining/);

    // Reset goes through a confirmation, not a browser dialog.
    const reset = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reset'),
    );
    click(reset);
    expect(
      document.querySelector('[role="dialog"]')?.textContent,
    ).toContain('Reset this session?');

    const confirm = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reset session'),
    );
    click(confirm);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="timer"]')).toBeNull();
    expect(container.textContent).toContain('New session');
  });
});
