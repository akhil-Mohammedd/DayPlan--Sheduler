import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotFoundPage } from './NotFoundPage';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotFoundPage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('names the missing address and offers real destinations', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const onNavigate = vi.fn();

    act(() =>
      root?.render(<NotFoundPage path="#reports" onNavigate={onNavigate} />),
    );

    expect(container.textContent).toContain('404');
    expect(container.textContent).toContain('This page does not exist');
    expect(container.textContent).toContain('#reports');

    const goHome = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Go to today'),
    );
    act(() => goHome?.click());
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });
});
