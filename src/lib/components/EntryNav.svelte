<script lang="ts">
	/**
	 * The shared "pick a page" list.
	 *
	 * Used by the settings root and the generator selection page, which are the same
	 * screen with different data. Extracted rather than duplicated because the styling is
	 * the whole point of the pattern — an entry has an icon, a title, a description and a
	 * chevron, and the description is what makes "box" or "仙术杯 #8" mean anything before
	 * you click it.
	 */

	import Icon from './Icon.svelte';
	import type { NavGroup } from '$lib/nav-entries';

	let { groups, label }: { groups: readonly NavGroup[]; label: string } = $props();
</script>

<nav class="nav" aria-label={label}>
	{#each groups as group (group.id)}
		<div class="group">
			{#if group.title !== undefined}
				<h2 class="group-title">{group.title}</h2>
			{/if}

			<ul class="entries">
				{#each group.entries as entry (entry.id)}
					<li>
						<a class="entry" href={entry.href}>
							<span class="entry-icon" aria-hidden="true">
								<Icon name={entry.icon} />
							</span>
							<span class="entry-copy">
								<span class="entry-title">
									{entry.label}
									{#if entry.badge !== undefined}
										<span class="entry-badge">{entry.badge}</span>
									{/if}
								</span>
								<span class="entry-description">{entry.description}</span>
							</span>
							<span class="entry-arrow" aria-hidden="true">
								<Icon name="chevron_right" size="18px" />
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>

<style>
	.nav {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-title {
		margin: 0;
		color: var(--c-text-dim);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.entries {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.entry {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--c-border);
		border-radius: 14px;
		padding: 0.75rem 0.9rem;
		background: var(--c-surface);
		color: var(--c-text);
		text-decoration: none;
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			transform 160ms ease;
	}

	.entry:hover {
		border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border));
		background: var(--c-surface-2);
		transform: translateY(-1px);
	}

	.entry-icon {
		display: grid;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		place-items: center;
		background: var(--c-primary-soft);
		color: var(--c-primary-text);
	}

	.entry-copy {
		display: grid;
		min-width: 0;
		gap: 0.1rem;
	}

	.entry-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.entry-badge {
		border-radius: 999px;
		padding: 0.05rem 0.4rem;
		background: var(--c-primary-soft);
		color: var(--c-primary-text);
		font-size: 0.62rem;
		font-weight: 500;
	}

	.entry-description {
		color: var(--c-text-dim);
		font-size: 0.74rem;
	}

	.entry-arrow {
		color: var(--c-text-dim);
	}

	@media (prefers-reduced-motion: reduce) {
		.entry,
		.entry:hover {
			transform: none;
			transition: none;
		}
	}
</style>
