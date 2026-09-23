/**
 * Importing a box from MAA (MaaAssistantArknights).
 *
 * The user exports their operators from MAA as JSON, picks that file on the box screen,
 * and this module turns it into the two exclusion lists the app stores. It is pure — no
 * DOM, no Tauri, no i18n — so the whole mapping is unit-tested, including against a real
 * export, and the Svelte page is left with reading a `File`, calling this, and printing
 * the summary.
 *
 * ## The shape of the file, established from a real export
 *
 * The sample attached to the feature request (`9.16bug与改进分析.txt`, lines 17-3879)
 * is one flat JSON array at the **top level** of the file — no wrapper object, no nested
 * `data`/`operators` key — holding 429 entries, each with exactly these seven fields:
 *
 *   {
 *     "id": "char_003_kalts",
 *     "name": "凯尔希",
 *     "elite": 2,
 *     "level": 90,
 *     "own": true,
 *     "potential": 1,
 *     "rarity": 6
 *   }
 *
 * `id`/`name` are strings, `elite`/`level`/`potential`/`rarity` are numbers and `own` is
 * a real boolean; nothing is null and nothing nests. Only `name`, `id`, `rarity`, `elite`
 * and `own` are read here — MAA writes more than this app needs.
 *
 * `name` is the Chinese name, which is exactly the dictionary's key, and `id` matches the
 * dictionary's `id` for every one of the 137 six-stars in the sample; the sample's
 * six-stars *are* the dictionary, one for one. Entries are resolved by `name` first and
 * by `id` second, so an export that localises `name`, or one that renames an operator
 * without changing its id, still maps.
 *
 * ## The rules, per entry, in this order
 *
 *   1. not an object, or resolves to no dictionary operator, or `rarity !== 6`
 *      -> skipped
 *   2. `elite === 2`                     -> usable: in neither list
 *   3. `elite !== 2` and `own === true`  -> unusable: in `unusable`, never in `excluded`
 *   4. anything else (not owned)         -> excluded: in `excluded`, never in `unusable`
 *
 * The order matters for one self-contradictory entry: `{ "elite": 2, "own": false }` is
 * read as usable, because "elite 2" is the rule the user asked for first. No real export
 * can contain that — MAA writes `elite: 0, level: 0` for an operator it does not own —
 * so the choice only decides what a hand-edited file means. `own` must be literally
 * `true` for rule 3: `"true"` or `1` counts as not owned, again matching the rule as
 * stated rather than guessing at what a file meant.
 *
 * Rule 1 keeps the file's own `rarity` authoritative. The dictionary holds six-stars only,
 * so an entry naming a six-star while claiming another rarity is data this app cannot
 * trust, and skipping it is the honest answer.
 *
 * ## The operators the file does not mention
 *
 * They keep the state they already have. A file can only speak about the operators it
 * contains: a name missing from the export is either an operator that MAA's version does
 * not know yet or one the app added after the export was made, and neither is evidence
 * that the user does not own it. Writing "not in box" for those would silently drop an
 * operator the user had ticked in — the one mistake this screen cannot show — while
 * leaving the mark alone costs at worst one click. It is also what the exclusion
 * convention in `api/types.ts` asks for: an operator nobody has an opinion about stays in
 * the box, which is why a newly added dictionary entry is in the box by default.
 *
 * The previous lists are therefore an optional third argument. Omitting them says "there
 * was nothing there", which leaves every unmentioned operator in the box. When a name is
 * in both previous lists — which nothing should produce — `excluded` wins, because "I do
 * not have it" is the stronger of the two facts.
 */

/** Why an import failed. The page maps each to a catalogue key. */
export type MaaImportError = 'notJson' | 'notArray';

/**
 * The dictionary as this module needs it: `{ [name]: { id } }`.
 *
 * Structural rather than an import of `$lib/core/operators`, so the mapping can be tested
 * against a three-operator dictionary and this module stays free of the real data.
 * `OPERATORS` satisfies it.
 */
export type MaaOperatorDictionary = Readonly<Record<string, { readonly id: string }>>;

/** The two lists an import rewrites. `BoxState` satisfies it. */
export interface MaaBoxLists {
	readonly excluded: readonly string[];
	readonly unusable: readonly string[];
}

/** What an import did, in the order the catalogue sentence wants it. */
export interface MaaImportSummary {
	/** The complete replacement for `box.excluded`, in dictionary order. */
	excluded: string[];
	/** The complete replacement for `box.unusable`, in dictionary order. */
	unusable: string[];
	/** Six-stars the file marks elite 2: these belong in neither list. */
	usable: string[];
	/** How many entries were ignored: not a six-star, or not an operator this app tracks. */
	skipped: number;
	/**
	 * How many entries resolved to one of the dictionary's six-stars.
	 *
	 * Not derivable from the three lists above, because a six-star the file does not own
	 * lands in `excluded` alongside the operators the file never mentioned. Zero is what
	 * "this file has nothing for this app" looks like.
	 */
	matched: number;
}

