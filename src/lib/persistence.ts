/**
 * The single exit point for persistence.
 *
 * Settings live in a JSON file written by Rust
 * (atomic write, corrupt-file quarantine), **not** in `localStorage`. There are two
 * exceptions, both deliberate: a mirror of the colour scheme, which `app.html` reads
 * before the first paint so the window never flashes the wrong theme, and the date of
 * the last 投钱问路 toss, which is a view flag rather than a setting — see
 * {@link readTossedOn}.
 *
 * Outside the Tauri shell — `pnpm dev` opened in a normal browser — the commands
 * cannot exist at all, so this module falls back to `localStorage` to keep the UI
 * workable. That fallback is a development affordance only: it is loud about
 * itself ({@link isTauriRuntime} is surfaced in the settings screen) and it is
 * not the shipping path.
 */

import { invoke } from '@tauri-apps/api/core';

import type { AppState, AppearanceState, ColorScheme, IdentityState, LanguageState } from './api/types';
import { DEFAULT_IDENTITY_NAME, defaultAppState } from './api/types';
import { isLocale } from './i18n/locale.svelte';

/** Development-only stand-in used when there is no Tauri host. */
const DEV_STORAGE_KEY = 'arg.dev.state';

/** First-paint theme mirror; deliberately separate from the real state file. */
const THEME_MIRROR_KEY = 'arg:resolved-theme';

/** The day the home page's 投钱问路 toss was last made. */
const TOSS_DATE_KEY = 'arg:tossed-on';

/**
 * The stored scheme ids, used to reject anything else.
 *
 * A list of its own rather than `COLOR_SCHEMES.map((entry) => entry.id)`: importing
 * `appearance.ts` here would make a cycle, since it imports this module for the theme mirror.
 * A test pins the two together, so a scheme added to one and not the other fails loudly
 * instead of being silently normalized back to the default.
 */
const COLOR_SCHEMES: readonly string[] = ['rhodes', 'endfield', 'p5', 'p3r', 'jieyuan', 'sami'];

