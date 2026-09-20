/**
 * The box's three states, and the two gestures that move between them.
 *
 * Lifted out of the box screen because the transition table *is* the contract, and a
 * contract buried in two closures inside a `.svelte` file cannot be tested. It has been
 * re-specified twice — the modifier moved from the secondary button to Ctrl, and then
 * the transitions themselves changed — and both times the only thing that would have
 * caught a mistake was reading the screen carefully.
 *
 * ## Three states, two lists
 *
 * A document stores two lists and derives three states from them, because two of the
 * three are "not in the draw" for different reasons and the user needs to know which:
 *
 *   可使用   'in'        in neither list; the draw may pick them
 *   未拥有   'out'       `excluded`; the user does not have them
 *   不可使用 'unusable'  `unusable`; the user has them but cannot field them
 *
 * `unusable` wins over `excluded` in {@link markOf}, and every writer clears both lists
 * first, so the two can never both hold a name.
 *
 * ## The transition table
 *
 *   from        primary click   Ctrl + click
 *   可使用      -> 未拥有       -> 不可使用
 *   未拥有      -> 可使用       -> 不可使用
 *   不可使用    -> 可使用       -> 未拥有
 *
 * Both gestures are a toggle onto one mark, and 未拥有 is where each lands when its mark
 * is already set: primary toggles 可使用, Ctrl toggles 不可使用. That is why 不可使用 +
 * Ctrl goes to 未拥有 and not back to 可使用 — the gesture un-sets its own mark, and
 * 可使用 was never on.
 */

/** One of the three states a chip can be in. */
export type BoxMark = 'in' | 'out' | 'unusable';

/**
 * The gesture, as a name rather than a boolean.
 *
 * `primary` is a plain left click; `ctrl` is Ctrl + left click, and also the long press
 * that stands in for it on a touch device, where there is no Ctrl to hold.
 */
export type BoxGesture = 'primary' | 'ctrl';

/** What {@link markOf} reads: either list may be absent from an older document. */
export interface BoxLists {
	excluded?: readonly string[];
	unusable?: readonly string[];
}

/** Which of the three states one operator is in. */
export function markOf(box: BoxLists, name: string): BoxMark {
	if ((box.unusable ?? []).includes(name)) return 'unusable';
	return (box.excluded ?? []).includes(name) ? 'out' : 'in';
}

/**
 * Where a gesture takes a chip, as a pure function of where it is now.
 *
 * Split from {@link setMark} so the table above can be tested without a store, a
 * component or a document.
 */
export function nextMark(from: BoxMark, gesture: BoxGesture): BoxMark {
	if (gesture === 'ctrl') return from === 'unusable' ? 'out' : 'unusable';
	return from === 'in' ? 'out' : 'in';
}

/**
 * Writes a mark into the two lists, creating them if the document lacks them.
 *
 * `normalizeState` fills the defaults and the Rust side carries `#[serde(default)]`, but
 * this is the module that *writes* the lists, so it must not depend on either having
 * happened.
 */
export function setMark(
	box: { excluded?: string[]; unusable?: string[] },
	name: string,
	mark: BoxMark
): void {
	box.excluded ??= [];
	box.unusable ??= [];

	removeFrom(box.excluded, name);
	removeFrom(box.unusable, name);

	if (mark === 'out') box.excluded.push(name);
	else if (mark === 'unusable') box.unusable.push(name);
	// 'in' is the two removals above: in the box means in neither list.
}

function removeFrom(list: string[], name: string): void {
	const index = list.indexOf(name);
	if (index >= 0) list.splice(index, 1);
}
