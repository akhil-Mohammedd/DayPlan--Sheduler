export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatMinutes(min: number): string {
  if (min <= 0) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

/** "HH:mm" -> minutes since midnight, null-safe */
export function timeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const parts = time.split(':').map(Number);
  const h = parts[0] ?? NaN;
  const m = parts[1] ?? 0;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12(time?: string | null): string {
  const min = timeToMinutes(time);
  if (min == null) return '';
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDateKey = (key: string): Date => {
  const parts = key.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
};

export function addDaysKey(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

export function weekdayOf(key: string): number {
  return parseDateKey(key).getDay();
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function clampHour(v: number, lo = 0, hi = 23): number {
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

export function friendlyDate(key: string | null | undefined): string {
  if (!key) return 'Someday';
  const today = todayKey();
  if (key === today) return 'Today';
  const next = addDaysKey(today, 1);
  if (key === next) return 'Tomorrow';
  const d = parseDateKey(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}
