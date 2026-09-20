<script lang="ts">
	/**
	 * The box screen: which six-stars the user owns, and which of those they can field.
	 *
	 * Stores the *exclusion* lists, so an operator added to the
	 * dictionary later is in the box by default and nobody has to revisit this screen
	 * after a game update.
	 *
	 * ## Three views, one page
	 *
	 *   1. no job, no query  -> the eight jobs as buttons, each showing its count
	 *   2. no job, a query   -> matches across every job, still grouped by job
	 *   3. `?job=先锋`       -> that job's operators
	 *
	 * The job grid replaced eight always-open blocks of chips. 137 chips on one screen is
	 * a wall, and a virtual list was the other candidate fix — but for a wrapping chip grid
	 * that would have meant fixed-height rows, i.e. making the screen worse to look at in
	 * order to make it faster. Showing one job at a time (17-40 names) solves the same
	 * problem
	 * by rendering less in the first place, so the virtual list stays unnecessary. The
	 * search results are still grouped and carry `content-visibility`, since that view can
	 * legitimately match every chip.
	 *
	 * ## Three states, one chip
	 *
	 * Every chip is in exactly one of three states, and two of them keep the operator out
	 * of the draw:
	 *
	 *   in box              -> in neither list; the draw may pick them
	 *   not in box          -> `excluded`; the user does not have them
	 *   owned but unusable  -> `unusable`; the user has them but cannot field them
	 *
	 * The third is "not in box" for the draw but a different fact for the user, which is
	 * the whole reason the document carries two lists (`api/types.ts`).
	 *
	 * Each gesture is a toggle onto one of the two marks, and the state it leaves behind
	 * when it is un-set is 未拥有 — the neutral one, and where a name nobody has touched
	 * already is:
	 *
	 *   left click        -> 可使用, or 未拥有 when it already was 可使用
	 *   Ctrl + left click -> 不可使用, or 未拥有 when it already was 不可使用
	 *
	 * Spelled out as a table because both gestures are easy to describe wrongly in prose,
	 * and those six transitions are the whole contract. Neither is a "cycle": a cycle can
	 * only be read off a diagram, while each of these two says what it does. A long press
	 * is the Ctrl gesture on a touch device, where there is no Ctrl to hold. The legend
	 * under the help text shows the three looks so none of them has to be discovered by
	 * accident.
	 *
	 * ## Why the job is in the URL
	 *
	 * `?job=` rather than component state, so the back gesture — which matters on Android,
	 * where Android is a target platform — returns to the job grid instead of leaving the
	 * screen entirely. It also matches how 生成 selects a generator (`?g=`).
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import OperatorAvatar from '$lib/components/OperatorAvatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { JOBS, OPERATORS, OPERATORS_BY_STAR, OPERATORS_STAR_6_LIST } from '$lib/core/operators';
	import type { OperatorJob } from '$lib/core/operators';
	import { hasAvatar } from '$lib/core/avatars';
	import { markOf as markIn, nextMark, setMark } from '$lib/box-marks';
	import type { BoxGesture, BoxMark } from '$lib/box-marks';
	import { t } from '$lib/i18n';
	import { localizeName } from '$lib/i18n/names';
	import { importMaa } from '$lib/maa';
	import { appState } from '$lib/stores/app-state.svelte';

	const BOX_PATH = '/home/settings/box';

	let query = $state('');

	/** The pasted MAA export, cleared once it has been applied. */
	let maaText = $state('');
	/** True while the pasted text is being parsed and applied. */
	let maaBusy = $state(false);
	/** The last import that had something to say: a summary, or a paste with nothing in it. */
	let maaNotice = $state<string | null>(null);
	/** A failed paste is reported here rather than swallowed. */
	let maaError = $state<string | null>(null);

	const excluded = $derived(appState.state.box.excluded ?? []);
	const unusable = $derived(appState.state.box.unusable ?? []);
	const trimmedQuery = $derived(query.trim());

	/** Portrait mode is a display preference; see `appearance.avatarMode`. */
	const avatarMode = $derived(appState.state.appearance.avatarMode ?? false);

	const total = OPERATORS_STAR_6_LIST.length;

	const inBoxTotal = $derived(OPERATORS_STAR_6_LIST.filter((name) => markOf(name) === 'in').length);
	const unusableTotal = $derived(
		OPERATORS_STAR_6_LIST.filter((name) => markOf(name) === 'unusable').length
	);

	/**
	 * Everything the user has, whether or not it can be fielded.
	 *
	 * `inBox + unusable` rather than a third list: "owned but unusable" means the user has
	 * them, so they are owned. Nothing else counts as owned — an operator in neither list
	 * has never been marked and is outside the box.
	 */
	const ownedTotal = $derived(inBoxTotal + unusableTotal);

	const jobParam = $derived(page.url.searchParams.get('job'));
	/** The job opened via `?job=`, or `undefined` for the grid. */
	const activeJob = $derived(JOBS.find((job) => job === jobParam));

	/** Reads the three states off the live store, for the markup. */
	function markOf(name: string): BoxMark {
		return markIn({ excluded, unusable }, name);
	}

	/**
	 * Portrait mode as this chip will actually render it.
	 *
	 * A name with no portrait draws as a name in every mode, and this screen's styles key
	 * off `data-portrait` to drop the chip's own frame so the picture can be the frame. A
	 * chip that fell back to text while still claiming `data-portrait` would lose its pill
	 * and, in the third state, paint white text on a transparent background.
	 */
	function isPortrait(name: string): boolean {
		return avatarMode && hasAvatar(name);
	}

	/** The wash the picture carries: the chip's state, minus 在 box, which has none. */
	function washOf(mark: BoxMark): 'out' | 'unusable' | undefined {
		return mark === 'in' ? undefined : mark;
	}

	function inBoxCount(job: OperatorJob): number {
		return OPERATORS_BY_STAR['6'][job].filter((name) => markOf(name) === 'in').length;
	}

	/**
	 * Matches the operator's *displayed* name, and the Chinese one as well.
	 *
	 * Both, because the stored data is always Chinese while an English interface shows the
	 * official English name: matching only the Chinese would make the box look broken to
	 * someone reading English, and matching only the English would make it impossible to
	 * paste a name from a Chinese client. Portrait mode changes what a chip shows, never
	 * what it matches on, so the search keeps working when the names are not on screen.
	 */
	function matches(name: string): boolean {
		if (trimmedQuery === '') return true;

		const needle = trimmedQuery.toLowerCase();
		return (
			name.toLowerCase().includes(needle) || localizeName(name).toLowerCase().includes(needle)
		);
	}

	const searchGroups = $derived(
		JOBS.map((job) => ({ job, names: OPERATORS_BY_STAR['6'][job].filter(matches) })).filter(
			(group) => group.names.length > 0
		)
	);

	/**
	 * One gesture, applied: read where the chip is, look up where the gesture takes it,
	 * write that. The table itself lives in `$lib/box-marks` so it can be tested.
	 */
	function applyGesture(name: string, gesture: BoxGesture): void {
		appState.update((state) => {
			setMark(state.box, name, nextMark(markIn(state.box, name), gesture));
		});
	}

	/**
	 * Plain left-click: set 可使用, or clear the mark if it already was 可使用.
	 *
	 * An "owned but unusable" chip therefore comes back *into* the box: the gesture
	 * toggles 可使用, and 未拥有 is only where an un-set 可使用 lands.
	 */
	function toggleOperator(name: string): void {
		applyGesture(name, 'primary');
	}

	/**
	 * Ctrl + left-click: set 不可使用, or clear the mark if it already was 不可使用.
	 *
	 * The mirror of {@link toggleOperator} with the other mark. Both gestures un-set to
	 * 未拥有, so either one can always undo itself, and between them every state is
	 * reachable from every state in one or two clicks.
	 */
	function cycleMark(name: string): void {
		applyGesture(name, 'ctrl');
	}

	/**
	 * Left click toggles 可使用; **Ctrl + left click** toggles 不可使用.
	 *
	 * Ctrl on the primary button, not the secondary one. The earlier version put the cycle on
	 * Ctrl + *right*-click, which was wrong twice over: the intent was the ordinary
	 * modifier-plus-click gesture, and the secondary button means "open the context menu"
	 * everywhere else, so binding it here taught the wrong reflex and collided with the menu
	 * the WebView wants to draw.
	 *
	 * The button-0 guard stays: keyboard activation of a focused chip is button 0 and still
	 * counts, and a middle click must not change anything.
	 */
	function onChipClick(event: MouseEvent, name: string): void {
		if (event.button !== 0) return;

		if (event.ctrlKey) {
			cycleMark(name);
			return;
		}
		toggleOperator(name);
	}

	/**
	 * Long press on a touch device does the Ctrl gesture.
	 *
	 * There is no Ctrl to hold with a finger, so the browser's long-press context menu is
	 * suppressed and used as the gesture instead — which is how Android reaches the third
	 * state. Only on a coarse pointer: with a mouse this never fires for a real gesture, and
	 * the WebView's context menu has nothing to offer on this screen anyway.
	 */
	function onChipContextMenu(event: MouseEvent, name: string): void {
		event.preventDefault();
		if (isTouchPointer()) cycleMark(name);
	}

	/**
	 * True when the primary pointer is a finger.
	 *
	 * Asked inside the handler rather than held in a module-level `matchMedia` list,
	 * because this component is evaluated during prerender too, where `window` is absent.
	 */
	function isTouchPointer(): boolean {
		return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
	}

	/**
	 * Sets a whole group in one write, so one debounced save covers the batch.
	 *
	 * `setMark` clears both lists before it writes, so the two directions need no special
	 * casing: "all in box" is 可使用 for each name and "remove all" is 未拥有.
	 */
	function setNamesInBox(names: readonly string[], value: boolean): void {
		appState.update((state) => {
			for (const name of names) setMark(state.box, name, value ? 'in' : 'out');
		});
	}

	/**
	 * Reads the pasted MAA export and applies it to the two lists.
	 *
	 * Pasting text rather than picking a file, because MAA's export is *text*: it hands the
	 * user a JSON blob to copy out of the game's window, not a file on disk. A file picker
	 * asked them to save a file that was never written, which meant manually pasting the
	 * text into Notepad first.
	 *
	 * The parser is unchanged — `importMaa` has always taken a string; only the way the
	 * string arrives is different.
	 */
	function applyMaa(): void {
		if (maaBusy) return;

		const text = maaText.trim();
		if (text === '') return;

		maaBusy = true;
		maaNotice = null;
		maaError = null;

		try {
			const outcome = importMaa(text, OPERATORS, appState.state.box);

			if (!outcome.ok) {
				maaError = t(`settings.box.importMaaError.${outcome.reason}`);
				return;
			}

			const summary = outcome.summary;

			if (summary.matched === 0) {
				// Nothing in the paste belongs to this app. Under the import's rule that an
				// operator the text does not mention keeps its mark, applying this would be
				// a no-op anyway, so it is skipped and said plainly.
				maaNotice = t('settings.box.importMaaEmpty');
				return;
			}

			// The two lists are replaced, not merged entry by entry: the function has
			// already folded in every operator the paste does not mention, and one write
			// means one debounced save.
			appState.update((state) => {
				state.box.excluded = summary.excluded;
				state.box.unusable = summary.unusable;
			});

			maaNotice = t('settings.box.importMaaOk', {
				usable: summary.usable.length,
				unusable: summary.unusable.length,
				skipped: summary.skipped
			});
			// Cleared on success only: a failed paste is almost always one that needs
			// fixing, and wiping the box would make the user go and copy it again.
			maaText = '';
		} finally {
			maaBusy = false;
		}
	}

	function openJob(job: OperatorJob): void {
		query = '';
		void goto(`${BOX_PATH}?job=${encodeURIComponent(job)}`, { noScroll: true, keepFocus: true });
	}

	function closeJob(): void {
		void goto(BOX_PATH, { noScroll: true, keepFocus: true });
	}
