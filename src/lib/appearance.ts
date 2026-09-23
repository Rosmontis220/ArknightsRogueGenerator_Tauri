/**
 * Theme application.
 *
 * Two things happen whenever the scheme changes, and they are not the same
 * thing:
 *
 *   1. `data-theme` on `<html>` selects the CSS token block in `app.css`.
 *   2. `color-scheme` tells the *native* webview which way to draw scrollbars,
 *      form controls, and the window frame. Getting this wrong is what makes a
 *      dark theme look broken around the edges, so it is derived from the scheme
 *      rather than hard-coded.
 *
 * The mirror is written here too, because this is the only place that knows a
 * scheme was actually applied.
 */

import type { ColorScheme } from './api/types';
import { readThemeMirror, writeThemeMirror } from './persistence';

export interface ColorSchemeDefinition {
	id: ColorScheme;
	/** i18n key for the swatch's name. */
	labelKey: string;
	/** i18n key for the hint shown under the swatch in settings. */
	descriptionKey: string;
	native: 'light' | 'dark';
}

/**
 * The schemes the app ships. 罗德岛 and 界园 are light; 终末地, 萨米 and the two
 * Persona-inspired schemes are dark.
 *
 * The names are keys rather than strings so they follow the interface language — 罗德岛 is
 * Rhodes Island in English while `P5R` and `P3R` are the same in both, and which of those is
 * which is a translation decision, not a code one.
 *
 * `p5` keeps its id while displaying as `P5R`: the id is what is written into the state file,
 * so renaming it would silently drop everyone who had already chosen that scheme back to the
 * default. The display name is free to change; the storage key is not.
 *
 * Order is the order the settings screen lists them, and the default leads. It is not the
 * order `COLOR_SCHEMES` is validated in — see `persistence.ts`, which keeps its own copy.
 */
export const COLOR_SCHEMES: readonly ColorSchemeDefinition[] = [
	{ id: 'rhodes', labelKey: 'appearance.scheme.rhodes', descriptionKey: 'appearance.scheme.rhodes.detail', native: 'light' },
	{ id: 'endfield', labelKey: 'appearance.scheme.endfield', descriptionKey: 'appearance.scheme.endfield.detail', native: 'dark' },
	{ id: 'p5', labelKey: 'appearance.scheme.p5', descriptionKey: 'appearance.scheme.p5.detail', native: 'dark' },
	{ id: 'p3r', labelKey: 'appearance.scheme.p3r', descriptionKey: 'appearance.scheme.p3r.detail', native: 'dark' },
	{ id: 'jieyuan', labelKey: 'appearance.scheme.jieyuan', descriptionKey: 'appearance.scheme.jieyuan.detail', native: 'light' },
	{ id: 'sami', labelKey: 'appearance.scheme.sami', descriptionKey: 'appearance.scheme.sami.detail', native: 'dark' }
];

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'rhodes';

export function colorSchemeDefinition(scheme: ColorScheme): ColorSchemeDefinition {
	return COLOR_SCHEMES.find((entry) => entry.id === scheme) ?? COLOR_SCHEMES[0];
}

export function nativeColorScheme(scheme: ColorScheme): 'light' | 'dark' {
	return colorSchemeDefinition(scheme).native;
}

/**
 * Applies a scheme to the document, or does nothing on the server.
 *
 * Prerendering means this module is imported in a Node context, where there is
 * no `document`; guarding here keeps callers from having to care.
 */
export function applyColorScheme(scheme: ColorScheme): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	root.dataset.theme = scheme;
	root.style.colorScheme = nativeColorScheme(scheme);

	writeThemeMirror(scheme);
}

/**
 * The scheme painted by `app.html` before hydration, falling back to the default.
 *
 * Used to render the settings screen's current selection without waiting for the
 * state file: the very first frame already reflects it.
 */
export function currentDocumentScheme(): ColorScheme {
	return readThemeMirror() ?? DEFAULT_COLOR_SCHEME;
}
