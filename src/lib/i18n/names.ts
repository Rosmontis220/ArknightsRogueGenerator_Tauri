/**
 * The render boundary: where a Chinese proper noun becomes an English one.
 *
 * ## Why the substitution happens here and not in the data
 *
 * The generators produce Chinese names, and they must: the Chinese name *is* the identity of
 * a result — it is what the result store and the history entry agree on, and what a stored
 * run is rebuilt from. Localising inside a generator would both
 * make the result renderable only in the language it happened to run in and leave the stored
 * record in whichever language that was, while the history screen has to re-render a run
 * recorded under the other language.
 *
 * So a result carries Chinese nouns plus message keys, and this module is the one place
 * that turns them into display text. That is also why `t()` is not enough on its own: a
 * sentence like `{team} {operator} 开局` has to have its nouns translated *before* they are
 * substituted.
 *
 * ## What is translatable and what is not
 *
 * Names are looked up, never translated on the fly: operator and theme names come from
 * `$lib/core/names-en`, which was built by joining the official English game tables by
 * internal id. Class names come from `JOB_ALIAS_MAP`, whose values were the game's own
 * class ids all along. A name with no English entry falls back to Chinese — see
 * `names-en.ts` for why that is the right failure.
 *
 * The two tournament names are not in `names-en` because there is nothing to look up:
 * they are community events with no official English name, so they live in the catalogue as
 * decisions. That is the whole distinction — data when the game names it, catalogue when a
 * person had to.
 */

import { OPERATOR_NAMES_EN, SQUAD_NAMES_EN, THEME_NAMES_EN } from '../core/names-en';
import { JOB_ALIAS_MAP, type OperatorJob } from '../core/operators';
import { ROGUE_NAME_LIST } from '../core/rogues';
import { t } from './index';
import { locale } from './locale.svelte';
import type { MessageParams } from './index';
import type { TextSpec } from '../generators/types';

/**
 * The eight class names, as the game spells them.
 *
 * Built from `JOB_ALIAS_MAP`'s values rather than written out, because those values *are*
 * the game's class ids (`VANGUARD`, `GUARD`, …) — so title-casing them yields the display
 * name and makes it impossible for the two to drift apart. A hand-written copy would be one
 * more place to forget when a class is ever added.
 */
const JOB_NAMES_EN: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(JOB_ALIAS_MAP).map(([job, alias]) => [
		job,
		alias.charAt(0) + alias.slice(1).toLowerCase()
	])
);

function isJob(value: string): value is OperatorJob {
	return Object.hasOwn(JOB_ALIAS_MAP, value);
}

function isTheme(value: string): boolean {
	return ROGUE_NAME_LIST.includes(value);
}

/**
 * The Chinese names of every operator, used to tell an operator apart from a theme.
 *
 * Read from `names-en` rather than from `operators.json`: the two have the same keys by
 * construction (`names-en.test.ts` asserts it), and importing the 137-entry dictionary
 * here to answer "is this a name?" would pull the whole file into a module the renderer
 * loads on the splash screen.
 */
const OPERATOR_NAMES: ReadonlySet<string> = new Set(Object.keys(OPERATOR_NAMES_EN));

/**
 * Is `value` an operator name?
 *
 * The membership test only recognises *six-stars*, which is all the app draws from — so a
 * five-star name arriving here would fall through untranslated rather than be mangled. It
 * cannot happen today, and an untranslated name is the harmless direction.
 */
export function isOperatorName(value: string): boolean {
	return OPERATOR_NAMES.has(value);
}

/**
 * Localises one name, trying each kind in turn.
 *
 * Order matters only in that no name is ever in two tables; each lookup is a record hit.
 * The class check comes first because a bare name that is a class is the shortest and the
 * most frequent thing this sees — squad names, pool headers and the box screen's grouping.
 */
export function localizeName(name: string): string {
	if (locale.current === 'zh-CN') return name;

	if (isJob(name)) return JOB_NAMES_EN[name];
	if (OPERATOR_NAMES.has(name)) return OPERATOR_NAMES_EN[name].en;
	if (isTheme(name)) return THEME_NAMES_EN[name].en;
	if (name in SQUAD_NAMES_EN) return SQUAD_NAMES_EN[name].en;

	return name;
}

/**
 * Strips the render-time-only suffix from a pick entry.
 *
 * Picks store the opening operator as `维什戴尔（开局）` — one stored value, suffix and all —
 * so translating the inner name means peeling the suffix, translating, and putting a
 * localised suffix back. `result.openingSuffix` is the localised form.
 */
const OPENING_SUFFIX = '（开局）';

/**
 * The operator name behind a stored result item, with any mark stripped.
 *
 * Two callers need the bare name: the portrait lookup, because `维什戴尔（开局）` is not a
 * dictionary key and would draw no portrait at all, and {@link localizeResultItem}, which
 * puts a localised mark back on. Kept as one function so the two cannot disagree about
 * what the suffix is.
 */
export function baseName(item: string): string {
	return item.endsWith(OPENING_SUFFIX) ? item.slice(0, -OPENING_SUFFIX.length) : item;
}

/** Whether a stored result item carries the opening mark. */
export function isOpeningPick(item: string): boolean {
	return item.endsWith(OPENING_SUFFIX);
}

export function localizeResultItem(item: string): string {
	if (!isOpeningPick(item)) return localizeName(item);

	return t('result.openingSuffix', { name: localizeName(baseName(item)) });
}

/**
 * Joins names the way the locale does.
 *
 * `、` versus `, ` is not decoration: it is the difference between a list that reads as
 * Chinese punctuation in an English sentence and one that does not.
 */
export function joinNames(names: readonly string[]): string {
	return names.map(localizeResultItem).join(locale.current === 'zh-CN' ? '、' : ', ');
}

/**
 * Renders a `TextSpec` to display text in the active locale.
 *
 * There is no class-grouped case: the picks are a plain `names` list, so they render
 * through {@link joinNames} exactly as the bans do.
 */
export function renderText(spec: TextSpec): string {
	switch (spec.kind) {
		case 'name':
			return localizeName(spec.name);
		case 'names':
			return joinNames(spec.names);
		case 'key': {
			const params: MessageParams = {};
			for (const [key, value] of Object.entries(spec.params ?? {})) {
				params[key] = typeof value === 'object' ? renderText(value) : value;
			}
			return t(spec.key, params);
		}
	}
}

/**
 * Splits a stored list back into names.
 *
 * History stores the Chinese separator — the stored fields are the record of the run — so the
 * split is always on `、` regardless of the language being displayed.
 */
function splitNames(value: string): string[] {
	return value === '' ? [] : value.split('、');
}

/**
 * Which fields hold names, and therefore need substituting before they are displayed.
 *
 * `picks` is on the *list* set rather than needing its own case: the picks are stored as
 * one `A、B、C` string, the same shape as `bans`, so they localise through the same path.
 */
const NAME_FIELDS = new Set(['opening_rogue_name', 'opening_team_name', 'opening_operator_name']);
const NAME_LIST_FIELDS = new Set(['fixed_ban', 'bans', 'picks', 'laochan_pool']);

/**
 * Localises a history entry's stored fields for display.
 *
 * History keeps the Chinese values — they are the record of what was drawn — so the
 * translation happens on the way to the screen rather than on the way into the file. That
 * also means an entry recorded in one language reads correctly in the other.
 */
export function localizeFields(fields: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(fields).map(([key, value]) => {
			if (NAME_FIELDS.has(key)) return [key, localizeName(value)];
			if (NAME_LIST_FIELDS.has(key)) return [key, joinNames(splitNames(value))];
			return [key, value];
		})
	);
}
