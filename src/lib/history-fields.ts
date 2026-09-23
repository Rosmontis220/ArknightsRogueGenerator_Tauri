/**
 * Labelled rows for a history entry's structured fields.
 *
 * History stores structured fields only, and those fields differ
 * per generator: a 老缠杯 #2 entry carries `picks` and no `opening_team_name` or
 * `opening_operator_name` at all. A view that reads named properties therefore renders
 * another mode's entries as blank rows — which is exactly the bug this module exists to
 * prevent.
 *
 * So the list below is about *presentation* — order and wording — not about what is
 * allowed to exist. Anything it has never heard of is still rendered, under its raw
 * key. A missing line is far harder to notice than an ugly one.
 *
 * Extracted from the history page rather than left in the `.svelte` file so that this
 * rule can be asserted directly, without a DOM.
 */

import { t } from './i18n';
import { locale } from './i18n/locale.svelte';

/**
 * Display order and labels for the fields today's generators produce.
 *
 * Opening first, then the removals, then the picks: that is the order the result
 * screen shows them in, and a reader comparing a history entry with a fresh
 * result should not have to re-learn the layout.
 */
export const FIELD_ORDER: readonly { key: string; labelKey: string }[] = [
	{ key: 'opening_rogue_name', labelKey: 'field.rogue' },
	{ key: 'opening_team_name', labelKey: 'field.team' },
	{ key: 'opening_operator_name', labelKey: 'field.opening' },
	{ key: 'fixed_ban', labelKey: 'field.fixedBan' },
	{ key: 'bans', labelKey: 'field.bans' },
	{ key: 'picks', labelKey: 'field.picks' },
	// No generator writes this any more — 老缠杯's pool is stored as `picks` now, because
	// that is what it is to a reader. Kept so that a history entry written by 0.2.0 still
	// gets a label instead of falling through to its raw key.
	{ key: 'laochan_pool', labelKey: 'field.laochanPool' }
];

export interface FieldRow {
	/** The field's own name, and the `{#each}` key. */
	key: string;
	label: string;
	value: string;
}

function has(fields: Record<string, string>, key: string): boolean {
	const value = fields[key];
	return value !== undefined && value !== '';
}

/**
 * Every non-empty field, as a labelled row.
 *
 * Order: {@link FIELD_ORDER} first, then anything unrecognised in the order the
 * fields object lists it — which is insertion order, and therefore the order the
 * generator wrote them in.
 */
export function fieldRows(fields: Record<string, string>): FieldRow[] {
	const known = FIELD_ORDER.filter((field) => has(fields, field.key)).map((field) => ({
		key: field.key,
		label: t(field.labelKey),
		value: fields[field.key]
	}));

	const knownKeys = new Set(FIELD_ORDER.map((field) => field.key));
	const extra = Object.keys(fields)
		.filter((key) => !knownKeys.has(key) && has(fields, key))
		.map((key) => ({ key, label: key, value: fields[key] }));

	return [...known, ...extra];
}

/** The collapsed row's one-liner: a few field values, no labels. */
export function summarizeFields(fields: Record<string, string>, limit = 2): string {
	return fieldRows(fields)
		.slice(0, limit)
		.map((row) => row.value)
		.join(' · ');
}

/** The whole entry as copyable text, one labelled line per field. */
export function fieldsAsText(fields: Record<string, string>): string {
	// The label separator follows the language: `禁用：A` is not `Bans: A`, and the copied
	// text is what a reader pastes into a chat alongside their own words.
	const separator = locale.current === 'zh-CN' ? '：' : ': ';

	return fieldRows(fields)
		.map((row) => `${row.label}${separator}${row.value}`)
		.join('\n');
}
