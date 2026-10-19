import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ToastProvider, useToast } from './index';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function Trigger() {
  const { push } = useToast();
  return (
    <button type="button" onClick={() => push('success', 'Task saved.')}>
      Save
    </button>
  );
}

describe('Toast', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('announces a message and leaves the DOM after it is dismissed', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      );
    });

    await act(async () => {
      container?.querySelector('button')?.click();
    });

    const status = document.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Task saved.');

    const dismiss = document.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss notification"]',
    );
    await act(async () => {
      dismiss?.click();
    });

    // The exit beat runs first, then the toast is removed from the document.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});
