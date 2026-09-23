<script lang="ts">
	/**
	 * The generate route, which is three screens in one.
	 *
	 *   - no query parameter: the landing screen — one full-width button per mode;
	 *   - `?f=<family>`: that mode's editions, when it holds more than one;
	 *   - `?g=<id>`: the generator itself.
	 *
	 * All three live here rather than in nested routes because they are one screen's
	 * worth of state and the choice is a query parameter, not a path segment: a generator
	 * has to be linkable (`/home/generate?g=xianshu-6`) and back/forward have to work.
	 */

	import { onMount } from 'svelte';

	import { page } from '$app/state';
	import { isRecordableAction } from '$lib/api/types';
	import EntryNav from '$lib/components/EntryNav.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ResultBlocks from '$lib/components/ResultBlocks.svelte';
	import { OPERATOR_INDEX } from '$lib/core/operators';
	import { formatDate, seedFor } from '$lib/core/seed';
	import { getGeneratorOrUndefined } from '$lib/generators/registry';
	import type {
		GeneratorAction,
		GeneratorContext,
		GeneratorDefinition
	} from '$lib/generators/types';
	import { t } from '$lib/i18n';
	import { FAMILY_PARAM, familyNavGroup, generatorFamilyEntries } from '$lib/nav-entries';
	import { appState } from '$lib/stores/app-state.svelte';
	import { resultStore } from '$lib/stores/result.svelte';

	let today = $state(formatDate(new Date()));

	// The date is half of the seed, so a window left open across midnight must pick
	// up the new day rather than keep generating yesterday's run.
	onMount(() => {
		const timer = setInterval(() => {
			today = formatDate(new Date());
		}, 60_000);
		return () => clearInterval(timer);
	});

	/**
	 * The selected generator, or `undefined` when the route is showing a list.
	 *
	 * No fallback to the remembered id. An absent `?g=` means "nothing chosen yet", and
	 * that is the whole point of the selection screens — falling back would make them
	 * unreachable on a fresh launch and skip the choice they exist to offer. An id that is
	 * not in the registry (a stale link, a hand-edited state file) lands on the landing
	 * screen instead of a blank one.
	 */
	const generator = $derived(getGeneratorOrUndefined(page.url.searchParams.get('g')));

	/** The mode whose editions are being chosen, or `undefined` for the other two screens. */
	const familyParam = $derived(page.url.searchParams.get(FAMILY_PARAM));

	const familyGroup = $derived(
		familyParam === null
			? undefined
			: familyNavGroup(familyParam, appState.state.generators.current)
	);

	const modes = $derived(generatorFamilyEntries());

	/**
	 * What the generator view is currently showing.
	 *
	 * A result belongs to the generator that produced it, so entering one clears whatever
	 * the previous one left behind — 仙术杯 #8's picks sitting under 开局生成器's buttons
	 * reads as a bug. Leaving resets the marker, so coming back to the same generator
	 * clears too rather than showing the run from before the detour.
	 */
	let shownId = $state<string | undefined>(undefined);

	$effect(() => {
		const selected = generator;
		if (selected === undefined) {
			shownId = undefined;
			return;
		}
		if (shownId === selected.id) return;

		shownId = selected.id;
		resultStore.clear();

		// Remembered so the edition list can mark what was used last: both the overall
		// selection and the per-family edition are stored.
		appState.update((state) => {
			state.generators.current = selected.id;
			if (selected.family !== undefined) {
				state.generators.currentByFamily[selected.family] = selected.id;
			}
		});
	});

	function context(target: GeneratorDefinition): GeneratorContext {
		const state = appState.state;
		return {
			operators: OPERATOR_INDEX,
			box: state.box,
			name: state.identity.name,
			date: today,
			// Derived once, here, and reused for every decision the generator makes.
			seed: seedFor(state.identity.name, today),
			options: state.generators.options[target.id] ?? {},
			common: state.common
		};
	}

	function run(target: GeneratorDefinition, action: GeneratorAction): void {
		const state = appState.state;

		try {
			const ctx = context(target);
			const produced = target.generate(ctx, action);

			resultStore.set(produced, state.identity.name);

			// The plain opening draw is deliberately not archived. It is the button a user
			// presses over and over to re-roll, so fifty near-identical one-line entries
			// would push out the runs that involved an actual decision. The BP sizes all
			// record, because choosing one *is* the decision.
			if (isRecordableAction(action.id)) {
				appState.recordHistory({
					at: Date.now(),
					generatorId: target.id,
					actionId: action.id,
					identity: state.identity.name,
					seed: ctx.seed.value,
					// Structured fields only — never rendered markup.
					fields: produced.fields
				});
			}
		} catch (cause) {
			// User-reachable: no theme enabled, an empty box, or a squad whose two jobs
			// the box has nobody left in. Generators throw for all of these rather than
			// producing an "undefined" result, and each one explains itself — so the
			// message is shown as-is instead of being replaced by a guess at which of
			// them happened.
			resultStore.fail(
				t('generate.failed', {
					reason: cause instanceof Error ? cause.message : t('generate.unknownReason')
				})
			);
		}
	}
</script>

{#snippet generatorView(target: GeneratorDefinition)}
	{@const primaryAction = target.actions[0]}
	{@const otherActions = target.actions.slice(1)}

	<section class="flex flex-col gap-4">
		{#if target.constraintKeys?.length}
			<div class="card surface-2 flex flex-col gap-1 px-4 py-3 text-sm">
				{#each target.constraintKeys as key (key)}
					<p>{t(key)}</p>
				{/each}
			</div>
		{/if}

		<div class="card flex flex-col gap-2 p-4">
			{#if primaryAction !== undefined}
				<button class="btn btn-primary" onclick={() => run(target, primaryAction)}>
					{t(primaryAction.labelKey)}
				</button>
			{/if}

			<div class="flex flex-wrap gap-2">
				{#each otherActions as action (action.id)}
					<button class="btn btn-primary flex-1" onclick={() => run(target, action)}>
						{t(action.labelKey)}
					</button>
				{/each}
			</div>
		</div>

		{#if resultStore.error}
			<p class="card p-4 text-sm" style="border-color: var(--c-danger); color: var(--c-danger);">
				{resultStore.error}
			</p>
		{/if}

		{#if resultStore.result}
			<section class="card p-4">
				<ResultBlocks blocks={resultStore.result.blocks} />
			</section>
		{:else if !resultStore.error}
			<section class="card dim p-4 text-sm">
				{t('generate.hint')}
			</section>
		{/if}
	</section>
{/snippet}

{#if generator !== undefined}
	{@render generatorView(generator)}
{:else if familyGroup !== undefined}
	<EntryNav groups={[familyGroup]} label={t('nav.editions')} />
{:else}
	<nav class="modes" aria-label={t('generate.choose')}>
		{#each modes as mode (mode.key)}
			<a class="btn btn-primary mode" href={mode.href}>
				<Icon name={mode.icon} size="20px" />
				<span>{mode.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	.modes {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	/* 铺满: each mode owns a whole row, so the three of them read as the screen's only
	 * content rather than as a list that happens to be short. */
	.mode {
		width: 100%;
		gap: 0.55rem;
		padding: 0.95rem 1rem;
		font-size: 1rem;
	}
</style>