<script lang="ts">
	/**
	 * The settings body container.
	 *
	 * No tab row here, unlike 生成: the reference client has no `settings/+layout.svelte`,
	 * and `/home/settings` is itself the navigation (see `$lib/settings-entries`). The
	 * rail's 设置 item is the primary way back; this adds an explicit link as well,
	 * because a visible link beats a convention you have to know.
	 */

	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n';
	import { SETTINGS_ROOT } from '$lib/settings-entries';

	let { children } = $props();

	// On the root, the list below *is* the destination — there is nowhere to go back to.
	const isRoot = $derived(page.url.pathname === SETTINGS_ROOT);
</script>

<div class="route-body">
	{#if !isRoot}
		<a class="back" href={SETTINGS_ROOT}>
			<Icon name="arrow_back" size="16px" />
			<span>{t('settings.back')}</span>
		</a>
	{/if}

	{@render children()}
</div>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.7rem;
		color: var(--c-text-dim);
		font-size: 0.78rem;
		text-decoration: none;
	}

	.back:hover {
		color: var(--c-primary-text);
	}
</style>
