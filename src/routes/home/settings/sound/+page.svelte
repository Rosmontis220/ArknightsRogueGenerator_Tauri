<script lang="ts">
	/**
	 * 声音. The master volume, as a settings section of its own.
	 *
	 * A slider rather than the row of chips 外观 uses for motion: motion has three named
	 * answers that chips can state outright, whereas a volume is a point on a range and the
	 * number *is* the answer. The percentage is printed beside the handle for the same reason
	 * — a slider on its own cannot say what it is currently set to.
	 *
	 * Every input is written through to the state rather than only the release. The store
	 * debounces the write, so a whole drag still costs one save, and a handle that lagged the
	 * pointer until it was let go would read as broken.
	 *
	 * `event.target` rather than `event.currentTarget`, as on 身份: Svelte 5 delegates the
	 * event to the root node, so `currentTarget` there is that root and not this input.
	 */

	import { t } from '$lib/i18n';
	import { appState } from '$lib/stores/app-state.svelte';

	const volume = $derived(appState.state.sound.volume);

	function setVolume(next: number): void {
		appState.update((state) => {
			state.sound.volume = next;
		});
	}
</script>

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-semibold">{t('sound.volume')}</h2>
		<p class="dim text-xs">{t('sound.help')}</p>
	</div>

	<div class="row">
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			value={volume}
			aria-label={t('sound.volume')}
			oninput={(event) => setVolume(Number((event.target as HTMLInputElement).value))}
		/>
		<span class="value">{volume}%</span>
	</div>
</section>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	input[type='range'] {
		flex: 1;
		accent-color: var(--c-primary);
		cursor: pointer;
	}

	/* Tabular figures, so the row does not shift as the number changes width mid-drag. */
	.value {
		flex: none;
		min-width: 3.5em;
		color: var(--c-text-dim);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
</style>
