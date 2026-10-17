/** Calendar helpers in the user's time zone (Asia/Manila, UTC+8, no daylight saving). */

export const TZ_OFFSET = "+08:00";
const OFFSET_MS = 8 * 3600_000;

/** YYYY-MM-DD of an instant in Manila time. */
export function manilaDate(at: Date | number = Date.now()): string {
  return new Date(+new Date(at) + OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const startOfDay = (day: string) => `${day}T00:00:00${TZ_OFFSET}`;
export const endOfDay = (day: string) => `${day}T23:59:59.999${TZ_OFFSET}`;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s);

/** Inclusive day range → ISO instants; returns undefined bounds for missing or invalid days. */
export function dayRange(from?: unknown, to?: unknown) {
  return {
    from: isDay(from) ? startOfDay(from) : undefined,
    to: isDay(to) ? endOfDay(to) : undefined,
  };
}

/** Named ranges given to the agent so it never has to do calendar arithmetic. Weeks start Monday. */
export function namedRanges(now: Date | number = Date.now()) {
  const today = manilaDate(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const monday = addDays(today, -((weekday + 6) % 7));
  return {
    today,
    weekdayName: new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    yesterday: addDays(today, -1),
    thisWeek: { from: monday, to: today },
    lastWeek: { from: addDays(monday, -7), to: addDays(monday, -1) },
    last7Days: { from: addDays(today, -6), to: today },
    last30Days: { from: addDays(today, -29), to: today },
  };
}
