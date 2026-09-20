/**
 * The drama core: the algorithm shared by 开局生成器 and 仙术杯 #6/#7/#8.
 *
 * Three concerns meet here and are deliberately kept apart:
 *
 *   - reading options (the `GeneratorContext` argument),
 *   - computing the result (this function),
 *   - shaping it for display ({@link dramaBlocks}).
 *
 * Splitting them is what makes the algorithm testable: the outcome is structured
 * data, so a test can assert the rogue, the squad, the opening operator, the ban order
 * and the per-job pick order directly instead of comparing rendered markup.
 *
 * ## The invariant that matters
 *
 * The caller derives one seed per run and this function reuses it for *every*
 * decision — rogue, squad, opening operator, each ban, each pick. Nothing re-derives
 * and nothing perturbs it.
 *
 * ## Levels
 *
 * Levels are not the pick counts on the buttons: the ban loop runs `level + 1` times
 * and the pick loop `level` times (plus the opening operator), so 1/4/8/16 picks are
 * levels 0/3/7/15.
 *
 * ## Rules
 *
 * The cup editions are this same algorithm with a few constraints layered on, which
 * is why they are expressed as {@link DramaRules} rather than by copying the whole
 * function. With no rules this is the plain drama draw, whose shape rules
 * `opening.test.ts` checks across a fixed 3072-case input matrix.
 */

import { getRogueName, getRogueTeam, JOB_TEAM_LIST } from '../core/rogues';
import { t } from '../i18n';
import { namesAsText } from './format';
import type { GeneratorContext, OperatorIndex, ResultBlock, TextSpec } from './types';
import { buildWeightedBanPool, removeAll } from './weighted';

/**
 * Which two jobs a job squad draws its opening operator from.
 *
 * The four squads are the ones that exist in every theme. The pairing is a fixed table
 * rather than something derived, because it is a fact about those four squads; every
 * other squad falls back to the whole box (see `openingCandidates`).
 */
const TEAM_JOBS: Readonly<Record<string, readonly [string, string]>> = {
	突击战术分队: ['先锋', '近卫'],
	堡垒战术分队: ['重装', '辅助'],
	远程战术分队: ['狙击', '医疗'],
	破坏战术分队: ['术师', '特种']
};

/** What a cup edition changes about the shared algorithm. */
export interface DramaRules {
	/** Locks the rogue, ignoring the enabled set. A cup's theme is not the user's. */
	readonly forcedRogueId?: number;
	/**
	 * Locks the squad, ignoring the theme's own squad list and {@link CommonOptions.isJobTeamOnly}.
	 *
	 * A cup that always runs the same squad is not a cup whose squad should be drawn. Only
	 * the draw is skipped, never the squad's effect: the opening pool is still narrowed by
	 * `TEAM_JOBS`, so a pinned 矛头分队 still means "any job" and a pinned job squad would
	 * still restrict the opener.
	 */
	readonly forcedTeamName?: string;
	/**
	 * Names removed from the whole pipeline before anything is drawn: no opening
	 * draw, no pick pool. They are still listed in the ban list, which is where
	 * they belong.
	 */
	readonly preBanned?: readonly string[];
	/**
	 * Replaces the ban loop with this exact list.
	 *
	 * 仙术杯 #6/#7 ban a fixed tournament-wide operator rather than drawing one, so
	 * their ban count is a constant and does not follow the action's level.
	 */
	readonly fixedBans?: readonly string[];
	/**
	 * Copies per name in the ban pool; default 1. Multiplies how often a name can be
	 * drawn, which is what gives 仙术杯 #8's bounties their effect.
	 */
	readonly banWeights?: Readonly<Record<string, number>>;
	/**
	 * Copies per name in the *opening* pool; default 1.
	 *
	 * 老缠杯 #1 makes two operators five times as likely to come up as the opening
	 * operator. Like {@link DramaRules.banWeights} this is slot duplication rather than a
	 * probability, so the draw stays a pure function of the seed.
	 */
	readonly openingWeights?: Readonly<Record<string, number>>;
}

/** The six-star pool, split per job and flattened. */
interface Box {
	byJob: Record<string, string[]>;
	list: string[];
}

/**
 * The six-star operators that are in the box.
 *
 * Order is load-bearing: it is `OPERATORS_STAR_6_LIST` with the excluded names removed.
 * That list is itself the jobs in iteration order with dictionary order inside each, so
 * rebuilding it as a per-job filter has to yield the identical sequence — bans and picks
 * index into the result with `hash % length`, so any reordering changes every draw.
 */
function buildBox(operators: OperatorIndex, excluded: ReadonlySet<string>): Box {
	const byJob: Record<string, string[]> = {};
	const list: string[] = [];

	for (const job of operators.jobs) {
		const inBox = operators.byStar['6'][job].filter((name) => !excluded.has(name));
		byJob[job] = inBox;
		list.push(...inBox);
	}

	return { byJob, list };
}

