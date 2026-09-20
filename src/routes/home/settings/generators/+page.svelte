<script lang="ts">
	/**
	 * Generator defaults.
	 *
	 * Two layers, matching `AppState`: the options every generator shares live in
	 * `common`, and each generator's own options live in `generators.options[id]`,
	 * rendered from its declared `OptionField[]`. That declaration is what keeps this
	 * screen from needing a hand-written form per generator.
	 */

	import { ROGUE_IDS, getRogueName } from '$lib/core/rogues';
	import Switch from '$lib/components/Switch.svelte';
	import { generators } from '$lib/generators/registry';
	import type { OptionField } from '$lib/generators/types';
	import { t } from '$lib/i18n';
	import { localizeName } from '$lib/i18n/names';
	import { appState } from '$lib/stores/app-state.svelte';

	const common = $derived(appState.state.common);

	function generatorOptions(generatorId: string): Record<string, unknown> {
		return appState.state.generators.options[generatorId] ?? {};
	}

	/** Reads an option, falling back to its declared default. */
	function optionValue(generatorId: string, field: OptionField): unknown {
		const stored = generatorOptions(generatorId)[field.key];
		return stored ?? field.default;
	}

	function setOption(generatorId: string, key: string, value: unknown): void {
		appState.update((state) => {
			const options = (state.generators.options[generatorId] ??= {});
			options[key] = value;
		});
	}

	function toggleRogue(id: number): void {
		appState.update((state) => {
			const index = state.common.enabledRogueIds.indexOf(id);
			if (index >= 0) {
				state.common.enabledRogueIds.splice(index, 1);
			} else {
				state.common.enabledRogueIds.push(id);
				state.common.enabledRogueIds.sort((a, b) => a - b);
			}
		});
	}

	function toggleFlag(key: 'isJobTeamOnly' | 'isSupportUnitEnabled'): void {
		appState.update((state) => {
			state.common[key] = !state.common[key];
		});
	}
</script>

<div class="flex flex-col gap-4">
	<section class="card flex flex-col gap-3 p-4">
		<h2 class="text-sm font-semibold">{t('settings.generators.common')}</h2>
		<p class="dim text-xs">{t('settings.generators.commonHelp')}</p>

		<div class="flex flex-wrap gap-2">
			{#each ROGUE_IDS as id (id)}
				<button
					class="chip"
					data-checked={common.enabledRogueIds.includes(id)}
					onclick={() => toggleRogue(id)}
				>
					{localizeName(getRogueName(id))}
				</button>
			{/each}
		</div>

		<!-- The two shared booleans are rows rather than chips: each is on or off, so a
		     switch says it exactly, where a chip in a row of chips implies company it does
		     not have. The rogue buttons above stay chips — those are genuinely a selection. -->
		<div class="row">
			<div class="row-copy">
				<span class="row-title">{t('settings.generators.jobTeamOnly')}</span>
				<span class="dim text-xs">{t('settings.generators.jobTeamOnlyHelp')}</span>
			</div>
			<Switch
				checked={common.isJobTeamOnly}
				ariaLabel={t('settings.generators.jobTeamOnly')}
				onchange={() => toggleFlag('isJobTeamOnly')}
			/>
		</div>

		<div class="row">
			<div class="row-copy">
				<span class="row-title">{t('settings.generators.supportUnits')}</span>
				<span class="dim text-xs">{t('settings.generators.supportUnitsHelp')}</span>
			</div>
			<Switch
				checked={common.isSupportUnitEnabled}
				ariaLabel={t('settings.generators.supportUnits')}
				onchange={() => toggleFlag('isSupportUnitEnabled')}
			/>
		</div>
	</section>

	{#each generators as generator (generator.id)}
		{#if generator.options.length > 0}
			<section class="card flex flex-col gap-3 p-4">
				<h2 class="text-sm font-semibold">{t(generator.nameKey)}</h2>

				{#each generator.options as field (field.key)}
					{#if field.type === 'switch'}
						<div class="row">
							<div class="row-copy">
								<span class="row-title">{t(field.labelKey)}</span>
								{#if field.helpKey !== undefined}
									<span class="dim text-xs">{t(field.helpKey)}</span>
								{/if}
							</div>
							<Switch
								checked={optionValue(generator.id, field) === true}
								ariaLabel={t(field.labelKey)}
								onchange={(next) => setOption(generator.id, field.key, next)}
							/>
						</div>
					{:else if field.type === 'select'}
						<div class="flex flex-wrap items-center gap-2">
							<span class="dim text-xs">{t(field.labelKey)}</span>
							{#each field.choices as choice (choice.value)}
								<button
									class="chip"
									data-checked={optionValue(generator.id, field) === choice.value}
									onclick={() => setOption(generator.id, field.key, choice.value)}
								>
									{t(choice.labelKey)}
								</button>
							{/each}
						</div>
					{:else if field.type === 'number'}
						<label class="flex flex-wrap items-center gap-2">
							<span class="dim text-xs">{t(field.labelKey)}</span>
							<input
								class="field w-24"
								type="number"
								min={field.min}
								max={field.max}
								value={Number(optionValue(generator.id, field))}
								oninput={(event) =>
									setOption(generator.id, field.key, Number(event.currentTarget.value))}
							/>
						</label>
					{/if}
				{/each}
			</section>
		{/if}
	{/each}

	{#if generators.every((generator) => generator.options.length === 0)}
		<section class="card dim p-4 text-sm">
			{t('settings.generators.noOwnOptions')}
		</section>
	{/if}
</div>

<style>
	/* Left-aligned text, control pushed right — the layout every boolean setting on this
	 * screen shares. */
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.row-copy {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.row-title {
		font-size: 0.8rem;
		font-weight: 600;
	}
</style>
