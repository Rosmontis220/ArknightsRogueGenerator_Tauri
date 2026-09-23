<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { goto } from '$app/navigation';
	import appIcon from '$lib/assets/app-icon.png';
	import { t } from '$lib/i18n';
	import { fadeUp, prefersReducedMotion } from '$lib/motion';
	import { appState } from '$lib/stores/app-state.svelte';

	/**
	 * The splash does real work — reading the state file — but it should not strobe
	 * past on a fast machine, hence a floor on how long it stays up.
	 */
	const MINIMUM_DISPLAY_MS = 600;

	let step = $state(t('splash.loadingOperators'));

	/**
	 * Background image chosen in 设置 → 外观, or `''` for the plain theme background.
	 *
	 * Read defensively: an older stored document may not carry the key at all, and
	 * `''` and `undefined` mean the same thing here.
	 */
	const splashImage = $derived(appState.state.appearance.splashImage ?? '');

	onMount(async () => {
		const startedAt = Date.now();

		// The dictionary is built while its module is evaluated, which happens
		// before this runs, so the first message is on screen while the state read
		// starts rather than before the dictionary exists. Nothing here is a
		// decorative delay; the only pause is the floor below.
		step = t('splash.loadingSettings');
		await appState.load();

		step = t('splash.ready');

		const remaining = MINIMUM_DISPLAY_MS - (Date.now() - startedAt);
		if (remaining > 0) {
			await new Promise((resolve) => setTimeout(resolve, remaining));
		}

		await goto('/home', { replaceState: true });
	});
</script>

<main class="splash flex h-dvh flex-col items-center justify-center px-6">
	{#if splashImage !== ''}
		<!-- An <img> rather than a CSS background: the value is a data URL, and
		     `object-fit: cover` gets the same result without CSS-escaping it. -->
		<img
			class="splash-image"
			src={splashImage}
			alt=""
			aria-hidden="true"
			in:fade={{ duration: prefersReducedMotion() ? 0 : 240 }}
		/>
		<div class="splash-scrim" aria-hidden="true"></div>
	{/if}

	<div class="card relative flex flex-col items-center gap-2 px-10 py-8" in:fadeUp>
		<img class="splash-logo" src={appIcon} alt="" aria-hidden="true" />
		<h1 class="text-xl font-semibold">{t('app.title')}</h1>
		<p class="dim text-xs">{t('splash.slogan')}</p>
		<p class="dim mt-1 text-sm" aria-live="polite">{step}</p>
	</div>
</main>

<style>
	/* The theme's own background is the default, so a user who never opens the
	 * appearance screen still gets a splash that matches their colour scheme. */
	/* The container is padded for the system bars by `.safe-area`, which is why the
	 * background has to be painted on it rather than on the body: the padding is part
	 * of the element, so the colour covers the inset too instead of leaving a bare
	 * strip behind the status bar. */
	.splash {
		position: relative;
		overflow: hidden;
		background: var(--c-bg);
	}

	.splash-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Washes the image toward the current theme rather than replacing it, so a
	 * photo reads as a backdrop instead of as a different app. */
	.splash-scrim {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--c-bg) 40%, transparent);
	}

	/* The app icon itself, at the size the placeholder square used to be. No radius:
	 * the artwork is already a finished icon, and rounding it would crop a design that
	 * was not drawn to be cropped. */
	.splash-logo {
		width: 72px;
		height: 72px;
		object-fit: contain;
	}
</style>
