import { CronExpression, parse } from "./parse";

/**
 * All schedule matching/computation in this module uses UTC exclusively
 * (Date#getUTC* accessors). Cron expressions carry no timezone information
 * of their own; if you need local-time semantics, convert your `from` date
 * and interpret results as UTC, or shift the expression's hour field
 * yourself. See README "Timezone / DST" for the full note.
 */

function toCron(exprOrCron: string | CronExpression): CronExpression {
  return typeof exprOrCron === "string" ? parse(exprOrCron) : exprOrCron;
}

/** True if `date` (interpreted in UTC) satisfies `cron`. Day-of-month/day-of-week use standard cron OR-when-both-restricted semantics. */
export function matches(date: Date, exprOrCron: string | CronExpression): boolean {
  const cron = toCron(exprOrCron);

  if (!cron.minute.values.has(date.getUTCMinutes())) return false;
  if (!cron.hour.values.has(date.getUTCHours())) return false;
  if (!cron.month.values.has(date.getUTCMonth() + 1)) return false;

  const domMatch = cron.dayOfMonth.values.has(date.getUTCDate());
  const dowMatch = cron.dayOfWeek.values.has(date.getUTCDay());

  if (cron.dayOfMonth.isWildcard && cron.dayOfWeek.isWildcard) return true;
  if (cron.dayOfMonth.isWildcard) return dowMatch;
  if (cron.dayOfWeek.isWildcard) return domMatch;
  return domMatch || dowMatch;
}

/** Search bound for nextRun/nextN: ~4 years of minutes, so an unsatisfiable expression (e.g. Feb 30) fails fast instead of looping forever. */
const MAX_SEARCH_MINUTES = 60 * 24 * 366 * 4;

/**
 * Returns the next UTC instant (minute resolution, seconds/ms zeroed) that
 * satisfies `expr`, strictly after `from` (default: now). Steps minute by
 * minute within a bounded ~4-year search window — documented brute force,
 * not full field-arithmetic stepping, but bounded and fast for any
 * satisfiable expression.
 */
export function nextRun(exprOrCron: string | CronExpression, from: Date = new Date()): Date {
  const cron = toCron(exprOrCron);

  let candidate = new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
    from.getUTCHours(),
    from.getUTCMinutes() + 1,
    0,
    0
  ));

  for (let i = 0; i < MAX_SEARCH_MINUTES; i++) {
    if (matches(candidate, cron)) return candidate;
    candidate = new Date(candidate.getTime() + 60_000);
  }

  throw new Error(`cron-expression-parser: no matching run found within the search bound for "${cron.raw}"`);
}

/** Returns the next `n` matching UTC instants after `from`, in order. */
export function nextN(exprOrCron: string | CronExpression, n: number, from: Date = new Date()): Date[] {
  const cron = toCron(exprOrCron);
  const results: Date[] = [];
  let cursor = from;
  for (let i = 0; i < n; i++) {
    const r = nextRun(cron, cursor);
    results.push(r);
    cursor = r;
  }
  return results;
}
