<script lang="ts">
	/**
	 * Renders a generator's `ResultBlock[]`.
	 *
	 * One renderer per block variant, so adding a block type is a compile error
	 * here rather than a string that quietly renders as itself. The generator never
	 * produces markup.
	 *
	 * ## Portrait mode
	 *
	 * When `appearance.avatarMode` is on, every list of operators is drawn as portraits
	 * with the name kept as the tooltip, and the operators that are out of reach — the
	 * banned ones — get a grey wash so the two lists cannot be confused at a glance.
	 *
	 * Two things deliberately keep their names:
	 *
	 *   - the `text` blocks, i.e. the summary. It is the one line a user retypes into a
	 *     chat or a spreadsheet, and a row of pictures cannot be retyped.
	 *   - anything whose text is not a list. Only `names` is swapped, because only that is
	 *     known to be operators.
	 *
	 * With the setting off, every branch below takes the same path it always did.
	 *
	 * ## The used mark
	 *
	 * A `tone: 'pick'` block is interactive: each pick is a control that washes blue when it
	 * is clicked, and washes back when it is clicked again. It is decoration and nothing else
	 * — the seed never reads it — so it lives in the result store and dies with the run it
	 * belongs to.
	 *
	 * What the control *looks* like follows the display mode, because the two modes are
	 * already showing different things: with names on, each pick is a chip, which is the shape
	 * a pick last had when it was a tickbox; with portraits on, the portrait itself is the
	 * control and keeps the square format the rest of the result uses. Only the picks are
	 * controls — a banned operator cannot be fielded at all, so "used" would mean nothing on
	 * one.
	 *
	 * ## No ticks
	 *
	 * There used to be a tickable checklist under each result, one per class, and the
	 * classes were what the picks were grouped by. Both are gone: the picks are one flat
	 * list now, the same shape as the bans, and the only per-run state is the result
	 * itself.
	 */

	import type { ResultBlock } from '$lib/generators/types';
	import OperatorAvatar from '$lib/components/OperatorAvatar.svelte';
	import { copyText } from '$lib/clipboard';
	import { exportText } from '$lib/export-text';
	import { t } from '$lib/i18n';
	import { localizeResultItem, renderText } from '$lib/i18n/names';
	import { appState } from '$lib/stores/app-state.svelte';
	import { resultStore } from '$lib/stores/result.svelte';

	let { blocks }: { blocks: ResultBlock[] } = $props();

	let copiedIndex = $state<number | null>(null);
	let exported = $state(false);

	const avatarMode = $derived(appState.state.appearance.avatarMode);

	/**
	 * The names in a block when it is a plain operator list, and `null` when it is not.
	 *
	 * Returns the list rather than answering a yes/no question, because the template needs
	 * the names themselves and a `block is X` predicate does not narrow `block.text` inside
	 * the markup — `{@const}` binding them once here is what keeps the portrait branch
	 * type-safe without a cast.
	 */
	function operatorListNames(block: ResultBlock): readonly string[] | null {
		if (block.type !== 'copyable') return null;
		return block.text.kind === 'names' ? block.text.names : null;
	}

	/**
	 * Whether a block's operators are banned rather than merely listed.
	 *
	 * Read from the block's own `tone` rather than inferred from its shape: 老缠杯's pool is
	 * a list of names too, and washing those grey would say the opposite of what is true.
	 */
	function isBanned(block: ResultBlock): boolean {
		return block.type === 'copyable' && block.tone === 'ban';
	}

	/**
	 * Whether a block's operators are the run's picks, and so can be marked as used.
	 *
	 * Also read from `tone`, for the same reason: a ban list is a list of names too, and
	 * letting it be clicked would offer to mark an operator as used by a run that cannot
	 * field them.
	 */
	function isPick(block: ResultBlock): boolean {
		return block.type === 'copyable' && block.tone === 'pick';
	}

	async function copy(index: number, text: string): Promise<void> {
		// The flash is the only feedback there is, so it must not appear for a copy
		// the webview refused.
		if (!(await copyText(text))) return;

		copiedIndex = index;
		setTimeout(() => {
			if (copiedIndex === index) copiedIndex = null;
		}, 1500);
	}

	/**
	 * Copies the whole run in the format people paste into a chat.
	 *
	 * The ID comes from the result store rather than the current app state, so editing
	 * your ID after a draw cannot relabel the run you are looking at.
	 */
	async function exportResult(): Promise<void> {
		const current = resultStore.result;
		if (current === null) return;

		if (!(await copyText(exportText(resultStore.identity, current.fields)))) return;

		exported = true;
		setTimeout(() => {
			exported = false;
		}, 1500);
	}
</script>

