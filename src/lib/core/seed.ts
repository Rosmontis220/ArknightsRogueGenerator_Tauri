/**
 * The determinism core: one hash per (name, date), then plain modulo.
 *
 * The app's promise is that "no random numbers are involved" — every result is a
 * pure function of `sha256(name + "_" + today)`. This module keeps that promise
 * mechanically: it is the only place allowed to derive a seed and the only place
 * allowed to turn a seed into an index.
 *
 * Note the shape of the scheme, because it is easy to get subtly wrong: ONE
 * 32-bit hash is derived per run and then reused for every subsequent decision
 * (`% list.length` for the rogue, the team, the opening operator, every ban and
 * every pick). It is not re-hashed between steps, and no step perturbs it. A
 * variant that derived a fresh hash per decision would break the app's central
 * promise: the same name on the same day would stop yielding the same run.
 */

import { sha256 } from './sha256';

/**
 * Formats a date as `2026/9/16`, with no zero padding on month or day.
 *
 * This is spelled out rather than delegated to `toLocaleDateString` on purpose.
 * A locale-derived format makes the seed input locale- and ICU-dependent, and that is
 * fragile in two directions: a small-icu build (as shipped by some Node
 * distributions) throws or falls back to a different pattern, and CLDR has changed
 * the separator used for `zh-CN` before. Both would silently change every generated
 * result. Pinning the format is what makes a run reproducible across machines, and
 * `seed.test.ts` asserts the exact strings.
 *
 * @param date Local-time date; the format above is defined in local time.
 */
export function formatDate(date: Date): string {
	return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Derives the run's 32-bit seed: `parseInt(sha256(`${name}_${date}`).slice(0, 8), 16)`.
 *
 * The first 8 hex characters are the leading 32 bits of the digest, so the
 * result is an unsigned integer in `[0, 2^32)`. `parseInt` is safe here — 2^32 is
 * well inside the exact-integer range of a double.
 *
 * @param name The identity name from settings; the only source of the name part.
 * @param date A string from {@link formatDate} — not a `Date`, so callers cannot
 *   accidentally reintroduce a locale-dependent format.
 */
export function deriveHash(name: string, date: string): number {
	return parseInt(sha256(`${name}_${date}`).slice(0, 8), 16);
}

/**
 * Maps a seed onto a list index: `hash % length`, and never anything else — a
 * different mapping would change every generated result.
 *
 * Exposed separately from {@link pick} because several call sites index mutable
 * working arrays (the per-job pools that get `splice`d as operators are taken),
 * and those need the index rather than the element.
 *
 * @throws RangeError when `length` is 0. `hash % 0` is `NaN`, and indexing a list
 *   with it quietly produces `undefined` — a failure far easier to debug at the
 *   throw site.
 */
export function pickIndex(hash: number, length: number): number {
	if (length <= 0) {
		throw new RangeError(`pickIndex: cannot pick from a list of length ${length}`);
	}
	return hash % length;
}

/** Picks one element from a non-empty list using the run's seed. */
export function pick<T>(list: readonly T[], hash: number): T {
	return list[pickIndex(hash, list.length)];
}

/**
 * A run's seed, as an object rather than a bare number.
 *
 * This shape is fixed because every generator needs the same two
 * guarantees from it: all decisions within a run use the *same* value, and the
 * only way to obtain a different value is an explicit {@link Seed.derive}. A
 * streaming PRNG would be easier to write and would break the promise that the
 * same name on the same day always yields the same run.
 */
export interface Seed {
	/** The 32-bit hash this seed carries. */
	readonly value: number;
	/** `list[value % list.length]`. */
	pick<T>(list: readonly T[]): T;
	/** `value % length`, for call sites that index a mutable working array. */
	pickIndex(length: number): number;
	/**
	 * A child seed: `sha256(`${value}_${salt}`)` truncated to 32 bits.
	 *
	 * Needed by generators that draw repeatedly from a pool they do **not** shrink.
	 * With a fixed value, `value % length` is the same index every time, so ten
	 * draws would return ten copies of one operator rather than ten operators.
	 */
	derive(salt: string): Seed;
}

/** Wraps a raw hash as a {@link Seed}. */
export function makeSeed(value: number): Seed {
	return {
		value,
		pick: (list) => pick(list, value),
		pickIndex: (length) => pickIndex(value, length),
		derive: (salt) => makeSeed(parseInt(sha256(`${value}_${salt}`).slice(0, 8), 16))
	};
}

/**
 * The seed for one run, from the identity name and today's date.
 *
 * Callers derive it once and hand the same object to the generator, rather than
 * letting each generator re-derive from `(name, date)`. One derivation per run is
 * the invariant: the value recorded in history and the value every decision used
 * have to be the same one, and a generator that re-derived could not guarantee it.
 */
export function seedFor(name: string, date: string): Seed {
	return makeSeed(deriveHash(name, date));
}
