import { CronExpression, parse, DOW_LABELS, MONTH_LABELS } from "./parse";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function sortedValues(set: Set<number>): number[] {
  return [...set].sort((a, b) => a - b);
}

function sameSet(values: number[], expected: number[]): boolean {
  return values.length === expected.length && values.every((v, i) => v === expected[i]);
}

function stepAllPattern(raw: string): number | null {
  const m = /^\*\/(\d+)$/.exec(raw);
  return m ? Number(m[1]) : null;
}

/**
 * Produces a human-readable sentence for a cron expression. Recognizes
 * common shapes (every-N-minutes/hours, a fixed time, weekday/weekend
 * day-of-week sets) and falls back to a plain enumeration of resolved
 * values for anything more exotic.
 */
export function describe(exprOrCron: string | CronExpression): string {
  const cron = typeof exprOrCron === "string" ? parse(exprOrCron) : exprOrCron;

  const minuteVals = sortedValues(cron.minute.values);
  const hourVals = sortedValues(cron.hour.values);
  const domVals = sortedValues(cron.dayOfMonth.values);
  const monthVals = sortedValues(cron.month.values);
  const dowVals = sortedValues(cron.dayOfWeek.values);

  // --- time-of-day clause ---
  let timeClause: string;
  const minuteStep = stepAllPattern(cron.minute.raw);
  const hourStep = stepAllPattern(cron.hour.raw);

  if (minuteVals.length === 1 && hourVals.length === 1 && !cron.minute.raw.includes("*") && !cron.hour.raw.includes("*")) {
    timeClause = `at ${pad2(hourVals[0])}:${pad2(minuteVals[0])}`;
  } else if (minuteStep !== null && cron.hour.isWildcard) {
    timeClause = `every ${minuteStep} minute${minuteStep === 1 ? "" : "s"}`;
  } else if (hourStep !== null && cron.minute.raw === "0") {
    timeClause = `every ${hourStep} hour${hourStep === 1 ? "" : "s"}`;
  } else if (cron.minute.isWildcard && cron.hour.isWildcard) {
    timeClause = "every minute";
  } else {
    timeClause = `at minute(s) ${minuteVals.join(",")} of hour(s) ${hourVals.join(",")}`;
  }

  // --- day clause (day-of-week takes priority when restricted; combines with day-of-month via "or" per cron OR semantics) ---
  const dowClauses: string[] = [];
  if (!cron.dayOfWeek.isWildcard) {
    if (sameSet(dowVals, [1, 2, 3, 4, 5])) {
      dowClauses.push("on weekdays");
    } else if (sameSet(dowVals, [0, 6])) {
      dowClauses.push("on weekends");
    } else {
      dowClauses.push("on " + dowVals.map((v) => DOW_LABELS[v]).join(", "));
    }
  }

  const domClauses: string[] = [];
  if (!cron.dayOfMonth.isWildcard) {
    domClauses.push("on day-of-month " + domVals.join(","));
  }

  let dayClause = "";
  if (domClauses.length && dowClauses.length) {
    dayClause = domClauses[0] + " or " + dowClauses[0];
  } else {
    dayClause = domClauses[0] || dowClauses[0] || "";
  }

  const monthClause = monthVals.length === 12 ? "" : "in " + monthVals.map((m) => MONTH_LABELS[m]).join(", ");

  return [timeClause, dayClause, monthClause].filter(Boolean).join(" ");
}
