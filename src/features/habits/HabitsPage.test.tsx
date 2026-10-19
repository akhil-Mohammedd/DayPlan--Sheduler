import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HabitsPage } from './HabitsPage';
import { ToastProvider } from '../../components/ui';

describe('HabitsPage', () => {
  it('renders without throwing (regression: blank page on /habits)', () => {
    const html = renderToString(
      <ToastProvider>
        <HabitsPage />
      </ToastProvider>,
    );
    // Assert on the rendered text: button labels are split into per-letter
    // spans, so the raw markup no longer contains whole words.
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain('Habits');
    expect(text).toContain('New habit');
  });
});