</script>

{#snippet operatorChip(name: string)}
	{@const mark = markOf(name)}
	{@const portrait = isPortrait(name)}
	<!--
		One button, so the whole chip is a single hit target for both gestures. The name
		stays in `title` in every mode: in portrait mode it is the only place the operator's
		name is written, while the search above keeps matching on it either way.
	-->
	<button
		class="chip"
		data-checked={mark === 'in'}
		data-state={mark}
		data-portrait={portrait}
		title={localizeName(name)}
		onclick={(event) => onChipClick(event, name)}
		oncontextmenu={(event) => onChipContextMenu(event, name)}
	>
		<OperatorAvatar name={name} mode={portrait} wash={washOf(mark)} />
	</button>
{/snippet}

{#snippet selectButtons(names: readonly string[])}
	<button class="btn px-2 py-0.5 text-xs" onclick={() => setNamesInBox(names, true)}>
		{t('common.selectAll')}
	</button>
	<button class="btn px-2 py-0.5 text-xs" onclick={() => setNamesInBox(names, false)}>
		{t('common.selectNone')}
	</button>
{/snippet}

{#snippet jobView(job: OperatorJob)}
	{@const names = OPERATORS_BY_STAR['6'][job]}
	<div class="flex flex-wrap items-center gap-2">
		<button class="btn flex items-center gap-1 px-2 py-1 text-xs" onclick={closeJob}>
			<Icon name="arrow_back" size="14px" />
			<span>{t('settings.box.backToJobs')}</span>
		</button>
		<span class="text-sm font-medium">{localizeName(job)}</span>
		<span class="dim text-xs">{inBoxCount(job)}/{names.length}</span>
		<div class="ml-auto flex gap-2">
			{@render selectButtons(names)}
		</div>
	</div>

	<div class="chips">
		{#each names.filter(matches) as name (name)}
			{@render operatorChip(name)}
		{/each}
	</div>
{/snippet}

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-wrap items-baseline gap-2">
		<!--
			Three numbers, one line: owned / usable / total. The middle one is the count the
			generators actually draw from, so it is the one kept at full strength while the
			other two are dimmed.

			The "owned but unusable" figure used to sit here as a filled green chip. It is
			the same number either way, but a chip is a *control* everywhere else on this
			screen — and a green one twice the height of the text it sat next to, which
			stretched the row and made a heading look like a button. As a third number it
			costs no height at all, and the legend below still shows what the green look means.
		-->
		<span class="text-sm font-medium" title={t('settings.box.countsHelp')}>
			{t('settings.box.inBox')} <span class="dim">{ownedTotal}</span>
			<span class="dim"> / </span>{inBoxTotal}<span class="dim"> / {total}</span>
		</span>
		<div class="ml-auto flex gap-2">
			{@render selectButtons(OPERATORS_STAR_6_LIST)}
		</div>
	</div>
	<p class="dim text-xs">{t('settings.box.help')}</p>

	<!--
		The legend: the three looks a chip can have, drawn as chips. Each sample is the
		wording for the state it shows, so the legend also reads as the three states' names.
	-->
	<div class="legend">
		<span class="chip sample" data-checked="true" data-state="in">{t('settings.box.inBox')}</span>
		<!-- Both other samples carry `data-checked="false"` as well, because that is what a
		     real chip in those states has: the legend has to show the three looks exactly,
		     not three bare chips. -->
		<span class="chip sample" data-checked="false" data-state="unusable">
			{t('settings.box.unusable')}
		</span>
		<span class="chip sample" data-checked="false" data-state="out">
			{t('settings.box.notInBox')}
		</span>
	</div>

	<div class="import">
		<div class="flex flex-wrap items-center gap-2">
			<textarea
				class="field maa-text"
				rows="3"
				placeholder={t('settings.box.importMaaPlaceholder')}
				bind:value={maaText}
			></textarea>
			<button
				class="btn flex items-center gap-1 px-2 py-1 text-xs"
				disabled={maaBusy || maaText.trim() === ''}
				onclick={applyMaa}
			>
				<Icon name="inventory" size="14px" />
				<span>{maaBusy ? t('settings.box.importMaaBusy') : t('settings.box.importMaa')}</span>
			</button>
		</div>
		<p class="dim text-xs">{t('settings.box.importMaaHelp')}</p>
		{#if maaNotice !== null}
			<p class="dim text-xs">{maaNotice}</p>
		{/if}
		{#if maaError !== null}
			<p class="error text-xs" role="alert">{maaError}</p>
		{/if}
	</div>

	<input
		class="field"
		type="search"
		placeholder={t('settings.box.searchPlaceholder')}
		bind:value={query}
	/>

	{#if activeJob !== undefined}
		{@render jobView(activeJob)}
	{:else if trimmedQuery !== ''}
		<div class="flex flex-col gap-3">
			{#each searchGroups as group (group.job)}
				<div class="group flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<span class="dim text-xs">{localizeName(group.job)}</span>
						<span class="dim text-xs">{inBoxCount(group.job)}/{OPERATORS_BY_STAR['6'][group.job].length}</span>
					</div>
					<div class="chips">
						{#each group.names as name (name)}
							{@render operatorChip(name)}
						{/each}
					</div>
				</div>
			{/each}
			{#if searchGroups.length === 0}
				<p class="dim text-xs">{t('settings.box.noMatch')}</p>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<span class="dim text-xs">{t('settings.box.byJob')}</span>
			<ul class="jobs">
				{#each JOBS as job (job)}
					{@const names = OPERATORS_BY_STAR['6'][job]}
					{@const count = inBoxCount(job)}
					<li>
						<button class="job" onclick={() => openJob(job)}>
							<span class="job-name">{localizeName(job)}</span>
							<span class="job-count" data-complete={count === names.length}>
								{count}/{names.length}
							</span>
							<Icon name="chevron_right" size="16px" />
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	/*
	 * The third state is green in every one of the six themes, so the colour comes from a
	 * fixed token rather than from `--c-primary`: the accent is blue in 罗德岛, yellow in
	 * endfield and red in p5, and neither a yellow nor a red chip can mean "you own this
	 * but cannot field it".
	 *
	 * The chip *fills* with it instead of tinting the theme's surface, so the white text
	 * sits on #15803d (5.0:1) whatever is behind it, and the green shape itself keeps at
	 * least 3.8:1 against 罗德岛's #eaebed and the five dark backgrounds. This is the name
	 * mode's look; portrait mode moves the green onto the picture — see below.
	 */
	.chip[data-state='unusable'] {
		border-color: var(--c-unusable);
		background: var(--c-unusable);
		color: #ffffff;
		box-shadow: 0 0 0 2px var(--c-unusable);
	}

	/*
	 * A portrait chip is a frame around a picture, so it takes the picture's shape and
	 * gives up every part of the pill it wears in name mode: the fill, the border, the
	 * 999px radius and the horizontal padding. What is left is the portrait's own 1px
	 * border, which is exactly what the generate screen draws — the two screens show the
	 * same operator the same way.
	 *
	 * The radius was the visible half of the bug: `border-radius: 999px` on a box barely
	 * taller than the picture clamps to a half-height radius, so the chip was an oval
	 * drawn around a square. In the third state the 2px green ring followed that oval,
	 * which is what read as "a border that turns the avatar into a circle".
	 */
	.chip[data-portrait='true'] {
		padding: 0;
		border-radius: 0;
		border-color: transparent;
		background: transparent;
		box-shadow: none;
	}

	/* ... and the third state keeps none of its own paint here either: the green moves
	 * onto the picture as the translucent wash `OperatorAvatar` draws. Nothing is lost by
	 * moving it — same green, same picture — and a filled rectangle behind a picture that
	 * already carries the whole meaning would only be a second way of saying it. */

	/* The legend and the third state's count are the same chips, shown rather than
	   offered, so they must not promise a click the way a real chip's pointer cursor
	   does. */
	.sample {
		cursor: default;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	/* The import strip is a different kind of action from everything above it — it
	   rewrites both lists from a file rather than marking one operator — so it gets a
	   divider instead of sitting flush with the legend. */
	.import {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		border-top: 1px solid var(--c-border);
		padding-top: 0.75rem;
	}

	/* The paste box. Monospace and non-resizable: what goes in is a machine-written blob,
	 * and letting it stretch the card vertically helps nobody. */
	.maa-text {
		flex: 1 1 16rem;
		min-width: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.7rem;
		line-height: 1.4;
		resize: vertical;
	}

	.error {
		color: var(--c-danger);
	}

	.jobs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.job {
		display: grid;
		width: 100%;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--c-border);
		border-radius: 12px;
		padding: 0.6rem 0.7rem;
		background: var(--c-surface-2);
		color: var(--c-text);
		font-size: 0.82rem;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.job:hover {
		border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border));
	}

	.job-name {
		text-align: left;
		font-weight: 500;
	}

	.job-count {
		color: var(--c-text-dim);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}

	/* A fully collected job is the state the user is working towards, so it reads as
	   different from one that is only partly filled. */
	.job-count[data-complete='true'] {
		color: var(--c-primary-text);
	}

	/*
	 * Only the search view needs this: it can match the whole dictionary at once, while
	 * the other two views render one job (17-40 chips) or the job grid. `contain-intrinsic-size`
	 * gives the group a placeholder height so the scrollbar does not jump as groups are
	 * skipped and then measured.
	 */
	.group {
		content-visibility: auto;
		contain-intrinsic-size: auto 6rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.job {
			transition: none;
		}
	}
</style>
