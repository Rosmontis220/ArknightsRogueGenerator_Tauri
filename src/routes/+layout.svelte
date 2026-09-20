<script lang="ts">
	import '../app.css';
	import appIcon from '$lib/assets/app-icon.png';
	import { t } from '$lib/i18n';
	import { appState } from '$lib/stores/app-state.svelte';

	let { children } = $props();

	// `prefers-reduced-motion` covers the OS setting, but the app has its own
	// tri-state preference, so it lives on the document element where the
	// stylesheet can see it.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.dataset.reduceMotion = appState.state.appearance.reduceMotion;
	});
</script>

<svelte:head>
	<link rel="icon" href={appIcon} />
	<!-- Reactive, so the tab follows a language change along with the page. The OS window
	     title is the Tauri `productName` and stays as configured. -->
	<title>{t('app.title')}</title>
</svelte:head>

{@render children()}
