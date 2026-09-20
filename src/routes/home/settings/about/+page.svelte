<script lang="ts">
	/**
	 * 关于. Version, features, developer — and nothing about how the draw works.
	 *
	 * The determinism section that used to be here spelled out the seed derivation. That
	 * is the one part of the app that is not meant to be documented in the product, so it
	 * moved out of the interface entirely; the explanation lives in the source comments.
	 */

	import { onMount } from 'svelte';
	import { getVersion } from '@tauri-apps/api/app';
	import { isTauri } from '@tauri-apps/api/core';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { t } from '$lib/i18n';

	/**
	 * Shown before the real version arrives, and whenever there is no app to ask.
	 *
	 * This used to be *the* version, kept in step with `tauri.conf.json` and `Cargo.toml` by
	 * hand — and it had already drifted once, reporting 0.1.0 from a 0.2.0 build. The bundle
	 * knows its own version, so it is asked instead and this is only the stand-in. It still
	 * has to be a real number rather than a placeholder: the static build served in a plain
	 * browser has no bundle to ask, and a blank version there would look like a bug.
	 */
	const FALLBACK_VERSION = '1.0.0';

	/** This machine's `gh` CLI identity, so the name here matches the repository. */
	const DEVELOPER = 'Rosmontis220';

	/** The repository the developer's name links to. */
	const REPOSITORY = 'https://github.com/Rosmontis220/ArknightsRogueGenerator_Tauri';

	let version = $state(FALLBACK_VERSION);

	onMount(async () => {
		if (!isTauri()) return;

		try {
			version = await getVersion();
		} catch {
			// Deliberately silent. The fallback is already a correct-looking answer, and an
			// About page that shows a read error where the version goes is worse than one
			// showing a version that is merely out of date.
		}
	});

	/**
	 * Hands the repository to the system browser.
	 *
	 * The webview does not follow the href itself: it has no address bar and no back
	 * button, so navigating away would strand the user on a page they cannot leave.
	 * Outside Tauri — a plain browser serving the static build — following the link is
	 * exactly right, so the event is only intercepted when there is an app to open it
	 * with.
	 */
	async function openRepository(event: MouseEvent): Promise<void> {
		if (!isTauri()) return;
		event.preventDefault();
		await openUrl(REPOSITORY);
	}

	const FEATURE_KEYS = [
		'about.featureOpening',
		'about.featureCups',
		'about.featureFortune',
		'about.featureBilingual'
	] as const;
</script>

<div class="flex flex-col gap-4">
	<section class="card flex flex-col gap-1 p-4">
		<h2 class="text-sm font-semibold">{t('app.title')}</h2>
		<p class="dim text-xs">{t('about.version')} {version}</p>
	</section>

	<section class="card flex flex-col gap-2 p-4">
		<h2 class="text-sm font-semibold">{t('about.features')}</h2>
		<ul class="features">
			{#each FEATURE_KEYS as key (key)}
				<li>{t(key)}</li>
			{/each}
		</ul>
	</section>

	<section class="card flex flex-col gap-1 p-4">
		<h2 class="text-sm font-semibold">{t('about.developer')}</h2>
		<p class="text-xs">
			<a class="repo" href={REPOSITORY} onclick={openRepository} rel="noreferrer">{DEVELOPER}</a>
		</p>
	</section>
</div>

<style>
	.features {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin: 0;
		padding-left: 1.1rem;
		color: var(--c-text-dim);
		font-size: 0.75rem;
	}

	.repo {
		color: var(--c-accent);
		text-decoration: none;
	}

	.repo:hover,
	.repo:focus-visible {
		text-decoration: underline;
	}
</style>