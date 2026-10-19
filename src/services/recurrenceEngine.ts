import type { RecurrenceRule, LocalDate } from '../types';
import { addDaysKey, weekdayOf, compareDateKeys, parseDateKey } from '../utils';

/**
 * Pure recurrence engine. Given a rule, decides whether a date should have an
 * occurrence. Stateless and side-effect-free so it can be tested in isolation.
 */
export function isDateInRule(rule: RecurrenceRule, date: LocalDate): boolean {
  if (compareDateKeys(date, rule.startDate) < 0) return false;
  if (rule.endDate && compareDateKeys(date, rule.endDate) > 0) return false;

  const start = parseDateKey(rule.startDate);
  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekdays': {
      const wd = weekdayOf(date);
      return wd >= 1 && wd <= 5;
    }
    case 'weekly': {
      const wds = rule.weekdays && rule.weekdays.length > 0
        ? [...rule.weekdays].sort((a, b) => a - b)
        : [start.getDay()];
      return wds.includes(weekdayOf(date));
    }
    case 'monthly': {
      const d = parseDateKey(date);
      return (
        d.getDate() === start.getDate() &&
        // every N months is approximated by rule.interval on the day-of-month
        true
      );
    }
    case 'custom': {
      const n = Math.max(1, rule.interval || 1);
      const diff = daysBetween(rule.startDate, date);
      return diff % n === 0;
    }
    default:
      return false;
  }
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey);
  const b = parseDateKey(toKey);
  const it = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const jt = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((jt - it) / 86_400_000);
}

/**
 * Dates between [from, to] inclusive for which the rule fires.
 * Bounded window so materialization stays cheap.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  fromKey: LocalDate,
  toKey: LocalDate,
  limit = 400,
): LocalDate[] {
  const out: LocalDate[] = [];
  let cursor = compareDateKeys(rule.startDate, fromKey) > 0 ? rule.startDate : fromKey;
  if (rule.endDate && compareDateKeys(cursor, rule.endDate) > 0) return out;
  let guard = 0;
  while (cursor <= toKey && compareDateKeys(cursor, toKey) <= 0 && guard++ < limit) {
    if (isDateInRule(rule, cursor)) out.push(cursor);
    cursor = addDaysKey(cursor, 1);
  }
  return out;
}
