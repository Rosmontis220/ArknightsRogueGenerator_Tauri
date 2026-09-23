/**
 * The generator registry.
 *
 * Every cup's rule set is its own {@link GeneratorDefinition}, and this module is
 * the only place that knows the full list. The generate screen renders whatever is
 * in here, so adding a generator is one entry plus its own module — no screen
 * changes, and no `switch` on an id anywhere in the UI.
 */

import { laochanGenerators } from './laochan';
import { openingGenerator } from './opening';
import { skywalkingGenerators } from './skywalking';
import type { GeneratorDefinition } from './types';
import { xianshuGenerators } from './xianshu';

/**
 * Registration order decides the order of the generate screen's entry list.
 *
 * Families are listed as whole blocks — 仙术杯's eleven editions, then 老缠杯's three, then
 * 通天国际联赛's two — because a family's editions have to stay adjacent for
 * {@link generatorTabs} to collapse them into one tab.
 */
export const generators: readonly GeneratorDefinition[] = [
	openingGenerator,
	...xianshuGenerators,
	...laochanGenerators,
	...skywalkingGenerators
];

/** The generator the generate screen opens on. */
export const defaultGeneratorId = 'opening';

/**
 * The generator to fall back to.
 *
 * Falling back rather than throwing because the selected id lives in a file the user
 * can edit: a stale one should land on something usable, not a blank screen.
 */
function fallbackGenerator(): GeneratorDefinition {
	const found =
		generators.find((generator) => generator.id === defaultGeneratorId) ?? generators[0];

	if (found === undefined) {
		throw new Error('the generator registry is empty');
	}
	return found;
}

/**
 * A generator id as it arrives from the outside world.
 *
 * `null` is included because `URLSearchParams.get` returns it for a missing
 * parameter, and that is where the generate screen's id comes from — requiring every
 * call site to coalesce first only moves the chance of forgetting.
 */
type MaybeId = string | null | undefined;

export function getGeneratorOrUndefined(id: MaybeId): GeneratorDefinition | undefined {
	return generators.find((generator) => generator.id === id);
}

/** The generator for `id`, or the default when it is unknown. */
export function getGenerator(id: MaybeId): GeneratorDefinition {
	return getGeneratorOrUndefined(id) ?? fallbackGenerator();
}

/** The id {@link getGenerator} would settle on. */
export function resolveGeneratorId(id: MaybeId): string {
	return getGenerator(id).id;
}

/**
 * Every generator in one family, in registration order.
 *
 * A generator with no family is its own single-member group, which is what keeps
 * the tab strip uniform: it never has to special-case "standalone".
 */
export function familyOf(id: MaybeId): readonly GeneratorDefinition[] {
	const generator = getGeneratorOrUndefined(id);
	if (generator === undefined || generator.family === undefined) {
		return generator === undefined ? [] : [generator];
	}

	return generators.filter((candidate) => candidate.family === generator.family);
}

/** One entry in the generate screen's horizontal tab strip. */
export interface GeneratorTab {
	/** Stable key: the family name, or the generator's id when standalone. */
	key: string;
	/** i18n key for the label — the family's name for a group, not its first member's. */
	labelKey: string;
	/** Every edition under this tab, in registration order. */
	members: readonly GeneratorDefinition[];
}

/**
 * The tab strip: standalone generators are their own tab, generators sharing a
 * family collapse into one tab with per-edition sub-tabs (仙术杯 #6 / #7 / #8).
 */
export function generatorTabs(): readonly GeneratorTab[] {
	const tabs: GeneratorTab[] = [];
	const seenFamilies = new Set<string>();

	for (const generator of generators) {
		if (generator.family === undefined) {
			tabs.push({ key: generator.id, labelKey: generator.nameKey, members: [generator] });
			continue;
		}
		if (seenFamilies.has(generator.family)) continue;

		seenFamilies.add(generator.family);
		tabs.push({
			key: generator.family,
			labelKey: generator.familyNameKey ?? generator.nameKey,
			members: familyOf(generator.id)
		});
	}

	return tabs;
}
