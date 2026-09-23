/**
 * The active locale.
 *
 * Its own module rather than a field on `appState`, because the message catalogue has to
 * read it from contexts that have nothing to do with persistence — and because a
 * `$state` needs a `.svelte.ts` file, while `$lib/i18n` has to stay resolvable as
 * `index.ts` (Vite does not look for `index.svelte.ts`).
 *
 * `appState` is still what *stores* the choice; this is the value the UI reads. They are
 * kept in step by `appState.load()` and by the settings screen, in the same way
 * `applyColorScheme` mirrors the theme.
 */

export type Locale = 'zh-CN' | 'en';

export const LOCALES: readonly Locale[] = ['zh-CN', 'en'];

export const DEFAULT_LOCALE: Locale = 'zh-CN';

/**
 * Each locale's name *in itself*.
 *
 * Deliberately not in the catalogue: a language picker that renders "德语" to someone who
 * reads only German is useless, so a language name is never translated.
 */
export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
	'zh-CN': '简体中文',
	en: 'English'
};

class LocaleStore {
	/** The locale every `t()` call reads. */
	current = $state<Locale>(DEFAULT_LOCALE);

	set(next: Locale): void {
		this.current = next;
	}
}

export const locale = new LocaleStore();

/** Narrows an unknown value (a state file, a URL parameter) to a locale. */
export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}