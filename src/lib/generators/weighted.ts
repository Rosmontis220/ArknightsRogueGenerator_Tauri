/**
 * Weighted draw pools.
 *
 * The generator has no notion of probability — every choice is
 * `pool[seed % pool.length]` — so "make this operator three times as likely" cannot
 * be done with a random number without breaking the promise that the same name on
 * the same day always yields the same run.
 *
 * Duplicating an entry achieves it exactly: three copies occupy three slots, so the
 * modulo lands on that name three times as often. There is no separate probability
 * channel to keep in step with the pool — the weights *are* the pool, which is what
 * keeps a weighted draw as reproducible as an unweighted one.
 */

/**
 * Expands `operators` so each name appears `weights[name]` times, defaulting to 1.
 *
 * @param operators Distinct names. Duplicates here would multiply with the weights.
 * @param weights Copies per name; a name absent from the map gets exactly one.
 */
export function buildWeightedBanPool(
	operators: readonly string[],
	weights: Readonly<Record<string, number>>
): string[] {
	return operators.flatMap((name) =>
		Array.from({ length: weights[name] ?? 1 }, () => name)
	);
}

/**
 * Removes every copy of `value`.
 *
 * The weighted counterpart of a plain `splice(indexOf(value), 1)`: a drawn name must
 * leave the pool entirely, otherwise its remaining copies could be drawn again and
 * the same operator would appear twice in the ban list.
 */
export function removeAll(list: string[], value: string): void {
	for (let index = list.length - 1; index >= 0; index--) {
		if (list[index] === value) {
			list.splice(index, 1);
		}
	}
}
