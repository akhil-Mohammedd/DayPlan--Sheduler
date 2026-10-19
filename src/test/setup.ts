import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { db } from '../database/db';

// Each test gets a pristine database so files/runs never clash on IndexedDB versions.
beforeEach(async () => {
  await db.delete();
  await db.open();
});

/** deterministic crypto.randomUUID is available in Node 19+; polyfill for older */
if (typeof globalThis.crypto === 'undefined' || !('randomUUID' in globalThis.crypto)) {
  // minimal fallback
  (globalThis as Record<string, unknown>).crypto = {
    randomUUID: () =>
      'tf-' + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('-'),
  };
}
