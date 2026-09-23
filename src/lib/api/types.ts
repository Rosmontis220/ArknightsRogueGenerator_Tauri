/**
 * The persisted document, mirroring `src-tauri/src/state.rs` one for one.
 *
 * The Rust side owns the file and this side owns the meaning, so the two must
 * agree exactly — including the camelCase wire names and the `box` key (Rust
 * renames its `box_state` field to `box` because `box` is a keyword there).
 *
 * `excluded` rather than `included` is deliberate: an operator added
 * to the dictionary later is then in the box by default, so nobody has to revisit
 * the box screen after a game update.
 */

/** Bumped whenever the shape changes in a way older files cannot satisfy. */
export const SCHEMA_VERSION = 3;

/**
 * The ID a draw uses when the player has not named one.
 *
 * Chinese in both locales, deliberately, and mirrored by `DEFAULT_IDENTITY_NAME` in
 * `state.rs`: the ID is the seed's input, so a translated default would make one date
 * produce different runs in different interface languages. It is *stored* rather than merely
 * displayed, which is what keeps the ID on screen, the ID the draw used and the ID the export
 * prints the same string.
 */
export const DEFAULT_IDENTITY_NAME = '博士';

/**
 * The interface language.
 *
 * Declared here rather than imported from `$lib/i18n`: this module mirrors `state.rs` and
 * deliberately depends on nothing, which is what lets the Rust and TypeScript shapes be
 * compared directly. `$lib/i18n` re-exports the same union, and a test pins them together.
 */
export type AppLocale = 'zh-CN' | 'en';

/** Every locale the document may carry. The order is the order they are offered in. */
export const APP_LOCALES: readonly AppLocale[] = ['zh-CN', 'en'];

/**
 * Every theme the app ships.
 *
 * `p5` still spells itself `P5R` on screen — see `lib/appearance.ts`. The id is the value
 * written into the state file, so it is the one part of a theme's name that is not free to
 * change.
 */
export type ColorScheme = 'rhodes' | 'endfield' | 'p5' | 'p3r' | 'jieyuan' | 'sami';
export type ReduceMotion = 'always' | 'never' | 'system';

export interface IdentityState {
	/** The player name; the only source of the seed's name part. */
	name: string;
	/**
	 * The operator whose portrait is used as the profile picture, or `''` for the
	 * built-in mark.
	 *
	 * Stored as an operator *name* rather than a path or image bytes: the portraits
	 * ship with the app as files named after the operator, so the name is already the
	 * key, and an index into the dictionary would go stale the moment an entry was
	 * inserted ahead of it.
	 */
	avatar: string;
}

export interface AppearanceState {
	colorScheme: ColorScheme;
	reduceMotion: ReduceMotion;
	/**
	 * The splash background as a data URL, or `''` for none — in which case the
	 * splash is the plain theme background.
	 *
	 * Embedded in the state document rather than stored as a path beside it: Rust owns
	 * exactly one file and deliberately knows nothing about images, so a path here
	 * would mean a second file to keep in step with this one. `$lib/image` bounds the
	 * size before the value ever reaches the state, because this document is rewritten
	 * in full on every save.
	 */
	splashImage: string;
	/**
	 * Show each operator's portrait wherever a list of operators is displayed, instead
	 * of their names.
	 *
	 * A display preference rather than part of the language or the theme: it changes
	 * nothing about what is generated, only how a list reads. The opening recommendation
	 * is deliberately exempt — it is the one line a user retypes elsewhere, so it stays
	 * as names.
	 */
	avatarMode: boolean;
}

/**
 * The interface language, as its own section rather than a field of `appearance`.
 *
 * Split out because the two are chosen for unrelated reasons: someone who wants the
 * English catalogue has no reason to go looking behind a palette icon, and while the
 * two shared a screen the language could only be found by someone already changing the
 * theme. The persisted shape follows the interface, so the sections match what the
 * settings root offers.
 */
export interface LanguageState {
	locale: AppLocale;
}

/**
 * The master volume for everything the app plays.
 *
 * A section of its own rather than a field of `appearance`, for the reason the language has
 * one: it is a destination in the settings root, and it is chosen for reasons that have
 * nothing to do with the palette. More sounds are coming, so the section is also where they
 * will be described.
 */
export interface SoundState {
	/**
	 * 0–100. `0` is silence; `100` is the sound file's own level.
	 *
	 * Stored as the number the slider shows rather than as a 0–1 gain. The two would have to
	 * be converted at every use, and an integer is what a persisted setting wants —
	 * `0.7000000000000001` in the state file is a bug report waiting to happen.
	 */
	volume: number;
}

