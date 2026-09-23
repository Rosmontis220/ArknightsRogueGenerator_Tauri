/**
 * The generate screen's current result, and which of its picks have been used.
 *
 * Out of the page component because both have to survive re-renders and be replaced as one
 * unit when a new run is generated.
 *
 * The used marks are the only per-run state besides the result itself. They are cleared with
 * it, deliberately: a mark means "this one is spent in the run on screen", so carrying it into
 * a fresh draw would make a claim about a run that has not happened. Nothing here feeds back
 * into generation — the mark is a note to the player, and the seed never reads it.
 */

import type { GenerationResult } from '../generators/types';

/**
 * A mark is addressed by *position* — the block's index in `result.blocks` and the item's
 * index within that block — rather than by operator name.
 *
 * Two entries in one run can legitimately name the same operator (老缠杯 draws from a pool),
 * and the player is marking a row on the screen rather than a name in the abstract. Both
 * halves are integers from `Array#entries`, so a colon between them cannot be ambiguous the
 * way it would between arbitrary strings.
 */
function markKey(blockIndex: number, itemIndex: number): string {
	return `${blockIndex}:${itemIndex}`;
}

class ResultStore {
	result = $state<GenerationResult | null>(null);

	/**
	 * The ID the current result was drawn for.
	 *
	 * Kept beside the result instead of being read from the app state when it is needed:
	 * the export has to name the ID the run belongs to, and the user can edit their ID
	 * while a result is still on screen — which would quietly relabel somebody else's run.
	 */
	identity = $state('');

	/** A human-readable failure, or `null`. Mirrors `appState.error`. */
	error = $state<string | null>(null);

	/** The marked picks, as {@link markKey} strings. */
	marked = $state(new Set<string>());

	/** Replaces the result, dropping every mark left over from the previous run. */
	set(result: GenerationResult, identity: string): void {
		this.result = result;
		this.identity = identity;
		this.error = null;
		this.marked = new Set();
	}

	/**
	 * Records a failure.
	 *
	 * The previous result is dropped rather than kept behind the message: showing
	 * a stale run next to "generation failed" invites acting on the wrong one.
	 */
	fail(message: string): void {
		this.result = null;
		this.identity = '';
		this.error = message;
		this.marked = new Set();
	}

	clear(): void {
		this.result = null;
		this.identity = '';
		this.error = null;
		this.marked = new Set();
	}

	isMarked(blockIndex: number, itemIndex: number): boolean {
		return this.marked.has(markKey(blockIndex, itemIndex));
	}

	/**
	 * Marks a pick as used, or takes the mark back.
	 *
	 * Replaced wholesale rather than mutated in place: a `Set` is not deeply reactive, so
	 * `add`/`delete` on the existing one would change the data without telling the template.
	 */
	toggleMarked(blockIndex: number, itemIndex: number): void {
		const next = new Set(this.marked);
		const key = markKey(blockIndex, itemIndex);

		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}

		this.marked = next;
	}
}

export const resultStore = new ResultStore();
