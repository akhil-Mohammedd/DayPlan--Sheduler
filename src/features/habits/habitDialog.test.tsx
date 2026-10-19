import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ToastProvider } from '../../components/ui';
import { HabitsPage } from './HabitsPage';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('New habit dialog', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('opens over the whole app instead of inside the scrolling page column', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ToastProvider>
          <HabitsPage />
        </ToastProvider>,
      );
    });

    const trigger = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('New habit'),
    );
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // The page column animates with a transform; a fixed overlay inside it
    // would be clipped to the content column.
    expect(container.contains(dialog)).toBe(false);

    const overlay = dialog?.parentElement;
    expect(overlay?.className).toContain('fixed');
    expect(overlay?.className).toContain('inset-0');
    expect(document.body.style.overflow).toBe('hidden');

    const close = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.getAttribute('aria-label') === 'Close',
    );
    await act(async () => {
      close?.click();
    });

    // Closing plays a short exit beat before the overlay leaves the DOM.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