/**
 * The volume a fresh install starts at.
 *
 * Full rather than a cautious fraction: what was asked for is a control to turn the sounds
 * *down*, and a default nobody can hear reads as a broken feature rather than as a
 * considerate one. `state.rs` mirrors this value.
 */
export const DEFAULT_SOUND_VOLUME = 100;

export interface BoxState {
	/** Six-star operators that are **not** in the user's box. */
	excluded: string[];
	/**
	 * Six-star operators the user owns but cannot field yet — imported from MAA with an
	 * elite level below 2.
	 *
	 * Kept apart from {@link excluded} because the fact is different, not because the
	 * effect is: both keep an operator out of the draw. "I do not have this one" and
	 * "I have it but it is not promoted" call for different actions from the user, so
	 * the box screen has to be able to tell them apart.
	 */
	unusable: string[];
}

export interface CommonOptions {
	enabledRogueIds: number[];
	isJobTeamOnly: boolean;
	isSupportUnitEnabled: boolean;
}

export interface GeneratorState {
	current: string;
	currentByFamily: Record<string, string>;
	options: Record<string, Record<string, unknown>>;
}

export interface HistoryEntry {
	/** Unix milliseconds. */
	at: number;
	generatorId: string;
	actionId: string;
	identity: string;
	/** The deterministic seed; a full u32. */
	seed: number;
	/** Structured result fields; never rendered markup. */
	fields: Record<string, string>;
}

export interface AppState {
	schemaVersion: number;
	identity: IdentityState;
	appearance: AppearanceState;
	language: LanguageState;
	sound: SoundState;
	box: BoxState;
	common: CommonOptions;
	generators: GeneratorState;
	history: HistoryEntry[];
}

/**
 * Rogue ids that start enabled, mirroring the Rust defaults.
 *
 * All of them. A fresh install has no box and no history, so it has no way to know which
 * themes its player follows — and a theme that starts off is a theme a generator quietly
 * never draws, which reads as a broken draw rather than as an unchecked box.
 *
 * Written as a literal rather than `[...ROGUE_IDS]` on purpose: this module mirrors
 * `state.rs` and depends on nothing, which is what lets the two shapes be compared
 * directly. `rogues.test.ts` pins this list to the theme list instead.
 */
export const DEFAULT_ENABLED_ROGUE_IDS = [2, 3, 4, 5, 6, 7];

/**
 * History is FIFO and capped.
 *
 * 50 rather than a rounder number of hundreds: the whole document is rewritten on every
 * save, and each entry carries a full set of result fields, so the cap is what keeps the
 * file — and the write that rewrites it — small. Opening draws are not recorded at all
 * (see `isRecordableAction`), so the entries here are the ones worth keeping.
 */
export const HISTORY_LIMIT = 50;

/**
 * Whether an action's result belongs in the history.
 *
 * The plain opening draw is excluded: it is the button a user presses repeatedly to
 * re-roll, and fifty near-identical one-line entries would crowd out the runs that
 * actually took a decision. The BP sizes all record, because picking them *is* the
 * decision.
 */
export function isRecordableAction(actionId: string): boolean {
	return actionId !== 'opening';
}

/**
 * The defaults must match `impl Default for AppState` in `state.rs`, otherwise a
 * fresh install and a repaired state file would behave differently.
 */
export function defaultAppState(): AppState {
	return {
		schemaVersion: SCHEMA_VERSION,
		identity: { name: DEFAULT_IDENTITY_NAME, avatar: '' },
		appearance: {
			colorScheme: 'rhodes',
			reduceMotion: 'system',
			splashImage: '',
			avatarMode: true
		},
		language: { locale: 'zh-CN' },
		sound: { volume: DEFAULT_SOUND_VOLUME },
		box: { excluded: [], unusable: [] },
		common: {
			enabledRogueIds: [...DEFAULT_ENABLED_ROGUE_IDS],
			isJobTeamOnly: false,
			isSupportUnitEnabled: false
		},
		generators: { current: 'opening', currentByFamily: {}, options: {} },
		history: []
	};
}

/**
 * True when an operator cannot be drawn: not in the box, or in it but not promoted.
 *
 * One predicate rather than two lookups at every call site, because every generator has
 * to apply *both* rules and a generator that applied only one would quietly field an
 * operator the user cannot use.
 */
export function isUnavailable(box: BoxState, operator: string): boolean {
	return box.excluded.includes(operator) || box.unusable.includes(operator);
}