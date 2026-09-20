<script lang="ts">
	/**
	 * One operator, drawn as their portrait or as their name.
	 *
	 * The single place that decides between the two, so "portrait mode" cannot end up
	 * half-applied — a screen that rendered names while its neighbour rendered portraits
	 * would be the predictable result of each screen doing its own `if`.
	 *
	 * Three inputs, all required to be explicit rather than defaulted:
	 *
	 *   `mode`   — whether portrait mode is on at all. The caller reads the setting, because
	 *              only the caller knows whether this particular list is exempt. The opening
	 *              recommendation is: it is the line a user retypes elsewhere, so it stays
	 *              as names however the setting is set.
	 *   `wash`   — the wash over the portrait, if any: grey for out of reach (banned in a
	 *              result, or not in the box), green for owned-but-unusable. One prop with
	 *              two values rather than two booleans, because the two are mutually
	 *              exclusive by construction and a pair of flags could describe a state
	 *              that does not exist.
	 *   `size`   — the only visual variation there is.
	 *
	 * A name with no portrait falls back to the name in every mode. That is not a degraded
	 * case to be handled later: the dictionary and the portrait set are two files that can
	 * legitimately disagree, and a name is a complete answer.
	 *
	 * The portrait is looked up under the *bare* name. A pick stores the opening operator as
	 * `维什戴尔（开局）`, which is deliberately not a dictionary key — the mark is a fact about
	 * this run, not about the operator — so looking it up unstripped found nothing and drew
	 * the text name instead of the portrait, in portrait mode, for exactly the one operator
	 * the mark was on.
	 */

	import { operatorAvatarUrl } from '$lib/core/avatars';
	import { baseName, isOpeningPick, localizeResultItem } from '$lib/i18n/names';

	let {
		name,
		mode,
		wash,
		opening = false,
		size = 'md',
		title
	}: {
		/** The stored item, mark and all; the mark is preserved in the label. */
		name: string;
		mode: boolean;
		/** The wash over the portrait, if any; see the stylesheet. */
		wash?: 'out' | 'unusable';
		/** This operator opened the run, so outline it. */
		opening?: boolean;
		size?: 'sm' | 'md' | 'lg';
		/** Overrides the tooltip; defaults to the operator's localised name. */
		title?: string;
	} = $props();

	const url = $derived(mode ? operatorAvatarUrl(baseName(name)) : null);
	const label = $derived(localizeResultItem(name));
	const tooltip = $derived(title ?? label);
	const isOpening = $derived(opening || isOpeningPick(name));
</script>

{#if url === null}
	<span class="name" class:opening={isOpening} title={tooltip}>{label}</span>
{:else}
	<span class="portrait" class:opening={isOpening} data-size={size} data-wash={wash} title={tooltip}>
		<img src={url} alt={label} draggable="false" />
	</span>
{/if}

<style>
	.name {
		white-space: nowrap;
	}

	.portrait {
		position: relative;
		display: inline-block;
		flex: none;
		overflow: hidden;
		border: 1px solid var(--c-border);
		border-radius: 8px;
		background: var(--c-surface-2);
	}

	.portrait[data-size='sm'] {
		width: 1.75rem;
		height: 1.75rem;
	}

	.portrait[data-size='md'] {
		width: 2.5rem;
		height: 2.5rem;
	}

	.portrait[data-size='lg'] {
		width: 4rem;
		height: 4rem;
	}

	.portrait img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* The wash, drawn over the picture. Two of them, and the difference between them is
	 * the point: grey is "out of reach" — banned in a result, or not in the box — while
	 * green is "you own this but cannot field it". Those are not the same fact and must
	 * not look like it, which is why this is one prop with two values rather than a
	 * boolean that a caller could get backwards.
	 *
	 * Both are fixed colours rather than theme tokens, for the reason the tokens
	 * themselves spell out: the meaning has to survive all six schemes, and a token would
	 * have to be re-tuned per theme just to keep saying the same thing.
	 *
	 * Each sits above the image and below nothing, so the portrait underneath stays
	 * visible through it. */
	.portrait[data-wash]::after {
		position: absolute;
		inset: 0;
		content: '';
	}

	.portrait[data-wash='out']::after {
		background: var(--c-mask);
	}

	/* Mixed at the same weight as the grey, so the two washes differ in hue alone — and
	 * mixed here rather than stored pre-mixed, because the same green is also used
	 * opaque behind a name chip on the box screen. */
	.portrait[data-wash='unusable']::after {
		background: color-mix(in srgb, var(--c-unusable) 62%, transparent);
	}

	/* The opening operator, ringed in the accent colour. Portrait mode shows a list of
	 * pictures with no names in it, so the mark that says which one opened the run has to
	 * be carried by the picture — otherwise turning portraits on would be the one setting
	 * that loses the information. */
	.portrait.opening {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px var(--c-primary);
	}

	.name.opening {
		color: var(--c-primary-text);
		font-weight: 600;
	}
</style>
