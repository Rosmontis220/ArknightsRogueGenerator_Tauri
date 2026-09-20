/**
 * English names for the data the app displays.
 *
 * ## Where these come from
 *
 * Not from translating the Chinese. Arknights has an official English client, so operator,
 * theme and squad names already exist — but the official English name is frequently *not*
 * a translation of the Chinese one (`傀影与猩红孤钻` is `Phantom & Crimson Solitaire`).
 * Deriving them by translating would produce names that read as finished work and that no
 * player would recognise, so the table was built by joining our dictionary against the
 * official English tables **by the game's own ids** (`char_112_siege`, `rogue_5_band_17`).
 *
 * Position was not usable for that join: the official squad list is longer than the
 * one this app ships, so the two lists do not line up.
 *
 * ## The three sources, and why the distinction is recorded
 *
 * `official` is what the global client displays. `wiki` is the English community wiki's
 * rendering of content the global client has not received yet — it trails the Chinese
 * client by about six months, which is why ten operators and one theme have no official
 * name at all. `literal` is a translation we wrote ourselves, used only where neither of
 * the other two exists.
 *
 * Keeping them apart matters: an `official` name is a fact about the game, a `wiki` name is
 * a community convention that may change when the content actually ships, and a `literal`
 * name is our own wording that has no authority behind it at all. Collapsing them would
 * make the last kind look like the first.
 *
 * ## What is still open
 *
 * Nothing. {@link PENDING_SQUADS} is empty; it stays as a mechanism so that a squad added
 * ahead of its English name is listed explicitly rather than falling back in silence.
 *
 * ## Where this sits relative to `code_name_en`
 *
 * `operators.json` also carries a `code_name_en`. It is *not* the source of truth here,
 * and the join found four places where it disagrees with the official client — two Ursus
 * operators spelled in Cyrillic (`Роса`, `Позёмка`), one capitalisation
 * (`Reed The Flame Shadow`), one word order (`Togawa Sakiko`). Those are recorded rather
 * than silently corrected, because `operators.json` is the shipped dictionary and stays
 * as generated; `names-en.json` is where the corrected spellings live.
 */

import rawNames from './names-en.json';

/** Where a name came from. See the module note. */
export type NameSource = 'official' | 'wiki' | 'literal';

export interface EnglishName {
	en: string;
	source: NameSource;
}

/**
 * A cast rather than a hand-written schema: TypeScript reads JSON string fields as
 * `string`, so `source` would widen to `string` and the union would be unenforced. The
 * test file is what actually validates the shape.
 */
const NAMES = rawNames as {
	operators: Record<string, EnglishName>;
	themes: Record<string, EnglishName>;
	squads: Record<string, EnglishName>;
	pendingSquads: string[];
};

/** Every shipped six-star, keyed by its Chinese name. */
export const OPERATOR_NAMES_EN: Readonly<Record<string, EnglishName>> = NAMES.operators;

/** Every rogue theme, keyed by its Chinese name. */
export const THEME_NAMES_EN: Readonly<Record<string, EnglishName>> = NAMES.themes;

/**
 * Every squad that has an English name, keyed by its Chinese name.
 *
 * Deliberately incomplete: see {@link PENDING_SQUADS}.
 */
export const SQUAD_NAMES_EN: Readonly<Record<string, EnglishName>> = NAMES.squads;

/**
 * Squads with no English name available from any source.
 *
 * Empty: the five squads of the newest theme (沉沦者的黑流树海), which neither the official
 * tables nor the English wiki cover, were translated literally instead — see the `literal`
 * source above. The list stays because it is what makes a future unnamed squad a statement
 * the code makes rather than a key somebody forgot; `names-en.test.ts` fails if a squad is
 * neither named nor listed here.
 */
export const PENDING_SQUADS: readonly string[] = NAMES.pendingSquads;

/**
 * Looks a name up, falling back to the Chinese one.
 *
 * Falling back rather than throwing: this is display text. An unresolved name should leave
 * one line in Chinese — which a reader of the English interface can at least copy — rather
 * than take down the screen that was drawing it. That also keeps a dictionary update from
 * breaking the app before its names have been filled in.
 */
function lookup(table: Readonly<Record<string, EnglishName>>, name: string): string {
	return table[name]?.en ?? name;
}

export function operatorNameEn(name: string): string {
	return lookup(OPERATOR_NAMES_EN, name);
}

export function themeNameEn(name: string): string {
	return lookup(THEME_NAMES_EN, name);
}

export function squadNameEn(name: string): string {
	return lookup(SQUAD_NAMES_EN, name);
}
