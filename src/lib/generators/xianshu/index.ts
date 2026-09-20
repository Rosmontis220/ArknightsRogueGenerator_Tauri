/**
 * Every 仙术杯 (Theurgy Cup) edition.
 *
 * These are the drama core (`generators/drama.ts`) with tournament constraints on top.
 * Eleven editions share one algorithm, so correctness cannot rest on a spot check: it
 * rests on the rule assertions in `xianshu.test.ts` — the theme each edition pins, which
 * bans are fixed, and the #8 bounty weights.
 *
 * ## One table, one builder
 *
 * Eleven editions differ in only two ways: which theme they pin, and what they do about
 * bans. Writing them as eleven definitions would be eleven chances to put the wrong rogue
 * id in one of them and never notice, because every edition is "a run on some theme" and a
 * wrong theme still produces a plausible result. So the editions are data
 * ({@link XIANSHU_EDITIONS}) and the algorithm is written once
 * ({@link buildXianshuEdition}).
 *
 * | editions        | theme                        | bans                      |
 * |-----------------|------------------------------|---------------------------|
 * | #1, #1.5        | 傀影与猩红孤钻               | drawn per action          |
 * | #2, #2.5, #3    | 水月与深蓝之树               | drawn per action          |
 * | #4, #5          | 探索者的银凇止境（萨米）      | drawn per action          |
 * | #6, #7          | 萨卡兹的无终奇语             | fixed: 维什戴尔           |
 * | #8              | 岁的界园志异                 | drawn, weighted by bounty |
 * | #9              | 沉沦者的黑流树海             | drawn per action          |
 *
 * The cup's own name is a message key rather than a literal (see
 * {@link XIANSHU_EDITIONS}'s `keySuffix`), so all eleven stay one code path while their
 * names remain translatable — 仙术杯 #6 is *Theurgy Cup #6* in English, and the number is
 * the only part that survives translation.
 */

import {
	ROGUE_ID_JIEYUAN,
	ROGUE_ID_MIZUKI,
	ROGUE_ID_PHANTOM,
	ROGUE_ID_SAMI,
	ROGUE_ID_SARKAZ,
	ROGUE_ID_SEABED
} from '../../core/rogues';
import { DRAMA_ACTIONS } from '../actions';
import { dramaBlocks, dramaFields, runDrama, type DramaOutcome } from '../drama';
import type { GenerationResult, GeneratorContext, GeneratorDefinition, TextSpec } from '../types';

/**
 * The operator 仙术杯 #6/#7 ban for the whole run.
 *
 * A fixed tournament ban, not a draw: the ban list is this and nothing else, for
 * every action, because it is a fact about the event rather than a result of the
 * algorithm.
 */
const XIANSHU_FIXED_BANS: readonly string[] = ['维什戴尔'];

/**
 * 仙术杯 #8's bounty table: how many copies each name occupies in the ban pool.
 * Copies, not percentages — the generator has no notion of probability,
 * and duplicating an entry is how a multiplier is expressed without breaking
 * determinism.
 *
 * 电弧 is +300 in the event's terms, the rest +200; the weighting reflects that.
 *
 * Public because it is the generator's *data* rather than an implementation
 * detail: the tests assert the table directly instead of only observing its effect
 * on the draw, so a wrong number cannot hide behind a plausible-looking result.
 */
export const XIANSHU_8_BAN_WEIGHTS: Readonly<Record<string, number>> = {
	电弧: 3,
	麒麟R夜刀: 2,
	斩业星熊: 2,
	凛御银灰: 2,
	酒神: 2,
	望: 2,
	赤刃明霄陈: 2,
	新约能天使: 2
};

interface XianshuEdition {
	/** The number the event writes, and the tail of the generator id: `1`, `1.5`, `9`. */
	readonly edition: string;
	/**
	 * The same number as a message-key fragment.
	 *
	 * Separate from `edition` because `1.5` cannot be part of a key: the catalogue is a
	 * flat record of dotted strings, and `generator.xianshu1.5.name` would read as a
	 * key nested two levels below `xianshu1`.
	 */
	readonly keySuffix: string;
	readonly rogueId: number;
	/** Present only for #6/#7, which ban the same operator in every run. */
	readonly fixedBans?: readonly string[];
	/** Present only for #8, whose bans are weighted by bounty. */
	readonly banWeights?: Readonly<Record<string, number>>;
}

/**
 * Every edition, in the order the generate screen lists them.
 *
 * Ordered by edition rather than grouped by rule shape: the list is a table of contents,
 * and an ordering that followed the implementation would move entries around whenever a
 * rule was added.
 */
