/**
 * 老缠杯 (LAO CHAN BEI), as a family of three editions.
 *
 * ## The editions are not three of the same thing
 *
 * This is the part that is easy to get wrong, so it is stated first: #1 and #3 are
 * *drama* editions and #2 is a *pool* edition, and they do not share a result shape.
 *
 * | edition | theme                  | squad        | opening + BP | operator pool                    |
 * |---------|------------------------|--------------|--------------|----------------------------------|
 * | #1      | 探索者的银凇止境 (萨米)  | 矛头分队 (fixed) | yes       | none                             |
 * | #2      | 萨卡兹的无终奇语        | none         | none         | twelve, drawn from all six-stars |
 * | #3      | 岁的界园志异 (界园)     | drawn        | yes          | none                             |
 *
 * An earlier revision gave all three both halves: a full drama run *and* a pool of ten
 * or twelve. That was wrong in both directions. #1 and #3 are ordinary drama draws with
 * a pinned theme — the event's operator limit is not one of their rules — and #2 is
 * nothing *but* the twelve-operator draw: its theme is pinned and shown, but there is no
 * opening operator and no BP.
 *
 * #1 is also pinned to 矛头分队, which is the event's rule rather than the user's setting,
 * so it is applied the same way the theme is — see {@link LAOCHAN_1_TEAM}.
 *
 * ## What the pool means
 *
 * #2's twelve are the whole run's roster: no other six-star may be fielded. That is the
 * same "available this run" mechanic the other two editions are described with, and it is
 * why the draw is exhaustive rather than a suggestion.
 *
 * ## Why #2 ignores the box
 *
 * #1 and #3 run through the drama core, so they honour the user's box like every other
 * generator. #2 does not: its twelve are drawn from the whole six-star dictionary, and
 * whether the user owns or can field any of them is not consulted. That is the event's
 * rule rather than an oversight — the point of the draw is the hand the tournament deals,
 * not the hand the player happens to own — so it is the one draw in the app that reads
 * `operators.star6` directly. `box` is deliberately not a parameter of
 * {@link drawLaochanPool}.
 *
 * ## Why the pool draw derives seeds
 *
 * The pool is N *distinct* operators: "this run may use these twelve" is a list of twelve
 * different operators, so a name is taken out of the pool once it is in. That needs a
 * derived child seed per draw, because one seed against a pool of a fixed length would
 * land on the same index every time and hand out one operator N times.
 *
 * ## The pool's source
 *
 * The pool normally comes from the whole six-star dictionary. One identity substitutes a
 * fixed pair instead — see {@link isLaochanEasterEgg}, which is the only place that decides
 * it. Nothing announces the substitution anywhere, and the trigger is not written down in
 * this file or in any document that ships: the pool a user sees is the whole of it.
 */

import { ROGUE_ID_JIEYUAN, ROGUE_ID_SAMI, ROGUE_ID_SARKAZ, getRogueName } from '../../core/rogues';
import { sha256 } from '../../core/sha256';
import { DRAMA_ACTIONS } from '../actions';
import { dramaBlocks, dramaFields, runDrama } from '../drama';
import { namesAsText } from '../format';
import { buildWeightedBanPool, removeAll } from '../weighted';
import type {
	GenerationResult,
	GeneratorAction,
	GeneratorContext,
	GeneratorDefinition,
	ResultBlock,
	TextSpec
} from '../types';

/**
 * The fixed pair one identity draws from, in place of the whole dictionary.
 *
 * ## Why the trigger is stored as a digest
 *
 * The identity that reaches this is a person's handle, and a handle written in the source is
 * a handle the whole world can read off the published repository. So what is stored is the
 * SHA-256 of the handle and the comparison hashes the ID the user typed.
 *
 * This is deliberately *not* a security measure and is not described as one: the input space
 * is a nickname, so anyone determined can confirm a guess. It only keeps the handle out of
 * a source file that is readable for a hundred other reasons.
 */
const LAOCHAN_EASTER_EGG_SHA256 = '0bf7fb591ef70dc70c6d0153621e59dcde68b2df096a26dfc2e52209a7d08ef7';

