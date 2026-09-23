/**
 * 通天国际联赛 (Skywalking Global League), as a family of two editions.
 *
 * These are the drama core (`generators/drama.ts`) with a tournament's constraints on
 * top, exactly like the 仙术杯 editions: one data table ({@link SKYWALKING_EDITIONS}) and
 * one builder ({@link buildSkywalkingEdition}), so the two editions cannot drift apart in
 * the code path they share.
 *
 * | edition | theme                  | bans                                    |
 * |---------|------------------------|-----------------------------------------|
 * | #1      | 水月与深蓝之树 (水月)   | drawn per action                        |
 * | #2      | 探索者的银凇止境 (萨米) | fixed: the seventeen named below        |
 *
 * ## Why #2's bans are a fixed list
 *
 * The league published the seventeen operators banned for the whole event. That is a fact
 * about the event rather than a result of the algorithm, so it is data on the edition
 * (`fixedBans`) rather than a draw that happens to have seventeen elements — the same
 * device 仙术杯 #6/#7 use for 维什戴尔. Passing it to the drama core both replaces the
 * per-action ban draw — the ban list is these seventeen and nothing else, identical on
 * every action — and removes them from the whole pipeline, so they can be neither the
 * opening operator nor a pick.
 */

import { ROGUE_ID_MIZUKI, ROGUE_ID_SAMI } from '../../core/rogues';
import { DRAMA_ACTIONS } from '../actions';
import { dramaBlocks, dramaFields, runDrama, type DramaOutcome } from '../drama';
import type { GenerationResult, GeneratorContext, GeneratorDefinition, TextSpec } from '../types';

/**
 * The seventeen operators 通天国际联赛 #2 bans for the whole run, in the order the event
 * published them.
 *
 * Public because it is the generator's *data*: the tests assert the list directly, name
 * for name and in order, so a transposed pair or a dropped name cannot hide behind a
 * plausible-looking result.
 */
export const SKYWALKING_2_FIXED_BANS: readonly string[] = [
	'维什戴尔',
	'逻各斯',
	'魔王',
	'乌尔比安',
	'妮芙',
	'佩佩',
	'娜仁图亚',
	'玛露西尔',
	'维娜·维多利亚',
	'荒芜拉普兰德',
	'忍冬',
	'弑君者',
	'引星棘刺',
	'余',
	'烛煌',
	'隐德来希',
	'死芒'
];

interface SkywalkingEdition {
	/** The number the event writes, and the tail of the generator id: `1`, `2`. */
	readonly edition: string;
	/**
	 * The same number as a message-key fragment.
	 *
	 * Separate from `edition` because the catalogue is a flat record of dotted strings, so
	 * an edition number that could not be a key fragment (仙术杯's `1.5`) must still be
	 * able to appear in the id.
	 */
	readonly keySuffix: string;
	readonly rogueId: number;
	/**
	 * Present only for #2, which bans the same seventeen operators in every run.
	 *
	 * Undefined for #1, which draws its bans per action like any other drama run.
	 */
	readonly fixedBans?: readonly string[];
}

/** Every edition, in the order the generate screen lists them. */
export const SKYWALKING_EDITIONS: readonly SkywalkingEdition[] = [
	{ edition: '1', keySuffix: '1', rogueId: ROGUE_ID_MIZUKI },
	{
		edition: '2',
		keySuffix: '2',
		rogueId: ROGUE_ID_SAMI,
		fixedBans: SKYWALKING_2_FIXED_BANS
	}
];

/** The i18n key prefix for one edition, e.g. `generator.skywalking2`. */
export function skywalkingKeyPrefix(edition: string): string {
	const spec = SKYWALKING_EDITIONS.find((candidate) => candidate.edition === edition);

	if (spec === undefined) {
		throw new RangeError(`unknown 通天国际联赛 edition ${edition}`);
	}
	return `generator.skywalking${spec.keySuffix}`;
}

/** Shared result shaping; both editions produce the same blocks from one outcome. */
function skywalkingResult(
	generatorId: string,
	cupNameKey: string,
	ctx: GeneratorContext,
	outcome: DramaOutcome,
	fixedBan?: readonly string[]
): GenerationResult {
	// The league's name is a message key too, so both editions stay one code path while
	// their names remain translatable.
	const summary: TextSpec = {
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

	return {
		generatorId,
		summary,
		fields: {
			...dramaFields(outcome),
			// Only #2 has an event-wide ban; #1 draws its bans, so recording one would put
			// a claim in history that the run never made.
			...(fixedBan === undefined ? {} : { fixed_ban: fixedBan.join('、') })
		},
		blocks: dramaBlocks(summary, outcome)
	};
}

function buildSkywalkingEdition(spec: SkywalkingEdition): GeneratorDefinition {
	const id = `skywalking-${spec.edition}`;
	const key = `generator.skywalking${spec.keySuffix}`;

	return {
		id,
		family: 'skywalking',
		familyNameKey: 'generator.skywalking.name',
		nameKey: `${key}.name`,
		descriptionKey: `${key}.description`,
		icon: 'emoji_events',
		actions: DRAMA_ACTIONS,
		options: [],
		defaultOptions: {},
		constraintKeys: [`${key}.constraint`],
		generate: (ctx, action) =>
			skywalkingResult(
				id,
				`${key}.name`,
				ctx,
				runDrama(ctx, action.level, {
					forcedRogueId: spec.rogueId,
					// #2's fixed bans leave the whole pipeline, not merely the ban list: the
					// point of the event's ban is that those operators cannot appear in the
					// run at all, opening draw included. #1 passes neither and draws its
					// bans per action as usual.
					preBanned: spec.fixedBans,
					fixedBans: spec.fixedBans
				}),
				spec.fixedBans
			)
	};
}

/** Every edition as a definition, in edition order. The registry lists this. */
export const skywalkingGenerators: readonly GeneratorDefinition[] =
	SKYWALKING_EDITIONS.map(buildSkywalkingEdition);

/**
 * One edition by number.
 *
 * Named lookups rather than only the list, because the tests refer to specific editions
 * and an index would silently become the other edition if one were ever inserted.
 */
function edition(editionNumber: string): GeneratorDefinition {
	const found = skywalkingGenerators.find(
		(generator) => generator.id === `skywalking-${editionNumber}`
	);

	if (found === undefined) {
		throw new RangeError(`unknown 通天国际联赛 edition ${editionNumber}`);
	}
	return found;
}

export const skywalking1Generator = edition('1');
export const skywalking2Generator = edition('2');