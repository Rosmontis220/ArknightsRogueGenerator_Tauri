<script lang="ts">
	/**
	 * 个人资料. The ID, and the portrait shown beside it.
	 *
	 * The ID is the seed's only source, so it stays the first thing on the page and keeps the
	 * explanation it always had. The portrait is decoration and the page says so: it is drawn
	 * from the same 137 portraits the result lists use, and it takes no part in a draw.
	 *
	 * The picker lists pixels rather than names, so the setting that switches lists to
	 * portraits is irrelevant here — this *is* the portrait list, and it always shows them.
	 */

	import OperatorAvatar from '$lib/components/OperatorAvatar.svelte';
	import { DEFAULT_IDENTITY_NAME } from '$lib/api/types';
	import { OPERATORS, OPERATORS_STAR_6_LIST } from '$lib/core/operators';
	import { t } from '$lib/i18n';
	import { localizeName } from '$lib/i18n/names';
	import { appState } from '$lib/stores/app-state.svelte';

	let query = $state('');

	const chosen = $derived(appState.state.identity.avatar);

	/**
	 * The picker's filter.
	 *
	 * Matches the Chinese name, the pinyin and the English name, because the list is drawn
	 * in one language and someone hunting for a specific operator may remember any of the
	 * three. Both English spellings are checked: `code_name_en` is the source data's
	 * ASCII-ish form, while the displayed name is the official translation, and they differ
	 * on the operators whose names carry diacritics — typing either should find them.
	 */
	const matches = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (needle === '') return OPERATORS_STAR_6_LIST;

		return OPERATORS_STAR_6_LIST.filter((name) => {
			const operator = OPERATORS[name];
			// `pinyin` is one segment per character with a tone number (`tui1`, `jin4`), so
			// the segments are joined and the numbers dropped: that way `tui`, `jin` and
			// `tuijin` all find 推进之王, which is how someone actually searches.
			const pinyin = operator.pinyin.join('').replace(/[0-9]/g, '');
			return (
				name.toLowerCase().includes(needle) ||
				pinyin.includes(needle) ||
				operator.code_name_en.toLowerCase().includes(needle) ||
				localizeName(name).toLowerCase().includes(needle)
			);
		});
	});

	function setName(value: string): void {
		appState.update((state) => {
			state.identity.name = value;
		});
	}

	/**
	 * Puts the default ID back when the field is left blank.
	 *
	 * Blank is not an ID the app has an answer for: the seed is built from this string, so an
	 * empty one draws under a hash of the empty string while the result, the export and the
	 * corner of the screen all claim the ID is 博士. Rust fills it on load too — this is what
	 * keeps the two from disagreeing until the next restart.
	 *
	 * On blur rather than on input, so selecting all and typing does not have the field
	 * refilling itself mid-keystroke.
	 */
	function restoreDefaultName(): void {
		if (appState.state.identity.name.trim() === '') setName(DEFAULT_IDENTITY_NAME);
	}

	function setAvatar(name: string): void {
		appState.update((state) => {
			state.identity.avatar = name;
		});
	}

	function clearAvatar(): void {
		appState.update((state) => {
			state.identity.avatar = '';
		});
	}
</script>

<section class="card flex flex-col gap-3 p-4">
	<p class="dim text-xs">{t('settings.identity.help')}</p>
	<input
		class="field"
		type="text"
		placeholder={t('identity.placeholder')}
		value={appState.state.identity.name}
		oninput={(event) => setName((event.target as HTMLInputElement).value)}
		onblur={restoreDefaultName}
	/>
</section>

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-semibold">{t('settings.identity.avatarTitle')}</h2>
		<p class="dim text-xs">{t('settings.identity.avatarHelp')}</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		{#if chosen === ''}
			<span class="dim text-xs">{t('settings.identity.avatarNone')}</span>
		{:else}
			<OperatorAvatar name={chosen} mode={true} size="lg" />
		{/if}

		{#if chosen !== ''}
			<button class="btn px-2 py-1 text-xs" onclick={clearAvatar}>
				{t('settings.identity.avatarClear')}
			</button>
		{/if}
	</div>

	<input
		class="field"
		type="search"
		placeholder={t('settings.identity.avatarSearch')}
		bind:value={query}
	/>

	{#if matches.length === 0}
		<p class="dim text-xs">{t('settings.identity.avatarNoMatch')}</p>
	{:else}
		<div class="picker">
			{#each matches as name (name)}
				<button
					class="option"
					data-checked={chosen === name}
					aria-pressed={chosen === name}
					onclick={() => setAvatar(name)}
				>
					<!-- `size="md"` in a dense grid: the grid is a chooser, and showing 137
					     portraits large would be a page nobody can scan. -->
					<OperatorAvatar {name} mode={true} size="md" />
				</button>
			{/each}
		</div>
	{/if}
</section>

<style>
	/* `auto-fill` rather than a fixed column count: the same grid then works in the narrow
	 * window and on a phone without a media query, which the settings screens otherwise
	 * avoid. */
	.picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.25rem, 1fr));
		gap: 0.5rem;
		max-height: 22rem;
		overflow-y: auto;
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		border: 1px solid transparent;
		border-radius: 10px;
		cursor: pointer;
	}

	.option:hover {
		border-color: var(--c-border);
	}

	/* A ring rather than a tint, because a tint would be drawn over the portrait itself and
	 * the point of the control is to see which portrait is chosen. */
	.option[data-checked='true'] {
		border-color: var(--c-primary);
		background: var(--c-primary-soft);
	}
</style>
