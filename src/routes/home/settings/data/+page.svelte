<script lang="ts">
	import { onMount } from 'svelte';

	import { defaultAppState } from '$lib/api/types';
	import { applyColorScheme } from '$lib/appearance';
	import { t } from '$lib/i18n';
	import { isTauriRuntime, stateFilePath } from '$lib/persistence';
	import { appState } from '$lib/stores/app-state.svelte';

	let filePath = $state<string | null>(null);
	let inTauri = $state(true);

	onMount(async () => {
		inTauri = isTauriRuntime();
		try {
			filePath = await stateFilePath();
		} catch {
			filePath = null;
		}
	});

	function resetAll(): void {
		// Taken from `defaultAppState()` rather than relisted here, so a new setting
		// cannot be added to the defaults and forgotten by this button.
		const defaults = defaultAppState();

		appState.update((state) => {
			state.box = defaults.box;
			state.common = defaults.common;
			state.appearance = defaults.appearance;
			state.generators = defaults.generators;
		});

		// The ID and the history are deliberately kept: one is typed by hand, the other
		// is the only record of past runs, and neither is a "setting".
		applyColorScheme(defaults.appearance.colorScheme);
	}
</script>

<section class="card flex flex-col gap-2 p-4">
	{#if inTauri}
		<p class="dim text-xs">{t('data.storageHelp')}</p>
		<p class="text-xs break-all">{filePath ?? t('data.reading')}</p>
	{:else}
		<p class="text-xs" style="color: var(--c-danger);">
			{t('data.browserFallback')}
		</p>
	{/if}

	<div class="mt-1 flex flex-wrap gap-2">
		<button class="btn px-3 py-1 text-xs" onclick={() => void appState.saveNow()}>
			{t('data.saveNow')}
		</button>
		<button class="btn btn-danger px-3 py-1 text-xs" onclick={resetAll}>
			{t('common.reset')}
		</button>
	</div>

	<p class="dim text-xs">{t('data.resetHelp')}</p>
</section>