/**
 * The two operators that pair collapses to.
 *
 * Two genuinely different dictionary entries, which is what makes the hand it produces worth
 * looking at twice. Which two is not a hint to the trigger: the pool is only ever reached by
 * an ID matching the digest above.
 */
const LAOCHAN_EASTER_EGG_POOL: readonly string[] = ['棘刺', '引星棘刺'];

/** True when the configured ID draws from {@link LAOCHAN_EASTER_EGG_POOL} instead. */
export function isLaochanEasterEgg(name: string): boolean {
	return sha256(name) === LAOCHAN_EASTER_EGG_SHA256;
}

/**
 * 老缠杯 #1's squad, fixed by the event rather than drawn.
 *
 * 矛头分队 is one of the squads `TEAM_JOBS` does not narrow, so the opening draw still
 * ranges over the whole box. That is what the weighting below was always written against:
 * 老鲤 and 琳琅诗怀雅 are both 特种, and with the squad pinned there is no longer any
 * branch of the draw in which they are not candidates.
 *
 * Public for the same reason the weights are: it is the edition's data, and a test asserts
 * that #1 reports it whatever the theme's own squad list would have produced.
 */
export const LAOCHAN_1_TEAM = '矛头分队';

/**
 * 老缠杯 #1's opening weighting: how many copies each name occupies in the draw pool.
 *
 * 老鲤 and 琳琅诗怀雅 are five times as likely to come up as the opening operator — the
 * event's own quirk. Copies, not percentages: the generator has no notion of probability,
 * and duplicating an entry is how a multiplier is expressed without breaking determinism
 * (the same device as `XIANSHU_8_BAN_WEIGHTS`).
 *
 * Both are 特种, and #1's pinned 矛头分队 does not narrow by job, so both are always in the
 * candidate pool and always get their five slots. The weights are applied unconditionally:
 * there is no "except in these squads" branch anywhere below, and none is needed.
 *
 * Public because it is the generator's *data* rather than an implementation detail: the
 * tests assert the table directly as well as its effect on the draw, so a wrong number
 * cannot hide behind a plausible-looking hand.
 */
export const LAOCHAN_1_OPENING_WEIGHTS: Readonly<Record<string, number>> = {
	老鲤: 5,
	琳琅诗怀雅: 5
};

/** What the pool edition's draw needs. */
export interface LaochanPoolSpec {
	/** How many six-stars the edition hands the run. */
	readonly poolSize: number;
	/**
	 * Salt for this edition's child seed.
	 *
	 * The pool is the only edition's whole result, but the salt stays explicit: it is what
	 * keeps the draw independent of the run's own seed, so a change to the drama core can
	 * never move this pool.
	 */
	readonly poolSalt: string;
}

/**
 * The editions, as a discriminated union.
 *
 * `kind` rather than optional fields: with `rogueId?: number` a `pool` edition could carry
 * a theme nobody reads, and a `drama` edition could be missing one and draw from the user's
 * enabled set by accident. The union makes each shape's requirements its own.
 */
interface LaochanEditionBase {
	/** The number the event writes, and the tail of the generator id: `1`, `2`, `3`. */
	readonly edition: string;
	/**
	 * The same number as a message-key fragment.
	 *
	 * Separate from `edition` for the same reason 仙术杯's is: the catalogue is a flat
	 * record of dotted strings, so a number that could not be a key fragment (like
	 * `1.5`) must still be able to appear in the id.
	 */
	readonly keySuffix: string;
}

/** An edition that is a full drama run with a pinned theme. */
interface LaochanDramaEdition extends LaochanEditionBase {
	readonly kind: 'drama';
	/** The pinned theme. A cup's theme is the event's, not the user's enabled set. */
	readonly rogueId: number;
	/** The pinned squad, when the event runs exactly one. Absent means it is drawn. */
	readonly forcedTeamName?: string;
	/** Copies per name in the opening pool; absent means an unweighted draw. */
	readonly openingWeights?: Readonly<Record<string, number>>;
}

