<script lang="ts">
	/**
	 * The generate body container: one back link, and nothing else.
	 *
	 * It used to own two `SectionTabs` rows: families on top, editions below. Those are
	 * gone. The generate route is now three screens — the landing (one button per mode),
	 * a mode's edition list (`?f=`), and a generator (`?g=`) — and this file's only job is
	 * the link one step up from each of them. That link lives here rather than in the page
	 * so it sits above everything the page renders and cannot be forgotten when a screen
	 * is added.
	 */

	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { getGeneratorOrUndefined } from '$lib/generators/registry';
	import { t } from '$lib/i18n';
	import { FAMILY_PARAM, GENERATE_PATH, familyHref, familyLabel } from '$lib/nav-entries';

	let { children } = $props();

	// Deliberately the same test the page uses, not just "no `?g=`": the page treats an
	// unknown id as nothing selected, so anything looser here would offer a back link on
	// the landing screen itself.
	const generator = $derived(getGeneratorOrUndefined(page.url.searchParams.get('g')));
	const family = $derived(page.url.searchParams.get(FAMILY_PARAM));

	/**
	 * One step up, or `undefined` on the landing screen — which is the top.
	 *
	 * A generator inside a mode goes back to that mode's edition list, not to the landing
	 * screen: 仙术杯 has eleven editions, and dropping the reader out of the mode every
	 * time would make comparing two of them tedious.
	 */
	const up = $derived.by((): { href: string; label: string } | undefined => {
		if (generator !== undefined) {
			const label = t('nav.generators');
			return generator.family === undefined
				? { href: GENERATE_PATH, label }
				: { href: familyHref(generator.family), label: familyLabel(generator.family) ?? label };
		}

		if (family !== null) {
			return { href: GENERATE_PATH, label: t('nav.generators') };
		}

		return undefined;
	});
</script>

<div class="route-body">
	{#if up !== undefined}
		<a class="back" href={up.href}>
			<Icon name="arrow_back" size="16px" />
			<span>{up.label}</span>
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