{#snippet nameRow(
	blockIndex: number,
	names: readonly string[],
	wash: 'out' | undefined,
	markable: boolean
)}
	<div class="flex flex-wrap items-center gap-1.5">
		{#each names as name, itemIndex (itemIndex)}
			<!-- Keyed by position: a list may legitimately name the same operator twice,
			     and two identical keys would throw. `OperatorAvatar` strips the opening
			     mark itself, so the portrait is found even for the marked entry. -->
			{#if markable}
				<!-- The tooltip is only set for the chip: over a portrait the operator's own
				     name is the more useful one, and `OperatorAvatar` already provides it. -->
				<button
					class="mark"
					data-portrait={avatarMode}
					data-marked={resultStore.isMarked(blockIndex, itemIndex)}
					aria-pressed={resultStore.isMarked(blockIndex, itemIndex)}
					title={avatarMode ? undefined : t('result.markUsed')}
					onclick={() => resultStore.toggleMarked(blockIndex, itemIndex)}
				>
					{#if avatarMode}
						<OperatorAvatar {name} mode size="md" {wash} />
					{:else}
						{localizeResultItem(name)}
					{/if}
				</button>
			{:else}
				<OperatorAvatar {name} mode size="md" {wash} />
			{/if}
		{/each}
	</div>
{/snippet}

<div class="flex flex-col gap-3">
	{#each blocks as block, index (index)}
		{#if block.type === 'text'}
			<p class="text-base leading-relaxed">{renderText(block.text)}</p>
		{:else if block.type === 'copyable'}
			{@const operatorNames = operatorListNames(block)}
			{@const markable = isPick(block)}
			<div>
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-semibold">{renderText(block.label)}</h2>
					<button class="btn px-2 py-1 text-xs" onclick={() => copy(index, renderText(block.text))}>
						{copiedIndex === index ? t('result.copied') : t('result.copy')}
					</button>
				</div>

				<!-- Portrait mode draws a row for any operator list; with names on, only a markable
				     block is drawn as a row of controls, because that is the one list where each
				     entry is something to press. -->
				{#if operatorNames !== null && (avatarMode || markable)}
					<div class="mt-1">
						{@render nameRow(index, operatorNames, isBanned(block) ? 'out' : undefined, markable)}
					</div>
				{:else}
					<p class="mt-1 text-sm break-words">{renderText(block.text)}</p>
				{/if}
			</div>
		{:else if block.type === 'note'}
			{#each block.lines as line, lineIndex (lineIndex)}
				<p class="dim text-sm">{renderText(line)}</p>
			{/each}
		{/if}
	{/each}

	<div class="flex items-center gap-2">
		<button class="btn px-3 py-1.5 text-xs" onclick={() => void exportResult()}>
			{exported ? t('result.exported') : t('result.export')}
		</button>
	</div>
</div>

<style>
	/* One pick, as a control.
	 *
	 * With names on it is a chip — the shape a pick had when it was a tickbox, and the shape
	 * the box screen's chips still have. With portraits on it is a bare frame around the
	 * portrait: the chip's padding and outline would make a 2.5rem portrait look like a button
	 * that failed to load, and the answer is not to round the portrait off into a pill either,
	 * because then one list would be drawn in a different format from every other list in the
	 * result. */
	.mark {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid transparent;
		border-radius: 8px;
		background: none;
		color: inherit;
		cursor: pointer;
		user-select: none;
	}

	.mark[data-portrait='false'] {
		gap: 0.35rem;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		border-color: var(--c-border);
		background: var(--c-surface);
		font-size: 0.85rem;
	}

	.mark[data-portrait='false']:hover {
		border-color: var(--c-primary);
	}

	.mark:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	/* The mark itself, and the two shapes it has to take.
	 *
	 * Over a portrait it is a translucent wash drawn *on top*, because the portrait is the
	 * information: the point is to mark the operator, not to hide which one it is.
	 *
	 * Over a chip it is the chip's own fill instead, and emphatically not a layer above the
	 * label. Measured, a 40% blue layer over a name leaves it at 2.4–2.7:1 in every one of the
	 * six schemes — the wash covers the very thing that has to stay readable. Behind the text
	 * the same mix keeps the name at 5:1 or better, and the chip still reads as washed blue.
	 * Opaque-against-the-surface rather than translucent, so the result does not depend on what
	 * happens to be behind the chip. */
	.mark[data-portrait='false'][data-marked='true'] {
		background: color-mix(in srgb, var(--c-mark) 40%, var(--c-surface));
		border-color: var(--c-mark);
	}

	.mark[data-portrait='true'][data-marked='true']::after {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: color-mix(in srgb, var(--c-mark) 40%, transparent);
		content: '';
		pointer-events: none;
	}
</style>