/** True when running inside the Tauri webview rather than a plain browser. */
export function isTauriRuntime(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Renders an unknown thrown value as something worth showing a user. */
export function describeError(cause: unknown): string {
	if (typeof cause === 'string') return cause;
	if (cause instanceof Error) return cause.message;
	return String(cause);
}

function isColorScheme(value: unknown): value is ColorScheme {
	return typeof value === 'string' && COLOR_SCHEMES.includes(value);
}

/**
 * Reads the stored state, or `null` when there is nothing usable.
 *
 * A corrupt file is not an error here: the Rust side quarantines it as `.bak` and
 * answers `null`, so the caller falls back to defaults.
 */
export async function loadState(): Promise<AppState | null> {
	if (!isTauriRuntime()) {
		return readDevState();
	}
	return await invoke<AppState | null>('load_state');
}

/** Writes the state. Rust does the atomic temp-file-then-rename dance. */
export async function saveState(state: AppState): Promise<void> {
	if (!isTauriRuntime()) {
		writeDevState(state);
		return;
	}
	await invoke('save_state', { state });
}

/** Absolute path of the state file, for the data screen. `null` outside Tauri. */
export async function stateFilePath(): Promise<string | null> {
	if (!isTauriRuntime()) return null;
	return await invoke<string>('state_file_path');
}

/**
 * The colour scheme captured before the first paint, or `null`.
 *
 * Never throws: `localStorage` is unavailable in some privacy modes, and a
 * missing mirror only costs one themed frame.
 */
export function readThemeMirror(): ColorScheme | null {
	try {
		const raw = globalThis.localStorage?.getItem(THEME_MIRROR_KEY) ?? null;
		return isColorScheme(raw) ? raw : null;
	} catch {
		return null;
	}
}

/** Records the colour scheme for the next cold start. */
export function writeThemeMirror(scheme: ColorScheme): void {
	try {
		globalThis.localStorage?.setItem(THEME_MIRROR_KEY, scheme);
	} catch {
		// Storage unavailable or full; the app still works, it just may flash.
	}
}

/**
 * The day the 投钱问路 toss was last made, or `null`.
 *
 * The coins are fixed for one ID on one day, so the screen only has to remember *that*
 * it was asked, never what came up — the three are derived again from the same
 * `(ID, date)` pair. That is what keeps this to one short string.
 *
 * Here rather than in the state file because it is a view flag with a one-day lifetime,
 * not a setting: it is worth one click if it is ever lost, and putting it in the
 * document would cost a schema version and a migration to carry it. The state file is
 * for what the user chose; this is for what the user has already been shown.
 *
 * Never throws, for the reason {@link readThemeMirror} gives.
 */
export function readTossedOn(): string | null {
	try {
		return globalThis.localStorage?.getItem(TOSS_DATE_KEY) ?? null;
	} catch {
		return null;
	}
}

/**
 * Records the day the toss was made, so that reopening the app does not ask again.
 *
 * Nothing clears it. The home page compares it against the current date, so it stops
 * matching on its own at midnight and the next toss overwrites it — a stale value is
 * indistinguishable from no value at all.
 */
export function writeTossedOn(date: string): void {
	try {
		globalThis.localStorage?.setItem(TOSS_DATE_KEY, date);
	} catch {
		// Storage unavailable or full; the toss still works, it is just asked again.
	}
}

function readDevState(): AppState | null {
	try {
		const raw = globalThis.localStorage?.getItem(DEV_STORAGE_KEY);
		return raw ? normalizeState(JSON.parse(raw) as Partial<AppState>) : null;
	} catch {
		return null;
	}
}

/**
 * Fills in whatever a stored document predates.
 *
 * The Tauri path does not depend on this: `state.rs` carries `#[serde(default)]` on every
 * field added after the first release, and its `migrate` is the hook for anything
 * cleverer. This mirrors that behaviour because the development fallback is the only way
 * to reach the app without Rust, and a browser profile left over from an earlier build
 * would otherwise hand the UI an object with keys missing that its type claims are
 * present. Where Rust migrates rather than merely defaulting — the language moving out of
 * `appearance` — this has to reach the same answer, or a restart would land the two paths
 * on different languages.
 *
 * Section by section rather than a single spread: a shallow spread would let a stored
 * `appearance` replace the whole default object and drop every field it does not
 * mention — precisely the failure this exists to prevent.
 */
export function normalizeState(raw: Partial<AppState>): AppState {
	const base = defaultAppState();

	return {
		...base,
		...raw,
		identity: normalizeIdentity(base.identity, raw.identity),
		appearance: normalizeAppearance(base.appearance, raw.appearance),
		language: normalizeLanguage(base.language, raw.language, raw.appearance),
		box: { ...base.box, ...raw.box },
		common: { ...base.common, ...raw.common },
		generators: { ...base.generators, ...raw.generators },
		history: raw.history ?? base.history
	};
}

/**
 * Appearance, minus the language field that version 1 kept here.
 *
 * The spread would otherwise carry `locale` through for ever: `normalizeAppearance` reads
 * it, hands it to `normalizeLanguage`, and then drops it, so the document this writes back
 * does not keep a key nothing reads. Rust's `AppearanceState::locale` is
 * `skip_serializing` for the same reason.
 */
function normalizeAppearance(
	base: AppearanceState,
	raw: AppearanceState | undefined
): AppearanceState {
	const { locale: _legacy, ...rest } = (raw ?? {}) as AppearanceState & { locale?: unknown };
	return { ...base, ...rest };
}

/**
 * Identity, with a blank name replaced by the default one.
 *
 * The mirror of the version 2 → 3 step in `commands.rs`. Rust owns the real file, so this
 * only ever runs on the development fallback — but a browser profile left over from before
 * that step would otherwise show an empty ID where a packed build shows 博士, and the ID is
 * the seed's input, so the two would draw different runs for the same date.
 *
 * Blank rather than merely empty, so a lone space cannot become an ID.
 */
function normalizeIdentity(base: IdentityState, raw: IdentityState | undefined): IdentityState {
	const merged = { ...base, ...raw };
	return merged.name.trim() === '' ? { ...merged, name: DEFAULT_IDENTITY_NAME } : merged;
}

/**
 * Language needs more than a spread, because `locale` is the one field whose value has to
 * be *recognised*, not merely present.
 *
 * Every other field degrades sensibly — an unknown colour scheme falls back to the default
 * when it is applied. A locale does not: an unrecognised one finds no catalogue at all and
 * renders the entire interface as raw keys, so it is narrowed here rather than trusted.
 *
 * The third parameter is the pre-version-2 home of this value. It is consulted only when
 * the `language` section yields nothing usable, which is exactly a document written before
 * the split.
 */
function normalizeLanguage(
	base: LanguageState,
	raw: LanguageState | undefined,
	legacyAppearance: unknown
): LanguageState {
	// The *stored* section first, and not merged over the default: `base.locale` is always
	// a valid locale, so checking it first would make the legacy branch below unreachable
	// and silently drop the choice of everyone who had picked English before the split.
	if (isLocale(raw?.locale)) return { locale: raw.locale };

	const legacy = legacyLocale(legacyAppearance);
	if (isLocale(legacy)) return { locale: legacy };

	return { locale: base.locale };
}

/**
 * The version 1 spelling of the language, dug out of the `appearance` section.
 *
 * Typed as `unknown` and narrowed here rather than by declaring the parameter as
 * `{ locale?: unknown }`: `AppearanceState` no longer has a `locale` property, and a
 * parameter whose properties are all optional rejects an object that shares none of them.
 */
function legacyLocale(source: unknown): unknown {
	if (typeof source !== 'object' || source === null || !('locale' in source)) return undefined;
	return (source as { locale: unknown }).locale;
}

function writeDevState(state: AppState): void {
	try {
		globalThis.localStorage?.setItem(DEV_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignored for the same reason as above.
	}
}