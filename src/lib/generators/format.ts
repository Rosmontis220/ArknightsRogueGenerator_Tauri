/**
 * Small formatting helpers shared by the generators and the screens that render
 * their results.
 *
 * These live here rather than in a component because the same strings end up in
 * three places — the result area, the clipboard, and the history entry — and the
 * three must agree. Deriving all three from one implementation is what keeps them
 * in step: there is no second code path that can drift.
 */

/** Joins names for display and clipboard, using the tool's usual separator. */
export function namesAsText(names: readonly string[]): string {
	return names.join('、');
}