/** The pool the opening operator is drawn from, narrowed by the chosen squad. */
function openingCandidates(box: Box, teamName: string): string[] {
	const jobs = TEAM_JOBS[teamName];

	return jobs === undefined ? [...box.list] : [...box.byJob[jobs[0]], ...box.byJob[jobs[1]]];
}

/**
 * Drops jobs whose pool has been emptied.
 *
 * Both the box and the pick counters are pruned together, because the pick loop uses
 * `picksCount` to decide which job still needs operators.
 */
function dropEmptyJobs(box: Record<string, string[]>, counts: Record<string, number>): void {
	for (const job of Object.keys(box)) {
		if (box[job].length === 0) {
			delete box[job];
			delete counts[job];
		}
	}
}

/**
 * Removes the first occurrence of `value`.
 *
 * The `index >= 0` guard is what stops an absent `value` from removing the *last*
 * element instead: `indexOf` returns -1 and `splice(-1, 1)` deletes from the end. That
 * cannot happen for the call sites here — each value is drawn from the very pool it is
 * removed from — so the guard is behaviour-preserving rather than a fix, and it keeps
 * the -1 case from turning into "remove an unrelated operator" if a future change ever
 * breaks that reasoning.
 */
function removeFirst(list: string[], value: string): void {
	const index = list.indexOf(value);
	if (index >= 0) {
		list.splice(index, 1);
	}
}

/** The structured outcome, before it is turned into headline text and blocks. */
export interface DramaOutcome {
	level: number;
	rogueName: string;
	teamName: string;
	openingOperator: string;
	/** Operators removed from this run, in removal order. */
	bans: string[];
	/** Job -> chosen operators, in choice order. Empty jobs are omitted. */
	picks: Record<string, string[]>;
	/**
	 * Every pick in the order it was taken, the opening operator first.
	 *
	 * The per-job map above is how the algorithm keeps the classes even; this is how the
	 * result is *read*, because the picks are shown as one flat list and a BP's picks are
	 * meaningful in the order they were taken. Rebuilding it from the map would lose that
	 * order and could only guess.
	 */
	pickOrder: string[];
	/** Six-star operators the user has excluded from their box. */
	notInBox: string[];
	/** True when the box ran dry before the action's pick count was reached. */
	exhausted: boolean;
}

/**
 * Runs one drama generation.
 *
 * @param level The action's level (0 / 3 / 7 / 15), not its pick count.
 * @throws RangeError when there is nothing to draw from — no enabled rogue, or an
 *   empty six-star pool. Letting the draw proceed would compute `undefined` and render
 *   the literal string "undefined" into the result; failing at the source is the only
 *   way that stays debuggable.
 */
