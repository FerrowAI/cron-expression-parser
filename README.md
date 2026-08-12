# cron-expression-parser
![CI](https://github.com/FerrowAI/cron-expression-parser/actions/workflows/ci.yml/badge.svg)

Zero-dependency 5-field cron expression parser for TypeScript/JavaScript:
ranges, steps, lists, month/weekday names, precise validation errors,
`nextRun`/`nextN` scheduling, and `describe()` for human-readable sentences.

## Why

Agents that schedule work need to parse a cron string, know *why* an
invalid one is invalid, and compute the next few run times — without
pulling in a large dependency tree. This package does the standard 5-field
grammar (`minute hour day-of-month month day-of-week`) with zero runtime
dependencies.

## Timezone / DST

All scheduling (`matches`, `nextRun`, `nextN`) is computed in **UTC**,
using `Date`'s `getUTC*`/`Date.UTC` accessors exclusively. Cron expressions
carry no timezone of their own; this library does not attempt to interpret
one, and there is no DST handling — "9am" always means "09:00 UTC". If you
need local-time or DST-aware scheduling, convert your `from` date to UTC
before calling and interpret the returned `Date` as UTC.

## Install

```bash
npm install cron-expression-parser
```

## Quickstart

```ts
import { parse, validate, nextRun, nextN, describe } from "cron-expression-parser";

parse("0 9 * * 1-5"); // -> CronExpression (throws CronParseError if invalid)
validate("61 * * * *"); // -> { valid: false, errors: ["minute value \"61\" out of range (expected 0-59)"] }

nextRun("*/15 * * * *"); // -> next Date matching the expression, UTC
nextN("0 9 * * 1-5", 3); // -> next 3 matching Dates

describe("0 9 * * 1-5"); // -> "at 09:00 on weekdays"
describe("*/15 * * * *"); // -> "every 15 minutes"
```

## API

### `parse(expr: string): CronExpression`
Parses a 5-field expression. Supports `*`, `*/step`, `a-b`, `a-b/step`,
comma-separated lists, and case-insensitive names (`JAN`-`DEC` for month,
`SUN`-`SAT` for day-of-week; `7` is also accepted for Sunday and normalized
to `0`). Throws `CronParseError` with a field-specific message on anything
invalid.

### `validate(expr: string): ValidationResult`
Non-throwing wrapper: `{ valid: boolean; errors: string[] }`.

### `matches(date: Date, exprOrCron: string | CronExpression): boolean`
True if `date` (read in UTC) satisfies the expression. Uses standard cron
OR semantics when both day-of-month and day-of-week are restricted
(non-`*`): the date matches if *either* is satisfied.

### `nextRun(exprOrCron: string | CronExpression, from?: Date): Date`
Next UTC instant (minute resolution) strictly after `from` (default now)
that satisfies the expression. Steps minute-by-minute within a bounded
~4-year search window — a documented bounded brute force, not full
field-arithmetic stepping, but fast for any satisfiable expression and
throws instead of looping forever on an unsatisfiable one (e.g. `0 0 30 2 *`).

### `nextN(exprOrCron: string | CronExpression, n: number, from?: Date): Date[]`
The next `n` matching instants, in order.

### `describe(exprOrCron: string | CronExpression): string`
A human-readable sentence. Recognizes common shapes (fixed time,
every-N-minutes/hours, weekday/weekend day-of-week sets) and falls back to
a plain enumeration of resolved values for anything more exotic.

```ts
interface CronExpression { minute: FieldSpec; hour: FieldSpec; dayOfMonth: FieldSpec; month: FieldSpec; dayOfWeek: FieldSpec; raw: string; }
interface FieldSpec { values: Set<number>; isWildcard: boolean; raw: string; }
interface ValidationResult { valid: boolean; errors: string[]; }
class CronParseError extends Error {}
```

## Limits

- 5 fields only — no seconds field, no `L`/`W`/`#` extensions some cron
  dialects support.
- UTC only, no DST (see above).
- `describe()` covers common patterns with a readable fallback for
  everything else — it is not a full natural-language generator for every
  possible expression shape.
- `nextRun`/`nextN` are bounded to a ~4-year minute-by-minute search;
  expressions that can never match (e.g. day-of-month 31 in a
  month-restricted-to-February expression) throw rather than hang.

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