export const XIANSHU_EDITIONS: readonly XianshuEdition[] = [
	{ edition: '1', keySuffix: '1', rogueId: ROGUE_ID_PHANTOM },
	{ edition: '1.5', keySuffix: '1_5', rogueId: ROGUE_ID_PHANTOM },
	{ edition: '2', keySuffix: '2', rogueId: ROGUE_ID_MIZUKI },
	{ edition: '2.5', keySuffix: '2_5', rogueId: ROGUE_ID_MIZUKI },
	{ edition: '3', keySuffix: '3', rogueId: ROGUE_ID_MIZUKI },
	{ edition: '4', keySuffix: '4', rogueId: ROGUE_ID_SAMI },
	{ edition: '5', keySuffix: '5', rogueId: ROGUE_ID_SAMI },
	{ edition: '6', keySuffix: '6', rogueId: ROGUE_ID_SARKAZ, fixedBans: XIANSHU_FIXED_BANS },
	{ edition: '7', keySuffix: '7', rogueId: ROGUE_ID_SARKAZ, fixedBans: XIANSHU_FIXED_BANS },
	{ edition: '8', keySuffix: '8', rogueId: ROGUE_ID_JIEYUAN, banWeights: XIANSHU_8_BAN_WEIGHTS },
	{ edition: '9', keySuffix: '9', rogueId: ROGUE_ID_SEABED }
];

/** The i18n key prefix for one edition, e.g. `generator.xianshu6`. */
export function xianshuKeyPrefix(edition: string): string {
	const spec = XIANSHU_EDITIONS.find((candidate) => candidate.edition === edition);

	if (spec === undefined) {
		throw new RangeError(`unknown 仙术杯 edition ${edition}`);
	}
	return `generator.xianshu${spec.keySuffix}`;
}

/** Shared result shaping; all eleven editions produce the same blocks from one outcome. */
function xianshuResult(
	generatorId: string,
	cupKey: string,
	ctx: GeneratorContext,
	outcome: DramaOutcome,
	fixedBan?: readonly string[]
): GenerationResult {
	// The cup's own name is a message key too, so that every edition stays one code path
	// while its name remains translatable.
	const summary: TextSpec = {
		kind: 'key',
		key: 'result.summary.cup',
		params: {
			cup: { kind: 'key', key: cupKey },
			name: ctx.name,
			rogue: { kind: 'name', name: outcome.rogueName },
			team: { kind: 'name', name: outcome.teamName },
			operator: { kind: 'name', name: outcome.openingOperator }
		}
	};

	return {
		generatorId,
		summary,
		fields: {
			...dramaFields(outcome),
			// Only #6/#7 have a tournament-wide ban; the others draw theirs, so recording
			// one would put a claim in history that the run never made.
			...(fixedBan === undefined ? {} : { fixed_ban: fixedBan.join('、') })
		},
		blocks: dramaBlocks(summary, outcome)
	};
}

function buildXianshuEdition(spec: XianshuEdition): GeneratorDefinition {
	const id = `xianshu-${spec.edition}`;
	const key = `generator.xianshu${spec.keySuffix}`;

	return {
		id,
		family: 'xianshu',
		familyNameKey: 'generator.xianshu.name',
		nameKey: `${key}.name`,
		descriptionKey: `${key}.description`,
		icon: 'emoji_events',
		actions: DRAMA_ACTIONS,
		options: [],
		defaultOptions: {},
		constraintKeys: [`${key}.constraint`],
		generate: (ctx, action) =>
			xianshuResult(
				id,
				`${key}.name`,
				ctx,
				runDrama(ctx, action.level, {
					forcedRogueId: spec.rogueId,
					// `#6`/`#7` remove the banned operator from the whole run, not merely from
					// the ban list; the others pass neither and draw bans from the pool as usual.
					preBanned: spec.fixedBans,
					fixedBans: spec.fixedBans,
					banWeights: spec.banWeights
				}),
				spec.fixedBans
			)
	};
}

/** Every edition as a definition, in edition order. The registry lists this. */
export const xianshuGenerators: readonly GeneratorDefinition[] =
	XIANSHU_EDITIONS.map(buildXianshuEdition);

/**
 * One edition by number.
 *
 * Kept as named lookups rather than only the list because the tests refer to specific
 * editions constantly, and `xianshuGenerators[5]` would silently become #7 if an edition
 * were ever inserted.
 */
function edition(editionNumber: string): GeneratorDefinition {
	const found = xianshuGenerators.find((generator) => generator.id === `xianshu-${editionNumber}`);

	if (found === undefined) {
		throw new RangeError(`unknown 仙术杯 edition ${editionNumber}`);
	}
	return found;
}

export const xianshu1Generator = edition('1');
export const xianshu1_5Generator = edition('1.5');
export const xianshu2Generator = edition('2');
export const xianshu2_5Generator = edition('2.5');
export const xianshu3Generator = edition('3');
export const xianshu4Generator = edition('4');
export const xianshu5Generator = edition('5');
export const xianshu6Generator = edition('6');
export const xianshu7Generator = edition('7');
export const xianshu8Generator = edition('8');
export const xianshu9Generator = edition('9');