/** Either the summary, or the one reason the file was refused. */
export type MaaImportOutcome =
	| { ok: true; summary: MaaImportSummary }
	| { ok: false; reason: MaaImportError };

/** The only rarity the app tracks; mirrors `RARITY` in `$lib/core/operators`. */
const TRACKED_RARITY = 6;

/** The promotion at which MAA's export marks a six-star as fieldable. */
const MAX_ELITE = 2;

/**
 * Reads the picked file's text.
 *
 * Two ways to be refused, both values rather than throws: the change handler that calls
 * this has nothing useful to say about an exception.
 */
export function parseMaaExport(
	text: string
): { ok: true; entries: unknown[] } | { ok: false; reason: MaaImportError } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, reason: 'notJson' };
	}

	// An empty array is a valid export with nothing in it, not a refusal: the caller
	// reports it as "no six-stars found", which is a different sentence.
	if (!Array.isArray(parsed)) {
		return { ok: false, reason: 'notArray' };
	}

	return { ok: true, entries: parsed };
}

/**
 * Maps parsed entries onto the two exclusion lists.
 *
 * `previous` has the meaning documented at the top of this file: it is what the
 * unmentioned operators keep.
 */
export function classifyMaaOperators(
	entries: readonly unknown[],
	dictionary: MaaOperatorDictionary,
	previous?: MaaBoxLists
): MaaImportSummary {
	const byName = new Map<string, string>();
	const byId = new Map<string, string>();

	for (const name of Object.keys(dictionary)) {
		byName.set(name, name);
		byId.set(dictionary[name].id, name);
	}

	/** name -> what the file says it is. A later entry overwrites an earlier one. */
	const classified = new Map<string, 'usable' | 'unusable' | 'excluded'>();
	let skipped = 0;
	let matched = 0;

	for (const entry of entries) {
		const fields = asFields(entry);
		if (fields === undefined) {
			skipped += 1;
			continue;
		}

		const name = resolveName(fields, byName, byId);
		if (name === undefined) {
			skipped += 1;
			continue;
		}

		if (fields.rarity !== TRACKED_RARITY) {
			skipped += 1;
			continue;
		}

		matched += 1;

		if (fields.elite === MAX_ELITE) {
			classified.set(name, 'usable');
		} else if (fields.own === true) {
			classified.set(name, 'unusable');
		} else {
			classified.set(name, 'excluded');
		}
	}

	const previousExcluded = new Set(previous?.excluded ?? []);
	const previousUnusable = new Set(previous?.unusable ?? []);

	const excluded: string[] = [];
	const unusable: string[] = [];
	const usable: string[] = [];

	// Emitted by walking the dictionary rather than the file, so both lists contain each
	// name at most once, hold only names the box screen can render, and come out in the
	// dictionary's order — deterministic whatever order the file happened to use.
	for (const name of Object.keys(dictionary)) {
		const state = classified.get(name);

		if (state === 'usable') {
			usable.push(name);
		} else if (state === 'unusable') {
			unusable.push(name);
		} else if (state === 'excluded') {
			excluded.push(name);
		} else if (previousExcluded.has(name)) {
			excluded.push(name);
		} else if (previousUnusable.has(name)) {
			unusable.push(name);
		}
	}

	return { excluded, unusable, usable, skipped, matched };
}

/** The whole import: file text in, the two replacement lists out, or a typed refusal. */
export function importMaa(
	text: string,
	dictionary: MaaOperatorDictionary,
	previous?: MaaBoxLists
): MaaImportOutcome {
	const parsed = parseMaaExport(text);
	if (!parsed.ok) return parsed;

	return { ok: true, summary: classifyMaaOperators(parsed.entries, dictionary, previous) };
}

/**
 * The entry as a bag of fields, or `undefined` for anything that is not a JSON object.
 *
 * Left untyped deliberately: every field is compared as `unknown` below, so a truncated
 * or hand-edited file with `"rarity": "6"` or no `elite` at all lands on a documented rule
 * instead of throwing halfway through an import.
 */
function asFields(entry: unknown): Record<string, unknown> | undefined {
	if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
		return undefined;
	}
	return entry as Record<string, unknown>;
}

/** The dictionary name an entry refers to, by `name` first and by `id` second. */
function resolveName(
	fields: Record<string, unknown>,
	byName: ReadonlyMap<string, string>,
	byId: ReadonlyMap<string, string>
): string | undefined {
	const { name, id } = fields;

	if (typeof name === 'string') {
		const resolved = byName.get(name);
		if (resolved !== undefined) return resolved;
	}

	if (typeof id === 'string') {
		const resolved = byId.get(id);
		if (resolved !== undefined) return resolved;
	}

	return undefined;
}