/** An edition that is only the operator draw. */
interface LaochanPoolEdition extends LaochanEditionBase, LaochanPoolSpec {
	readonly kind: 'pool';
	/**
	 * The pinned theme, recorded and shown but not drawn from.
	 *
	 * #2 pins a theme like the other two — the event is played on it — but has no opening
	 * draw and no BP, so nothing in the algorithm reads it. It is here because the result
	 * states which theme the run is on, and the export prints it.
	 */
	readonly rogueId: number;
}

type LaochanEdition = LaochanDramaEdition | LaochanPoolEdition;

/** Every edition, in the order the generate screen lists them. */
export const LAOCHAN_EDITIONS: readonly LaochanEdition[] = [
	{
		kind: 'drama',
		edition: '1',
		keySuffix: '1',
		rogueId: ROGUE_ID_SAMI,
		forcedTeamName: LAOCHAN_1_TEAM,
		openingWeights: LAOCHAN_1_OPENING_WEIGHTS
	},
	{
		kind: 'pool',
		edition: '2',
		keySuffix: '2',
		rogueId: ROGUE_ID_SARKAZ,
		poolSize: 12,
		poolSalt: 'laochan-2-pool'
	},
	{
		kind: 'drama',
		edition: '3',
		keySuffix: '3',
		rogueId: ROGUE_ID_JIEYUAN
	}
];

/** The i18n key prefix for one edition, e.g. `generator.laochan3`. */
export function laochanKeyPrefix(edition: string): string {
	const spec = LAOCHAN_EDITIONS.find((candidate) => candidate.edition === edition);

	if (spec === undefined) {
		throw new RangeError(`unknown 老缠杯 edition ${edition}`);
	}
	return `generator.laochan${spec.keySuffix}`;
}

/**
 * The edition's drawn pool: `poolSize` distinct six-stars, from the whole dictionary.
 *
 * No box, no availability filter and no error case — see the module note. Both sources are
 * non-empty by construction (the easter-egg pool is a two-entry constant and `star6` is the
 * shipped dictionary), so there is no empty-pool branch to get wrong.
 */
export function drawLaochanPool(ctx: GeneratorContext, spec: LaochanPoolSpec): string[] {
	const source = isLaochanEasterEgg(ctx.name)
		? [...LAOCHAN_EASTER_EGG_POOL]
		: [...ctx.operators.star6];

	const pool = [...source];
	const drawn: string[] = [];

	for (let index = 0; index < spec.poolSize && pool.length > 0; index++) {
		// One child seed per draw: deriving each draw from the edition's child (rather than
		// chaining child onto child) keeps draw `k` independent of how many came before it.
		const seed = ctx.seed.derive(spec.poolSalt).derive(`draw-${index}`);
		const name = pool[seed.value % pool.length];

		drawn.push(name);
		// A drawn name leaves the pool *entirely*. Without this the next seed could land on
		// the same name again, and the pool would name one operator twice: the run may use
		// twelve operators, not one operator twelve times.
		removeAll(pool, name);
	}

	return drawn;
}

/** The number of six-stars edition #2 hands out. */
export const LAOCHAN_POOL_SIZE = 12;

/**
 * The one action the pool edition offers.
 *
 * #2 has no opening draw and no BP, so it does not use {@link DRAMA_ACTIONS}: four buttons
 * that all produce the same twelve operators would be four ways to press one button, and
 * the level they carry would be read by nothing. The id is not `opening`, so the draw is
 * still recorded in history like any other.
 */
const POOL_ACTION: GeneratorAction = {
	id: 'laochan-pool',
	labelKey: 'action.laochanPool',
	level: 0
};

/** The cup headline every edition shares: what varies is the theme, not the sentence. */
function cupSummary(cupNameKey: string, ctx: GeneratorContext, outcome: ReturnType<typeof runDrama>): TextSpec {
	return {
		kind: 'key',
		key: 'result.summary.cup',
		params: {
			cup: { kind: 'key', key: cupNameKey },
			name: ctx.name,
			rogue: { kind: 'name', name: outcome.rogueName },
			team: { kind: 'name', name: outcome.teamName },
			operator: { kind: 'name', name: outcome.openingOperator }
		}
	};
}