export function runDrama(
	ctx: GeneratorContext,
	level: number,
	rules: DramaRules = {}
): DramaOutcome {
	const operators = ctx.operators;
	const seed = ctx.seed;
	const preBanned = rules.preBanned ?? [];

	// Both reasons keep an operator out of the run. "I do not have it" and "I have it but
	// cannot field it yet" are different facts about the user's account — which is why
	// they are stored separately and reported separately below — but they agree on the
	// one thing that matters here: neither may appear in a drawn run.
	const userExcluded = new Set([...ctx.box.excluded, ...ctx.box.unusable]);
	const excluded = new Set([...userExcluded, ...preBanned]);

	const box = buildBox(operators, excluded);
	// Listed from `excluded` alone, not from `userExcluded`: a pre-banned operator *is* in
	// the user's box and saying otherwise would be a lie about their own settings, and an
	// unusable operator is in the box too — it is just not fieldable. This list is what
	// the 「不在 box 里」 note renders, so it has to mean exactly that.
	const notInBox = operators.star6.filter((name) => ctx.box.excluded.includes(name));

	if (box.list.length === 0) {
		throw new RangeError(
			preBanned.length === 0
				? t('error.boxEmpty')
				: t('error.boxEmptyExceptPreBanned', { names: preBanned.join('、') })
		);
	}

	// Two different pools are in play here, and conflating them is the easiest way to
	// get this wrong:
	//
	//   openingPool — what the opening operator is drawn from. "Recruit a support
	//                 unit" widens this to the whole dictionary, minus the pre-bans.
	//   dramaBox    — what bans and picks draw from. This is ALWAYS the user's actual
	//                 box: the widening above applies to the opening draw only, and the
	//                 exclusions are applied again when the working box is built below.
	//
	// The consequence is deliberate: with support units on, the opening operator may
	// come from outside the box, and is then pushed back into the working box by the
	// block below so it can still crowd out a pick. A pre-banned operator is excluded
	// from the widened pool too — it is out of the whole pipeline.
	const openingPool = ctx.common.isSupportUnitEnabled
		? buildBox(operators, new Set(preBanned))
		: box;

	if (rules.forcedRogueId === undefined && ctx.common.enabledRogueIds.length === 0) {
		throw new RangeError(t('error.noRogueEnabled'));
	}

	const rogueName =
		rules.forcedRogueId === undefined
			? seed.pick(ctx.common.enabledRogueIds.map((id) => getRogueName(id)))
			: getRogueName(rules.forcedRogueId);
	// A pinned squad short-circuits both branches. Nothing is re-derived by the draw that did
	// not happen: the run reuses one hash for every decision and no step perturbs it, so every
	// index below is the index it would have been anyway. What a pin changes is the opening
	// *candidate pool* — 矛头分队 is not in `TEAM_JOBS`, so the opener ranges over the whole box
	// instead of the two classes a job squad would have restricted it to — and, through which
	// name the opener removes from the pools, the draws that come after it.
	const teamName =
		rules.forcedTeamName ??
		(ctx.common.isJobTeamOnly ? seed.pick(JOB_TEAM_LIST) : getRogueTeam(rogueName, seed.value));

	// Reachable from the UI: exclude every six-star of two jobs and draw the squad
	// that needs exactly those two. An empty candidate list would index to `undefined`
	// and render the literal string "undefined"; naming the squad is the difference
	// between "the app is broken" and "this squad has nobody left".
	const candidates = openingCandidates(openingPool, teamName);
	if (candidates.length === 0) {
		throw new RangeError(t('error.teamEmpty', { team: teamName }));
	}

	// Weighting here duplicates entries rather than drawing twice: `seed.pick` is
	// `pool[hash % pool.length]`, so a name occupying five slots comes up five times as
	// often and the draw stays reproducible. The *result* is still the name, not a slot.
	const openingPoolWeighted =
		rules.openingWeights === undefined
			? candidates
			: buildWeightedBanPool(candidates, rules.openingWeights);

	const openingOperator = seed.pick(openingPoolWeighted);

	// Working copies that get drawn down as operators are taken, so that a ban
	// removes an operator from the later pick pool too.
	const dramaBox: Record<string, string[]> = {};
	for (const job of operators.jobs) {
		dramaBox[job] = [...box.byJob[job]];
	}
	const dramaPool = [...box.list];

	if (ctx.common.isSupportUnitEnabled) {
		// Put a not-in-box opening operator back into the working box, then let it
		// leave the draw pool again on the next line.
		for (const job of operators.jobs) {
			if (operators.byStar['6'][job].includes(openingOperator)) {
				if (!dramaBox[job].includes(openingOperator)) {
					dramaBox[job].push(openingOperator);
				}
				if (!dramaPool.includes(openingOperator)) {
					dramaPool.push(openingOperator);
				}
				break;
			}
		}
	}

	removeFirst(dramaPool, openingOperator);

	const picks: Record<string, string[]> = {};
	// Every pick in the order taken, which is what the flat PICK list shows. Built
	// alongside the per-job map rather than derived from it, because the map has already
	// lost the interleaving by the time it is returned.
	const pickOrder: string[] = [];
	const picksCount: Record<string, number> = {};
	for (const job of operators.jobs) {
		picks[job] = [];
		picksCount[job] = 0;
	}

	dropEmptyJobs(dramaBox, picksCount);

	// The opening operator is this run's first pick, and leaves the pool.
	for (const job of operators.jobs) {
		if (operators.byStar['6'][job].includes(openingOperator)) {
			picks[job].push(`${openingOperator}（开局）`);
			pickOrder.push(`${openingOperator}（开局）`);
			picksCount[job] += 1;

			// The job survives `dropEmptyJobs` here because it contains the opening
			// operator, but the guard on presence below stays: the opening operator is
			// not assumed to still be in `dramaBox`.
			const index = job in dramaBox ? dramaBox[job].indexOf(openingOperator) : -1;
			if (index > -1) {
				dramaBox[job].splice(index, 1);
			}
			break;
		}
	}

	const bans: string[] = [];

	if (rules.fixedBans !== undefined) {
		// The ban loop is skipped entirely, not merely overridden: a cup's ban list is
		// a fact about the tournament, not a draw that happens to have one element.
		bans.push(...rules.fixedBans);
	} else {
		let banPool: string[] = dramaPool;
		if (rules.banWeights !== undefined) {
			banPool = buildWeightedBanPool(dramaPool, rules.banWeights);
		}
		// When the pool is unweighted it *is* `dramaPool`, which holds one entry per
		// name, so removing the name from `banPool` has already removed it from
		// `dramaPool`; the second removal only matters when weights expanded the pool.
		const weighted = banPool !== dramaPool;

		// Bans: `level + 1` of them, each drawn with the same seed and removed from
		// every pool so it cannot be picked later.
		for (let i = 0; i <= level && level > 0 && banPool.length > 0; i++) {
			const banned = banPool[seed.pickIndex(banPool.length)];
			bans.push(banned);

			removeAll(banPool, banned);
			if (weighted) {
				removeFirst(dramaPool, banned);
			}

			for (const job of Object.keys(dramaBox)) {
				if (dramaBox[job].includes(banned)) {
					dramaBox[job].splice(dramaBox[job].indexOf(banned), 1);
					break;
				}
			}
		}
	}

	dropEmptyJobs(dramaBox, picksCount);

	// Picks: `level` of them, spread across the jobs that are furthest behind.
	let pickedByLoop = 0;
	for (let i = 1; i <= level && Object.keys(dramaBox).length > 0; i++) {
		const jobs = Object.keys(picksCount);
		const maxPicked = Math.max(...Object.values(picksCount));

		let notPickedJobs = jobs.filter((job) => picksCount[job] < maxPicked);
		if (notPickedJobs.length === 0) {
			notPickedJobs = jobs;
		}

		const job = notPickedJobs[seed.pickIndex(notPickedJobs.length)];
		const operator = dramaBox[job].splice(seed.pickIndex(dramaBox[job].length), 1)[0];

		picks[job].push(operator);
		pickOrder.push(operator);
		picksCount[job] += 1;
		pickedByLoop += 1;

		if (dramaBox[job].length === 0) {
			delete dramaBox[job];
			delete picksCount[job];
		}
	}

	for (const job of Object.keys(picks)) {
		if (picks[job].length === 0) {
			delete picks[job];
		}
	}

	return {
		level,
		rogueName,
		teamName,
		openingOperator,
		bans,
		picks,
		pickOrder,
		notInBox,
		// The "the box ran dry" notice compares the expected pick count against what
		// was actually drawn: one opening pick plus the loop's picks.
		exhausted: level + 1 > 1 + pickedByLoop
	};
}

