/**
 * The three actions shared by every generator in the drama family.
 *
 * They live here rather than on one generator because 开局生成器 and 仙术杯 #6/#7/#8
 * all use the same three buttons — for the cups, the button only decides how many
 * operators are picked, since their bans are a fixed list.
 *
 * The order is ascending by level, and it is also the button order on the generate
 * screen: `actions[0]` renders as the primary button and the rest follow it. So 开局
 * leads and the two BP sizes run smallest to largest.
 *
 * 4位BP used to sit between 开局 and 8位BP. It was dropped because it is not a level
 * anyone runs: at level 3 it picks fewer operators than the ordinary 开局 draw is worth
 * reading, and the two remaining sizes bracket it from either side. Its `level` was 3, so
 * nothing else about the draw changes — the ids that remain keep the levels they had.
 */

import type { GeneratorAction } from './types';

export const DRAMA_ACTIONS: readonly GeneratorAction[] = [
	{ id: 'opening', labelKey: 'action.opening', level: 0 },
	{ id: 'bp8', labelKey: 'action.bp8', level: 7 },
	{ id: 'bp16', labelKey: 'action.bp16', level: 15 }
];

/**
 * One action by id.
 *
 * For tests and any other caller that wants a specific button: `DRAMA_ACTIONS[2]` was
 * 8位BP until 4位BP was removed, at which point the same expression silently became
 * 16位BP. A lookup that throws on a bad id cannot drift like that.
 */
export function dramaAction(id: string): GeneratorAction {
	const found = DRAMA_ACTIONS.find((action) => action.id === id);

	if (found === undefined) {
		throw new RangeError(`unknown drama action ${id}`);
	}
	return found;
}

/**
 * Label keys for actions that are no longer offered, so old history entries still read.
 *
 * History stores the action id, not its label, and the results 4位BP produced are still in
 * people's state files. Without this the history screen — which prints an unrecognised id as
 * itself rather than guessing — would show a bare `bp4` for every run drawn before the button
 * was removed. The catalogue keeps `action.bp4` for the same reason, and this is the only
 * thing that reads it.
 */
export const RETIRED_ACTION_LABELS: Readonly<Record<string, string>> = {
	bp4: 'action.bp4'
};
