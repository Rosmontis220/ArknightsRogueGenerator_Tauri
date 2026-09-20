<script lang="ts">
	/**
	 * Renders one icon from `$lib/icons`.
	 *
	 * A single branch for every icon: they are all stroked path lists, so this stays
	 * a data-driven component rather than a markup generator.
	 *
	 * `aria-hidden` is set because every icon here sits next to a text label. An icon
	 * that ever carries meaning on its own needs its own accessible name instead.
	 */

	import { ICON_PATHS, type IconName } from '$lib/icons';

	let { name, size = '20px' }: { name: IconName; size?: string } = $props();

	const paths = $derived(ICON_PATHS[name]);
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>
