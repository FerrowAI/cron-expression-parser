/** Thrown by `parse()` (and surfaced as `errors[]` by `validate()`) with a precise, field-level message. */
export class CronParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronParseError";
  }
}
