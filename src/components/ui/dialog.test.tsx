import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Dialog, Input } from './index';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('Dialog', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('renders outside the scrolling page container', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root?.render(
        <Dialog open onClose={() => undefined} title="New habit">
          <Input aria-label="Habit name" />
        </Dialog>,
      ),
    );

    // The page column animates with a transform, which would trap a
    // `position: fixed` overlay inside it. The dialog must live in <body>.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps focus in an input when the parent rerenders with a new onClose', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const render = (onClose: () => void) =>
      root?.render(
        <Dialog open onClose={onClose} title="New habit">
          <Input autoFocus aria-label="Habit name" />
        </Dialog>,
      );

    act(() => render(() => undefined));

    const input = document.querySelector('input');
    expect(input).not.toBeNull();

    act(() => input?.focus());
    expect(document.activeElement).toBe(input);

    // A new callback identity mimics a parent state update on each keystroke.
    act(() => render(() => undefined));

    expect(document.activeElement).toBe(input);
  });
});
