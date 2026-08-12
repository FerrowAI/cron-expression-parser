import { CronParseError } from "./errors";

export interface FieldSpec {
  /** The resolved set of allowed values for this field. */
  values: Set<number>;
  /** True if the original field text was the literal wildcard "*" (drives day-of-month/day-of-week OR semantics). */
  isWildcard: boolean;
  /** The original field text, as written in the expression. */
  raw: string;
}

export interface CronExpression {
  minute: FieldSpec;
  hour: FieldSpec;
  dayOfMonth: FieldSpec;
  month: FieldSpec;
  dayOfWeek: FieldSpec;
  raw: string;
}

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

export const MONTH_LABELS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function resolveToken(token: string, min: number, max: number, names: Record<string, number> | undefined, fieldName: string): number {
  const upper = token.toUpperCase();
  if (names && upper in names) return names[upper];
  if (!/^-?\d+$/.test(token)) {
    throw new CronParseError(`invalid ${fieldName} value "${token}"`);
  }
  return Number(token);
}

function parseItem(
  item: string,
  min: number,
  max: number,
  names: Record<string, number> | undefined,
  fieldName: string,
  normalize?: (v: number) => number
): number[] {
  let rangePart = item;
  let step = 1;

  if (item.includes("/")) {
    const slashIdx = item.indexOf("/");
    rangePart = item.slice(0, slashIdx);
    const stepStr = item.slice(slashIdx + 1);
    if (!/^\d+$/.test(stepStr) || Number(stepStr) <= 0) {
      throw new CronParseError(`invalid step "${stepStr}" in ${fieldName} item "${item}"`);
    }
    step = Number(stepStr);
  }

  let start: number;
  let end: number;

  if (rangePart === "*") {
    start = min;
    end = max;
  } else if (rangePart.includes("-")) {
    const dashIdx = rangePart.indexOf("-");
    const aTok = rangePart.slice(0, dashIdx);
    const bTok = rangePart.slice(dashIdx + 1);
    start = resolveToken(aTok, min, max, names, fieldName);
    end = resolveToken(bTok, min, max, names, fieldName);
  } else {
    start = end = resolveToken(rangePart, min, max, names, fieldName);
  }

  if (start < min || start > max || end < min || end > max || start > end) {
    throw new CronParseError(`${fieldName} value "${item}" out of range (expected ${min}-${max})`);
  }

  const values: number[] = [];
  for (let v = start; v <= end; v += step) {
    values.push(normalize ? normalize(v) : v);
  }
  return values;
}

function parseField(
  fieldStr: string,
  min: number,
  max: number,
  fieldName: string,
  names?: Record<string, number>,
  normalize?: (v: number) => number
): FieldSpec {
  if (fieldStr.length === 0) {
    throw new CronParseError(`${fieldName} field is empty`);
  }
  const values = new Set<number>();
  for (const item of fieldStr.split(",")) {
    if (item.length === 0) {
      throw new CronParseError(`${fieldName} field "${fieldStr}" has an empty list item`);
    }
    for (const v of parseItem(item, min, max, names, fieldName, normalize)) {
      values.add(v);
    }
  }
  return { values, isWildcard: fieldStr === "*", raw: fieldStr };
}

/**
 * Parses a standard 5-field cron expression (minute hour day-of-month month
 * day-of-week). Supports `*`, `*\/step`, ranges (`a-b`), stepped ranges
 * (`a-b/step`), comma-separated lists, and month/weekday names
 * (JAN-DEC, SUN-SAT, case-insensitive). Throws `CronParseError` with a
 * precise, field-level message on anything invalid.
 */
export function parse(expr: string): CronExpression {
  const parts = expr.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    throw new CronParseError(`expected 5 space-separated fields (minute hour day-of-month month day-of-week), got ${parts.length} in "${expr}"`);
  }
  const [minuteStr, hourStr, domStr, monthStr, dowStr] = parts;

  return {
    minute: parseField(minuteStr, 0, 59, "minute"),
    hour: parseField(hourStr, 0, 23, "hour"),
    dayOfMonth: parseField(domStr, 1, 31, "day-of-month"),
    month: parseField(monthStr, 1, 12, "month", MONTH_NAMES),
    dayOfWeek: parseField(dowStr, 0, 7, "day-of-week", DOW_NAMES, (v) => (v === 7 ? 0 : v)),
    raw: expr.trim(),
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Non-throwing wrapper around `parse()`. */
export function validate(expr: string): ValidationResult {
  try {
    parse(expr);
    return { valid: true, errors: [] };
  } catch (err) {
    return { valid: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}
