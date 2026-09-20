<script lang="ts">
	/**
	 * 记录: time + generator + action + ID + a summary, expandable to the
	 * full structured fields, filterable by generator.
	 *
	 * The rows themselves come from `$lib/history-fields`, which knows how to render
	 * whatever an entry carries without knowing which generator produced it.
	 *
	 * There is no "click to see the full result" detail view because a result's
	 * *blocks* are not stored: `fields` is all there is, and it is
	 * all shown here.
	 */

	import type { HistoryEntry } from '$lib/api/types';
	import { copyText } from '$lib/clipboard';
	import { getGeneratorOrUndefined } from '$lib/generators/registry';
	import { RETIRED_ACTION_LABELS } from '$lib/generators/actions';
	import { fieldsAsText, fieldRows, summarizeFields } from '$lib/history-fields';
	import { t } from '$lib/i18n';
	import { localizeFields } from '$lib/i18n/names';
	import { appState } from '$lib/stores/app-state.svelte';

	let filterId = $state<string | null>(null);
	/**
	 * The expanded entry, identified by its timestamp.
	 *
	 * Timestamps rather than list positions: new entries are prepended, so an index
	 * would make the open row jump to a different entry every time one is generated.
	 */
	let expandedAt = $state<number | null>(null);
	let copiedAt = $state<number | null>(null);

	const history = $derived(appState.state.history);

	/** Only generators that actually appear — a filter that matches nothing is noise. */
	const presentIds = $derived([...new Set(history.map((entry) => entry.generatorId))].sort());

	const visible = $derived(
		filterId === null ? history : history.filter((entry) => entry.generatorId === filterId)
	);

	function generatorLabel(id: string): string {
		const generator = getGeneratorOrUndefined(id);

		// An entry from a generator that has since been removed shows its raw id rather
		// than borrowing the default generator's name, which would be a lie about which
		// mode produced the run.
		return generator === undefined ? id : t(generator.nameKey);
	}

	/**
	 * The action's label, e.g. `bp8` -> `8位BP`.
	 *
	 * The stored `actionId` is an identifier, not a name — showing it raw puts `bp8` on an
	 * English screen where the button that produced it said "8 BP".
	 */
	function actionLabel(generatorId: string, actionId: string): string {
		const action = getGeneratorOrUndefined(generatorId)?.actions.find(
			(candidate) => candidate.id === actionId
		);

		if (action !== undefined) return t(action.labelKey);

		// A retired action is the one case that is not *unrecognised*: 4位BP is gone from the
		// button row, but the runs it drew are still in the history, so it keeps its name.
		const retired = RETIRED_ACTION_LABELS[actionId];

		// Same reasoning as `generatorLabel`: an id that is genuinely unknown is shown as
		// itself rather than guessed at.
		return retired === undefined ? actionId : t(retired);
	}

	/**
	 * `history` is newest-first, so a bare index would collide with the entry that
	 * precedes it once a new one is prepended.
	 */
	function entryKey(entry: HistoryEntry, index: number): string {
		return `${entry.at}-${index}`;
	}

	function formatTime(at: number): string {
		const date = new Date(at);
		const pad = (value: number) => String(value).padStart(2, '0');
		return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function toggle(entry: HistoryEntry): void {
		expandedAt = expandedAt === entry.at ? null : entry.at;
	}

	async function copyEntry(entry: HistoryEntry): Promise<void> {
		// Copies the localised form: what is copied should match what is on screen, and the
		// labels the reader just saw are in their own language.
		if (!(await copyText(fieldsAsText(localizeFields(entry.fields))))) return;

		copiedAt = entry.at;
		setTimeout(() => {
			// Guarded so a second copy does not get its flash cut short by the first
			// one's timer.
			if (copiedAt === entry.at) copiedAt = null;
		}, 1500);
	}

	function clearHistory(): void {
		appState.update((state) => {
			state.history = [];
		});
		expandedAt = null;
		filterId = null;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		<span class="dim text-sm">
			{t('history.count', { shown: visible.length, total: history.length })}
		</span>

		<!-- Said here rather than left as a mystery: a user who draws an opening and then
		     finds no entry for it would otherwise read it as a bug. The BP sizes all
		     record, so the note only has to explain the one action that does not. -->
		<span class="dim text-xs">{t('history.excludesOpening')}</span>

		{#if presentIds.length > 1}
			<div class="flex flex-wrap gap-1.5" role="group" aria-label={t('history.filter')}>
				<button
					class="chip"
					data-checked={filterId === null}
					onclick={() => (filterId = null)}
				>
					{t('history.filterAll')}
				</button>
				{#each presentIds as id (id)}
					<button class="chip" data-checked={filterId === id} onclick={() => (filterId = id)}>
						{generatorLabel(id)}
					</button>
				{/each}
			</div>
		{/if}

		{#if history.length > 0}
			<button class="btn btn-danger ml-auto px-2 py-1 text-xs" onclick={clearHistory}>
				{t('common.clear')}
			</button>
		{/if}
	</div>

	{#if history.length === 0}
		<p class="card dim p-4 text-sm">{t('history.empty')}</p>
	{:else if visible.length === 0}
		<p class="card dim p-4 text-sm">{t('history.noMatch')}</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each visible as entry, index (entryKey(entry, index))}
				{@const localized = localizeFields(entry.fields)}
				{@const rows = fieldRows(localized)}
				{@const open = expandedAt === entry.at}
				<li class="card overflow-hidden">
					<button
						class="entry-head"
						aria-expanded={open}
						onclick={() => toggle(entry)}
					>
						<span class="head-main">
							<span class="head-title">
								<b>{generatorLabel(entry.generatorId)}</b>
								<span class="dim">{actionLabel(entry.generatorId, entry.actionId)}</span>
							</span>
							<span class="head-summary">{summarizeFields(localized) || '—'}</span>
						</span>
						<span class="head-meta dim">
							{formatTime(entry.at)}
							· {entry.identity || t('history.noIdentity')}
							· {t('history.seed')} {entry.seed}
						</span>
					</button>

					{#if open}
						<div class="entry-body">
							<dl class="fields">
								{#each rows as row (row.key)}
									<dt>{row.label}</dt>
									<dd>{row.value}</dd>
								{/each}
							</dl>
							<button class="btn self-start px-2 py-1 text-xs" onclick={() => copyEntry(entry)}>
								{copiedAt === entry.at ? t('result.copied') : t('result.copy')}
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* The whole head is the disclosure control, so the tap target is the row rather
	 * than a caret — this screen is used on a phone too. */
	.entry-head {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.7rem 0.85rem;
		text-align: left;
	}

	.entry-head:hover {
		background: var(--c-surface-2);
	}

	.head-main {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}

	.head-title {
		display: inline-flex;
		flex: none;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.head-title .dim {
		font-size: 0.72rem;
	}

	/* The summary can be a long generated list (老缠杯 is ten operators), so it
	 * truncates rather than pushing the timestamp off the row. */
	.head-summary {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--c-text-dim);
		font-size: 0.78rem;
	}

	.head-meta {
		font-size: 0.7rem;
	}

	.entry-body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		border-top: 1px solid var(--c-border);
		padding: 0.7rem 0.85rem;
		background: var(--c-surface-2);
	}

	.fields {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.25rem 0.75rem;
		margin: 0;
		font-size: 0.8rem;
	}

	.fields dt {
		color: var(--c-text-dim);
		white-space: nowrap;
	}

	.fields dd {
		margin: 0;
		/* The picks/bans values are long single lines of names. */
		overflow-wrap: anywhere;
	}
</style>
