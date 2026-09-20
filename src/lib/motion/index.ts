/**
 * Motion helpers.
 *
 * One place decides whether an animation runs, so no component has to remember
 * to check the preference. The OS setting and the app's own `reduceMotion` option
 * meet here: `app.css` handles the CSS-driven cases via `data-reduce-motion` on
 * `<html>`, and this module covers the few animations driven from JavaScript.
 *
 * Everything is read at call time rather than captured at module load, so a change
 * in the settings screen takes effect on the next transition rather than the next
 * launch.
 */

/** True when animation should be suppressed, per the OS setting or the app's own. */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return true;

	const override = document.documentElement.dataset.reduceMotion;
	if (override === 'always') return true;
	if (override === 'never') return false;

	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A fade-and-rise, collapsed to a single frame when motion is reduced.
 *
 * Svelte transition signature, so it is used as `transition:fadeUp` or
 * `in:fadeUp={{ delay: 80 }}`. It never *hides* content — the reduced case still
 * runs, with `duration: 0`, so a forgotten `prefersReducedMotion` check cannot
 * leave an element invisible.
 */
export function fadeUp(_node: HTMLElement, { delay = 0 }: { delay?: number } = {}) {
	const reduced = prefersReducedMotion();

	return {
		delay: reduced ? 0 : delay,
		duration: reduced ? 0 : 260,
		css: (progress: number) =>
			`opacity: ${progress}; transform: translateY(${(1 - progress) * 8}px);`
	};
}
