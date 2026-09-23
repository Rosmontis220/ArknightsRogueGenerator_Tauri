<script lang="ts">
	/**
	 * 外观: the theme, portrait mode, motion, and the splash image.
	 *
	 * ## The theme previews are rendered, not painted
	 *
	 * Each card carries `data-theme` on its own preview box, which is the same attribute
	 * `app.html` puts on `<html>`. Custom properties inherit, so the little mock window
	 * inside the card resolves `var(--c-bg)`, `var(--c-surface)` and `var(--c-primary)`
	 * against that theme rather than against the active one — the swatch *is* the theme,
	 * and adding a scheme or retuning one cannot leave the picker showing a stale colour.
	 *
	 * The card's own chrome deliberately sits outside that box: its border, focus ring and
	 * caption belong to the interface the user is currently in, not to the theme being
	 * offered.
	 *
	 * ## Switches
	 *
	 * Portrait mode is a single boolean, so it is a switch with its label left-aligned and
	 * the control pushed right. The motion picker stays a row of chips, because "follow the
	 * system / always / never" is three choices and a switch cannot say three things.
	 */

	import type { ColorScheme, ReduceMotion } from '$lib/api/types';
	import { COLOR_SCHEMES, applyColorScheme } from '$lib/appearance';
	import Switch from '$lib/components/Switch.svelte';
	import { t } from '$lib/i18n';
	import { SPLASH_IMAGE_PREVIEW_EDGE, dataUrlBytes, prepareSplashImage } from '$lib/image';
	import { appState } from '$lib/stores/app-state.svelte';

	const REDUCE_MOTION_LABELS: readonly { id: ReduceMotion; labelKey: string }[] = [
		{ id: 'system', labelKey: 'common.motionSystem' },
		{ id: 'always', labelKey: 'common.motionAlways' },
		{ id: 'never', labelKey: 'common.motionNever' }
	];

	let fileInput = $state<HTMLInputElement | null>(null);
	let busy = $state(false);
	/** A failed pick is reported here rather than swallowed by the change handler. */
	let error = $state<string | null>(null);

	const splashImage = $derived(appState.state.appearance.splashImage ?? '');

	const splashSize = $derived(
		splashImage === '' ? '' : `${Math.round(dataUrlBytes(splashImage) / 1024)} KB`
	);

	function setScheme(scheme: ColorScheme): void {
		appState.update((state) => {
			state.appearance.colorScheme = scheme;
		});
		// Applied immediately as well as persisted: the write is debounced, and a
		// theme that lags the click by 400ms feels broken.
		applyColorScheme(scheme);
	}

	function toggleAvatarMode(): void {
		appState.update((state) => {
			state.appearance.avatarMode = !state.appearance.avatarMode;
		});
	}

	function setReduceMotion(value: ReduceMotion): void {
		appState.update((state) => {
			state.appearance.reduceMotion = value;
		});
	}

	/**
	 * Reads the picked file and stores a downscaled copy.
	 *
	 * Deliberately takes no event and goes through the bound `fileInput` instead of
	 * `event.currentTarget`: Svelte 5 delegates `change` to the root node, so
	 * `currentTarget` there is that root rather than this input, and `input.files`
	 * would be undefined — a pick that silently does nothing.
	 */
	async function onPick(): Promise<void> {
		if (fileInput === null) return;

		const file = fileInput.files?.[0];

		// Cleared before anything is awaited: picking the same file twice in a row
		// fires no `change` event while the input still holds the first selection.
		fileInput.value = '';

		if (file === undefined) return;

		busy = true;
		error = null;

		try {
			const result = await prepareSplashImage(file);

			if (!result.ok) {
				error = t(`appearance.splashError.${result.reason}`);
				return;
			}

			appState.update((state) => {
				state.appearance.splashImage = result.image.dataUrl;
			});
		} finally {
			busy = false;
		}
	}

	function clearSplash(): void {
		appState.update((state) => {
			state.appearance.splashImage = '';
		});
		error = null;
	}
