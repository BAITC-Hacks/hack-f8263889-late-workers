/**
 * Backend timestamps are UTC. Postgres returns them with an offset
 * (`2026-09-20T13:10:51+00:00`); SQLite returns them naive (`2026-09-20T13:10:51`),
 * which `new Date()` would wrongly read as local time — so we pin naive values to UTC.
 */
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

export const parseApiDate = (value: string): Date =>
  new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);

export const formatDateTime = (
  value: string,
  locale?: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string =>
  new Intl.DateTimeFormat(locale, options).format(parseApiDate(value));
