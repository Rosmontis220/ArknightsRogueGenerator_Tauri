/**
 * The exported form of a result.
 *
 * ## Why this shape is not in the message catalogue
 *
 * Everything else the app renders is translated. This is not, and that is a decision: the
 * export exists to be pasted into a Chinese-language community post or chat, where the
 * labels `ID：` / `主题：` / `BAN：` / `PICK:` are what readers scan for. Translating them
 * would produce a block nobody there recognises, and each reader could get a different one.
 *
 * The *values* are still localised, so an English-interface user exports their own names.
 *
 * The mixed punctuation is the specification, not an oversight: `BAN：` takes the fullwidth
 * colon and `PICK:` the ASCII one, with no space after either. It is reproduced exactly,
 * and there is a test pinning each character.
 *
 * ## Empty lines and empty fields
 *
 * A line is emitted only when it has content. An opening draw bans and picks nobody, so it
 * exports as the one line that says something, rather than as two lines ending in a colon
 * and nothing — which reads as a broken export rather than as an accurate one.
 *
 * The header works the same way, field by field. 老缠杯 #2 has no squad and no opening
 * operator, so `分队：` and `开局干员：` would be two labels followed by nothing; they are
 * left out and its header reads `ID：… 主题：…`. A result carries the fields it has, and the
 * export shows those.
 */

import { localizeFields } from './i18n/names';

/** The separator between the two ban sources and within each, matching the app's lists. */
const LIST_SEPARATOR = '、';

/**
 * Builds the text the 导出结果 button copies.
 *
 * `fields` is the same record a history entry stores, so the export can never disagree with
 * the archive; `identity` is passed in rather than read from the store so this stays a pure
 * function and is testable without a browser.
 */
export function exportText(identity: string, fields: Record<string, string>): string {
	const display = localizeFields(fields);

	// `fixed_ban` is the event's own permanent ban and `bans` the ones this run drew. They
	// are two fields because the app needs to tell them apart, but one list to a reader.
	const bans = [display.fixed_ban, display.bans]
		.filter((value) => value !== undefined && value !== '')
		.join(LIST_SEPARATOR);

	// `ID：` is kept even when the identity is empty: it is the one label that is always
	// there, and a header with no ID at all reads as a different format rather than as an
	// unnamed player.
	const parts = [`ID：${identity}`];
	const labelled: readonly (readonly [string, string | undefined])[] = [
		['主题', display.opening_rogue_name],
		['分队', display.opening_team_name],
		['开局干员', display.opening_operator_name]
	];

	for (const [label, value] of labelled) {
		if (value !== undefined && value !== '') parts.push(`${label}：${value}`);
	}

	const lines = [parts.join(' ')];

	if (bans !== '') lines.push(`BAN：${bans}`);

	const picks = display.picks ?? '';
	if (picks !== '') lines.push(`PICK:${picks}`);

	return lines.join('\n');
}