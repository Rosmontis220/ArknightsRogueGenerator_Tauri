/**
 * The opening generator: the drama core with no cup rules layered on.
 *
 * This is the reference generator of the family: the drama core with no cup rules
 * layered on. Everything else in the family is the same algorithm plus constraints
 * (see `generators/drama.ts`), and `opening.test.ts` checks the shape rules this one
 * owes every session over a fixed input matrix of names, dates, levels, rogue sets,
 * flags and exclusion sets.
 */

import { DRAMA_ACTIONS } from '../actions';
import { dramaBlocks, dramaFields, runDrama, type DramaOutcome } from '../drama';
import type {
	GenerationResult,
	GeneratorContext,
	GeneratorDefinition,
	TextSpec
} from '../types';

/** The shared action list under this generator's own name, and its by-id lookup. */
export { DRAMA_ACTIONS as OPENING_ACTIONS, dramaAction } from '../actions';

/**
 * Runs one opening generation.
 *
 * @throws RangeError when there is nothing to draw from; see `runDrama`.
 */
export function generateOpening(ctx: GeneratorContext, level: number): DramaOutcome {
	return runDrama(ctx, level);
}

/** Turns a {@link DramaOutcome} into renderable blocks and flat fields. */
export function openingResult(ctx: GeneratorContext, outcome: DramaOutcome): GenerationResult {
	// A message key plus its parts, not a finished sentence: see `TextSpec`. The proper
	// nouns stay Chinese here and are substituted at render time, which is what lets the
	// history screen re-render this in another language.
	const summary: TextSpec = {
		kind: 'key',
		key: 'result.summary.opening',
		params: {
			name: ctx.name,
			rogue: { kind: 'name', name: outcome.rogueName },
			team: { kind: 'name', name: outcome.teamName },
			operator: { kind: 'name', name: outcome.openingOperator }
		}
	};

	return {
		generatorId: 'opening',
		summary,
		fields: dramaFields(outcome),
		blocks: dramaBlocks(summary, outcome)
	};
}

/** The generate screen's default generator. */
export const openingGenerator: GeneratorDefinition = {
	id: 'opening',
	nameKey: 'generator.opening.name',
	descriptionKey: 'generator.opening.description',
	icon: 'casino',
	actions: DRAMA_ACTIONS,
	// Every option this generator has is a common one (rogue range, job-team-only,
	// support units), so it declares none of its own.
	options: [],
	defaultOptions: {},
	generate: (ctx, action) => openingResult(ctx, runDrama(ctx, action.level))
};