/**
 * The blocks every drama result shares: the not-in-box note, the ban list, the
 * picks and the exhausted notice.
 *
 * The summary differs per generator — a cup names its locked theme and its fixed ban
 * — so it is passed in rather than derived here.
 *
 * Every string here is a message *key* rather than a finished sentence. Composing the
 * sentence inside the generator would fix it to whatever language the generator happened
 * to be written in, and the history screen has to re-render it in the reader's language.
 * The proper nouns travel as `{kind: 'name'}`-style specs so the joining punctuation is
 * chosen at render time too — `先锋：A、B` and `Vanguard: A, B` share no separator.
 */
export function dramaBlocks(summary: TextSpec, outcome: DramaOutcome): ResultBlock[] {
	const blocks: ResultBlock[] = [{ type: 'text', text: summary }];

	if (outcome.notInBox.length > 0) {
		blocks.push({
			type: 'note',
			lines: [
				{
					kind: 'key',
					key: 'result.notInBox',
					params: {
						count: outcome.notInBox.length,
						names: { kind: 'names', names: outcome.notInBox }
					}
				}
			]
		});
	}

	if (outcome.bans.length > 0) {
		blocks.push({
			type: 'copyable',
			// Out of reach: greyed out with portraits on, and never interactive.
			tone: 'ban',
			label: {
				kind: 'key',
				key: 'result.removeBans',
				params: { count: outcome.bans.length }
			},
			text: { kind: 'names', names: outcome.bans }
		});
	}

	if (outcome.pickOrder.length > 0) {
		// One flat list, in the order the picks were taken — the same shape as the ban
		// list above. It used to be a `先锋：A、B；近卫：C` line plus one tickable group per
		// class, which made the picks three times as tall as the bans for no more
		// information, and the class of an operator is on their portrait anyway.
		//
		// `'pick'` is what makes each entry markable as used. It marks the *picks* and not
		// the bans: a banned operator cannot be used in the first place, so a "used" mark on
		// one would be a statement about nothing.
		blocks.push({
			type: 'copyable',
			tone: 'pick',
			label: { kind: 'key', key: 'result.picksHeading' },
			text: { kind: 'names', names: outcome.pickOrder }
		});
	}

	if (outcome.exhausted) {
		blocks.push({ type: 'note', lines: [{ kind: 'key', key: 'result.exhausted' }] });
	}

	return blocks;
}

/** The flat fields every drama result stores for history and copying. */
export function dramaFields(outcome: DramaOutcome): Record<string, string> {
	return {
		opening_rogue_name: outcome.rogueName,
		opening_team_name: outcome.teamName,
		opening_operator_name: outcome.openingOperator,
		bans: namesAsText(outcome.bans),
		picks: namesAsText(outcome.pickOrder)
	};
}