</script>

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-semibold">{t('appearance.theme')}</h2>
		<p class="dim text-xs">{t('appearance.themeHelp')}</p>
	</div>

	<div class="schemes" role="radiogroup" aria-label={t('appearance.theme')}>
		{#each COLOR_SCHEMES as scheme (scheme.id)}
			{@const active = appState.state.appearance.colorScheme === scheme.id}
			<button
				type="button"
				role="radio"
				aria-checked={active}
				class="scheme"
				class:active
				onclick={() => setScheme(scheme.id)}
			>
				<!-- `data-theme` here is the same attribute `app.html` sets on `<html>`; the
				     mock below is drawn entirely from the tokens it selects. -->
				<span class="mock" data-theme={scheme.id} aria-hidden="true">
					<span class="mock-bar">
						<span class="mock-dot"></span>
						<span class="mock-dot"></span>
					</span>
					<span class="mock-body">
						<span class="mock-rail"></span>
						<span class="mock-lines">
							<span></span>
							<span></span>
							<span></span>
						</span>
					</span>
					<span class="mock-fill"></span>
				</span>

				<span class="scheme-copy">
					<span class="scheme-name">{t(scheme.labelKey)}</span>
					<span class="dim text-xs">{t(scheme.descriptionKey)}</span>
				</span>
			</button>
		{/each}
	</div>

	<div class="row">
		<div class="row-copy">
			<span class="row-title">{t('appearance.avatarMode')}</span>
			<span class="dim text-xs">{t('appearance.avatarModeHelp')}</span>
		</div>
		<Switch
			checked={appState.state.appearance.avatarMode}
			ariaLabel={t('appearance.avatarMode')}
			onchange={toggleAvatarMode}
		/>
	</div>

	<div class="row">
		<div class="row-copy">
			<span class="row-title">{t('appearance.motion')}</span>
			<span class="dim text-xs">{t('appearance.motionHelp')}</span>
		</div>
		<div class="chips">
			{#each REDUCE_MOTION_LABELS as option (option.id)}
				<button
					class="chip"
					data-checked={appState.state.appearance.reduceMotion === option.id}
					onclick={() => setReduceMotion(option.id)}
				>
					{t(option.labelKey)}
				</button>
			{/each}
		</div>
	</div>
</section>

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-semibold">{t('appearance.splashTitle')}</h2>
		<p class="dim text-xs">{t('appearance.splashHelp')}</p>
	</div>

	<div class="flex flex-wrap items-start gap-4">
		<div class="preview" style:--preview-edge={`${SPLASH_IMAGE_PREVIEW_EDGE / 2}px`}>
			{#if splashImage === ''}
				<span class="dim text-xs">{t('appearance.splashDefault')}</span>
			{:else}
				<img src={splashImage} alt={t('appearance.splashPreviewAlt')} />
			{/if}
		</div>

		<div class="flex flex-col gap-2">
			<!-- A real button plus a hidden input, rather than a <label> wrapping it:
			     `display: none` takes the input out of the tab order, so the label
			     pattern would leave this reachable by mouse only. -->
			<input
				bind:this={fileInput}
				class="hidden"
				type="file"
				accept="image/*"
				onchange={onPick}
			/>

			<button
				class="btn self-start px-3 py-1.5 text-xs"
				disabled={busy}
				onclick={() => fileInput?.click()}
			>
				{busy
					? t('appearance.splashBusy')
					: splashImage === ''
						? t('appearance.splashChoose')
						: t('appearance.splashReplace')}
			</button>

			{#if splashImage !== ''}
				<div class="flex items-center gap-2">
					<button class="btn px-2 py-1 text-xs" onclick={clearSplash}>
						{t('appearance.splashRemove')}
					</button>
					<span class="dim text-xs">{splashSize}</span>
				</div>
			{/if}
		</div>
	</div>

	{#if error !== null}
		<p class="error text-xs" role="alert">{error}</p>
	{/if}
</section>

<style>
	.schemes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.5rem;
	}

	.scheme {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: stretch;
		padding: 0.5rem;
		border: 1px solid var(--c-border);
		border-radius: 12px;
		background: var(--c-surface);
		text-align: left;
		cursor: pointer;
	}

	.scheme:hover {
		border-color: var(--c-primary);
	}

	.scheme.active {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px var(--c-primary);
	}

	.scheme:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	/* The preview. Everything below `data-theme` resolves against the *preview* theme;
	 * everything about the card itself is set above it, from the active theme. */
	.mock {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 4rem;
		overflow: hidden;
		border-radius: 8px;
		background: var(--c-bg);
	}

	.mock-bar {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 1rem;
		padding: 0 0.35rem;
		background: var(--c-surface-2);
	}

	.mock-dot {
		width: 0.25rem;
		height: 0.25rem;
		border-radius: 9999px;
		background: var(--c-text-dim);
	}

	.mock-body {
		display: flex;
		flex: 1;
		gap: 0.35rem;
		padding: 0.35rem;
	}

	.mock-rail {
		width: 0.5rem;
		border-radius: 3px;
		background: var(--c-surface);
	}

	.mock-lines {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
	}

	.mock-lines > span {
		height: 0.25rem;
		border-radius: 9999px;
		background: var(--c-surface);
	}

	.mock-lines > span:last-child {
		width: 60%;
	}

	/* The accent, so the five themes are told apart by more than lightness. */
	.mock-fill {
		position: absolute;
		right: 0.35rem;
		bottom: 0.35rem;
		width: 1.1rem;
		height: 0.4rem;
		border-radius: 9999px;
		background: var(--c-primary);
	}

	.scheme-copy {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.scheme-name {
		font-size: 0.8rem;
		font-weight: 600;
	}

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

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.preview {
		display: grid;
		width: var(--preview-edge);
		height: calc(var(--preview-edge) * 9 / 16);
		overflow: hidden;
		border: 1px solid var(--c-border);
		border-radius: 12px;
		place-items: center;
		/* The default preview *is* the theme background, so the empty state shows the
		 * colour the splash would actually use rather than a grey placeholder. */
		background: var(--c-bg);
	}

	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.error {
		color: var(--c-danger);
	}
</style>
