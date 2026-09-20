<script lang="ts">
	/**
	 * An on/off switch, for a single setting that has no third state.
	 *
	 * Modelled on the reference client's `MdSwitch`, which is where the proportions come
	 * from: a 52×32 track, a 16px handle that grows to 24px and slides right when the
	 * switch is on, and a halo on hover. The sizes are not arbitrary — a switch this shape
	 * is read as "on/off" at a glance, where our two-state `chip` buttons read as one of
	 * several choices.
	 *
	 * That distinction is the reason this exists at all. `data-checked` chips are still used
	 * for genuine multi-choice rows (the reduce-motion picker, the box's three states),
	 * because a switch cannot express "one of three". A setting with a single boolean gets a
	 * switch, and the row it sits in is left-aligned text with the switch pushed right.
	 *
	 * `onchange` rather than `bind:checked`: every caller here writes through
	 * `appState.update`, so a two-way binding would give the same state two owners.
	 */

	let {
		checked,
		disabled = false,
		ariaLabel,
		onchange
	}: {
		checked: boolean;
		disabled?: boolean;
		/** Required: the switch has no visible label of its own. */
		ariaLabel: string;
		onchange: (checked: boolean) => void;
	} = $props();

	function toggle(): void {
		if (disabled) return;
		onchange(!checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={ariaLabel}
	{disabled}
	class="switch"
	class:on={checked}
	onclick={toggle}
>
	<span class="track">
		<span class="handle"></span>
	</span>
</button>

<style>
	.switch {
		flex: none;
		width: 52px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
	}

	.switch:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.switch:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	.track {
		position: relative;
		display: block;
		width: 52px;
		height: 32px;
		border: 2px solid var(--c-border);
		border-radius: 9999px;
		background: var(--c-surface-2);
		transition:
			background 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.handle {
		position: absolute;
		top: 50%;
		left: 6px;
		width: 16px;
		height: 16px;
		border-radius: 9999px;
		background: var(--c-text-dim);
		transform: translate3d(0, -50%, 0);
		transition:
			width 180ms ease,
			height 180ms ease,
			left 180ms ease,
			background 180ms ease;
	}

	.switch:hover:not(:disabled) .track {
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--c-primary) 10%, transparent);
	}

	.switch:hover:not(:disabled) .handle {
		width: 20px;
		height: 20px;
		left: 4px;
	}

	.on .track {
		border-color: var(--c-primary);
		background: var(--c-primary);
	}

	.on .handle {
		left: 22px;
		width: 24px;
		height: 24px;
		background: var(--c-on-primary);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.18);
	}

	.on:hover:not(:disabled) .handle {
		left: 20px;
		width: 26px;
		height: 26px;
	}
</style>
