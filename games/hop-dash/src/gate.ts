/** A double tap on one screen must not land on the next, so a new screen's buttons wait this long. */
export const SCREEN_SETTLE_MS = 500;
/** The stars always stay up this long: they land, and there's time to enjoy them. */
export const STARS_LEAST_MS = 2600;
/** The screen must have been left alone this long before the buttons wake up. */
export const QUIET_MS = 900;

export const screenSettled = (openedAt: number, now: number): boolean => now - openedAt >= SCREEN_SETTLE_MS;

/** A child still mashing as they cross the flag shouldn't press anything by accident. */
export function buttonsReady(shownAt: number, lastTap: number, now: number): boolean {
  return now - shownAt >= STARS_LEAST_MS && now - lastTap >= QUIET_MS;
}

/** How long until the buttons could next wake, if no one taps. */
export function buttonsWait(shownAt: number, lastTap: number, now: number): number {
  return Math.max(shownAt + STARS_LEAST_MS, lastTap + QUIET_MS) - now;
}
