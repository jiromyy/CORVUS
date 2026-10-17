/** "MM:SS" or "H:MM:SS" → seconds. */
export function clockToSeconds(t: string): number {
  return t
    .trim()
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

/** Seconds → "M:SS" or "H:MM:SS". */
export function secondsToClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export const CLOCK_PATTERN = /^(\d+:)?\d{1,2}:\d{2}$/;
