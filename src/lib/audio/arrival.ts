/**
 * "The visitor arrived here from their role choice on Let us explain."
 *
 * Michael's item 1.2: the role-page welcome starts by itself when the visitor
 * comes from choosing their role, and only then. Someone who opens /goalie from
 * a link, a bookmark or the menu is not surprised by a voice.
 *
 * The role choice is a client-side navigation, so the note is kept in module
 * memory: it survives the move to the role page and is gone on any full page
 * load, which is exactly the lifetime it should have.
 *
 * Reading and clearing are separate on purpose. The player checks on mount and
 * clears only once the welcome has actually been started, so a re-mount in
 * between (React's development double-run, a fast re-render) does not lose it.
 */

/** How long after the tap the arrival still counts. A slow phone gets this long to load the page. */
export const ARRIVAL_WINDOW_MS = 30_000;

let pending: { page: string; at: number } | null = null;

/** Called from the role choice, inside the tap, just before navigating to `page`. */
export function markRoleArrival(page: string, now: number = Date.now()): void {
  pending = { page, at: now };
}

/** True if the visitor has just chosen the role whose page is `page`. */
export function hasRoleArrival(page: string, now: number = Date.now()): boolean {
  return pending !== null && pending.page === page && now - pending.at <= ARRIVAL_WINDOW_MS;
}

/** Called once the welcome has started, so it starts once. */
export function clearRoleArrival(): void {
  pending = null;
}
