import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ToastProvider } from '../../components/ui';
import { DashboardPage } from './DashboardPage';
import { createTask } from '../../services/taskService';
import { todayKey } from '../../utils';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardPage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('renders today’s ledger with timetable blocks and the habit panel', async () => {
    await createTask({
      title: 'Review the draft',
      scheduledDate: todayKey(),
      startTime: '09:00',
      durationMinutes: 45,
      priority: 'high',
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>,
      );
    });
    // Let Dexie live queries settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Today');
    expect(container.textContent).toContain('Habits today');
    expect(container.textContent).toContain('Next days');
    expect(container.textContent).toContain('Review the draft');
    // The timetable draws a block for the timed task.
    expect(container.querySelector('[title="Review the draft, 9 AM"]')).not.toBeNull();
  });
});
