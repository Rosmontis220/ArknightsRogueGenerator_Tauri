<script lang="ts">
	/**
	 * The application shell: topbar, left rail, content.
	 *
	 * The shell is a fixed 244px left rail on desktop that becomes a drawer below
	 * 820px, with the selected item marked by a left accent bar and a topbar carrying the
	 * route title.
	 *
	 * Sub-page navigation is *not* here. Each route's landing view is a list of entries
	 * (`EntryNav`) that leads to the route's pages — 生成 lists the generators, 设置 the
	 * sections — so the shell never has to know what either route contains.
	 */

	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import OperatorAvatar from '$lib/components/OperatorAvatar.svelte';
	import { t } from '$lib/i18n';
	import { PRIMARY_NAV, isNavItemActive } from '$lib/navigation';
	import { appState } from '$lib/stores/app-state.svelte';

	let { children } = $props();

	let drawerOpen = $state(false);

	// A deep link skips the splash, so the document may not be loaded yet.
	onMount(() => {
		if (!appState.loaded) void appState.load();
	});

	// Bound on the window rather than on a focusable element, so the shortcut works
	// wherever the focus happens to be. `altKey`/`shiftKey` are rejected because
	// Ctrl+Shift+1 belongs to the OS or the webview, not to us.
	onMount(() => {
		function handleKeydown(event: KeyboardEvent) {
			if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;

			const item = PRIMARY_NAV.find((candidate) => candidate.shortcut === event.key);
			if (item === undefined) return;

			event.preventDefault();
			void goto(item.href);
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	const activeId = $derived(
		PRIMARY_NAV.find((item) => isNavItemActive(item, page.url.pathname))?.id
	);
	const routeTitle = $derived(
		t(PRIMARY_NAV.find((item) => item.id === activeId)?.labelKey ?? 'nav.generate')
	);

	// The drawer is an overlay: leaving it open across a navigation would hide the page
	// the user just asked for.
	$effect(() => {
		page.url.pathname;
		drawerOpen = false;
	});
</script>

<div class="shell safe-area">
	<header class="topbar">
		<button
			class="icon-button drawer-toggle"
			aria-label={t('nav.toggle')}
			aria-expanded={drawerOpen}
			onclick={() => (drawerOpen = !drawerOpen)}
		>
			<Icon name="menu" />
		</button>

		<h1 class="route-title">{routeTitle}</h1>

		<span class="save-state dim" aria-live="polite">
			{#if appState.saving}{t('common.saving')}{:else if appState.error}{t('common.saveFailed')}{/if}
		</span>

		<!-- The ID is the only input to the seed, so it stays visible on every screen
		     and clicking it is the shortcut to the field that owns it. The portrait leads
		     the pill when one is chosen, which is the only place a profile picture is of
		     any use: the screens it identifies are the ones outside the settings page.

		     No visible 「个人资料」 label. It sat beside an ID that is already the only
		     thing in the corner, and a pill that says "profile" next to a name and a face
		     is announcing a button that the pointer cursor and the tooltip already give
		     away. The accessible name keeps it, because that is not visible text. -->
		<button
			class="identity"
			title={t('nav.identityHint')}
			aria-label={t('nav.identity')}
			onclick={() => void goto('/home/settings/identity')}
		>
			{#if appState.state.identity.avatar !== ''}
				<OperatorAvatar name={appState.state.identity.avatar} mode={true} size="sm" />
			{/if}
			<strong>{appState.state.identity.name || t('common.emptyIdentity')}</strong>
		</button>
	</header>

	<div class="workspace">
		{#if drawerOpen}
			<button class="scrim" aria-label={t('common.close')} onclick={() => (drawerOpen = false)}
			></button>
		{/if}

		<aside class="rail" class:rail-open={drawerOpen} aria-label={t('nav.main')}>
			<nav class="rail-main">
				{#each PRIMARY_NAV as item (item.id)}
					<a
						class="nav-item"
						href={item.href}
						aria-current={activeId === item.id ? 'page' : undefined}
						aria-keyshortcuts={`Control+${item.shortcut}`}
					>
						<Icon name={item.icon} />
						<span>{t(item.labelKey)}</span>
						<span class="nav-shortcut" aria-hidden="true">Ctrl+{item.shortcut}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<main class="content">
			{#if appState.error}
				<div class="banner-wrap">
					<p class="banner" role="alert">{appState.error}</p>
				</div>
			{/if}

			{#if appState.loaded}
				{@render children()}
			{:else}
				<p class="dim loading">{t('common.loadingSettings')}</p>
			{/if}
		</main>
	</div>
</div>

<style>
	.shell {
		display: flex;
		height: 100dvh;
		flex-direction: column;
		overflow: hidden;
		background: var(--c-bg);
	}

	.topbar {
		display: flex;
		min-height: 48px;
		align-items: center;
		gap: 0.6rem;
		border-bottom: 1px solid var(--c-border);
		padding: 0.35rem 0.9rem;
		background: color-mix(in srgb, var(--c-surface) 88%, transparent);
		backdrop-filter: blur(20px) saturate(1.2);
	}

	.route-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.save-state {
		margin-left: auto;
		font-size: 0.72rem;
	}

	.identity {
		display: flex;
		max-width: 15rem;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--c-border);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		background: var(--c-surface-2);
		color: var(--c-text);
		font-size: 0.78rem;
	}

	.identity:hover {
		border-color: var(--c-primary);
	}

	.identity strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon-button {
		display: none;
		place-items: center;
		border: 1px solid var(--c-border);
		border-radius: 10px;
		padding: 0.3rem;
		background: var(--c-surface);
		color: var(--c-text);
	}

	.workspace {
		position: relative;
		display: flex;
		flex: 1;
		min-height: 0;
	}

	/* 244px, matching the reference client. */
	.rail {
		z-index: 35;
		display: flex;
		width: 244px;
		min-width: 244px;
		flex-direction: column;
		border-right: 1px solid var(--c-border);
		padding: 0.55rem;
		background: var(--c-surface);
	}

	.rail-main {
		display: grid;
		min-height: 0;
		flex: 1;
		align-content: start;
		gap: 0.15rem;
		overflow-y: auto;
	}

	.nav-item {
		position: relative;
		display: grid;
		min-height: 38px;
		grid-template-columns: 24px minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
		border-radius: 10px;
		padding: 0.4rem 0.6rem;
		color: var(--c-text);
		font-size: 0.85rem;
		text-decoration: none;
	}

	.nav-item:hover {
		background: var(--c-surface-2);
	}

	.nav-item[aria-current='page'] {
		background: var(--c-primary-soft);
		color: var(--c-primary-text);
		font-weight: 600;
	}

	/* The left accent bar, as in the reference client. */
	.nav-item[aria-current='page']::before {
		position: absolute;
		top: 9px;
		bottom: 9px;
		left: 2px;
		width: 3px;
		border-radius: 3px;
		background: var(--c-primary);
		content: '';
	}

	.nav-shortcut {
		border: 1px solid var(--c-border);
		border-radius: 5px;
		padding: 0.02rem 0.28rem;
		color: var(--c-text-dim);
		font-size: 0.62rem;
	}

	.content {
		min-width: 0;
		flex: 1;
		overflow-y: auto;
		background: var(--c-bg);
	}

	.banner-wrap {
		width: 100%;
		max-width: var(--shell-content-max);
		margin-inline: auto;
		padding: 0.75rem 1.25rem 0;
	}

	.banner {
		border: 1px solid var(--c-danger);
		border-radius: 12px;
		padding: 0.6rem 0.9rem;
		background: var(--c-danger-soft);
		color: var(--c-danger);
		font-size: 0.85rem;
	}

	.loading {
		padding: 1.5rem 1.25rem;
		font-size: 0.85rem;
	}

	.scrim {
		display: none;
	}

	@media (max-width: 820px) {
		.icon-button {
			display: grid;
		}

		.nav-shortcut {
			display: none;
		}

		.rail {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			width: min(80vw, 300px);
			min-width: min(80vw, 300px);
			border-right-color: var(--c-border);
			border-radius: 0 18px 18px 0;
			padding: 0.75rem 0.7rem;
			background: color-mix(in srgb, var(--c-surface) 96%, transparent);
			box-shadow: 0 12px 40px rgb(0 0 0 / 0.28);
			backdrop-filter: blur(20px);
			transform: translateX(-102%);
			transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
		}

		.rail-open {
			transform: translateX(0);
		}

		.nav-item {
			min-height: 48px;
			border-radius: 14px;
			font-size: 0.9rem;
		}

		.scrim {
			position: absolute;
			inset: 0;
			z-index: 34;
			display: block;
			border: 0;
			background: rgb(0 0 0 / 0.42);
		}
	}

	@media (max-width: 560px) {
		.identity {
			max-width: 8rem;
		}
	}
</style>