/** #1 and #3: an ordinary drama run with a pinned theme and no operator pool. */
function dramaEdition(
	id: string,
	key: string,
	spec: LaochanDramaEdition,
	ctx: GeneratorContext,
	action: GeneratorAction
): GenerationResult {
	const outcome = runDrama(ctx, action.level, {
		forcedRogueId: spec.rogueId,
		forcedTeamName: spec.forcedTeamName,
		openingWeights: spec.openingWeights
	});
	const summary = cupSummary(`${key}.name`, ctx, outcome);

	return {
		generatorId: id,
		summary,
		fields: dramaFields(outcome),
		blocks: dramaBlocks(summary, outcome)
	};
}

/** #2: the twelve-operator draw, on its pinned theme, and nothing else. */
function poolEdition(
	id: string,
	key: string,
	spec: LaochanPoolEdition,
	ctx: GeneratorContext
): GenerationResult {
	const pool = drawLaochanPool(ctx, spec);
	const rogueName = getRogueName(spec.rogueId);

	// `count` selects the `.one` / `.other` variant, which is why it is passed rather than
	// baked into the sentence.
	const summary: TextSpec = {
		kind: 'key',
		key: 'result.summary.laochan',
		params: {
			name: ctx.name,
			rogue: { kind: 'name', name: rogueName },
			count: pool.length
		}
	};

	const blocks: ResultBlock[] = [
		{ type: 'text', text: summary },
		{
			type: 'copyable',
			label: { kind: 'key', key: 'result.laochanPool' },
			text: { kind: 'names', names: pool },
			/*
			 * Markable, like every other pick list. It was tone-less at first, on the reasoning
			 * that marking an operator you have not picked says nothing — but in this edition
			 * the twelve *are* the picks: they are the whole roster, and `fields.picks` below
			 * already stores them under that name, so the export and the history have been
			 * calling them picks all along. Being able to tick off the ones already fielded is
			 * the same convenience the other editions' pick lists offer.
			 */
			tone: 'pick'
		}
	];

	return {
		generatorId: id,
		summary,
		// The theme is recorded, the squad and the opening operator are not: #2 has neither,
		// and the export omits the fields a result does not carry. `picks` is the pool —
		// to a reader it is this run's PICK list, which is what the export prints and what
		// history shows.
		fields: { opening_rogue_name: rogueName, picks: namesAsText(pool) },
		blocks
	};
}

function buildLaochanEdition(spec: LaochanEdition): GeneratorDefinition {
	const id = `laochan-${spec.edition}`;
	const key = `generator.laochan${spec.keySuffix}`;

	return {
		id,
		family: 'laochan',
		familyNameKey: 'generator.laochan.name',
		nameKey: `${key}.name`,
		descriptionKey: `${key}.description`,
		icon: 'theater_comedy',
		actions: spec.kind === 'drama' ? DRAMA_ACTIONS : [POOL_ACTION],
		options: [],
		defaultOptions: {},
		constraintKeys: [`${key}.constraint`],
		generate: (ctx, action) =>
			spec.kind === 'drama'
				? dramaEdition(id, key, spec, ctx, action)
				: poolEdition(id, key, spec, ctx)
	};
}

/** Every edition as a definition, in edition order. The registry lists this. */
export const laochanGenerators: readonly GeneratorDefinition[] =
	LAOCHAN_EDITIONS.map(buildLaochanEdition);

/**
 * One edition by number.
 *
 * Named lookups rather than only the list, because the tests and the registry refer to
 * specific editions and `laochanGenerators[1]` would silently become #3 if an edition were
 * ever inserted.
 */
function edition(editionNumber: string): GeneratorDefinition {
	const found = laochanGenerators.find((generator) => generator.id === `laochan-${editionNumber}`);

	if (found === undefined) {
		throw new RangeError(`unknown 老缠杯 edition ${editionNumber}`);
	}
	return found;
}

export const laochan1Generator = edition('1');
export const laochan2Generator = edition('2');
export const laochan3Generator = edition('3');
