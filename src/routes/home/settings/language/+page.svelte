<script lang="ts">
	/**
	 * 语言. The interface language, as a settings section of its own.
	 *
	 * It used to be a row on 外观, which made it findable only by someone who had already
	 * gone looking for the theme — so the English catalogue existed but was effectively
	 * hidden from the people who needed it. The persisted shape follows: `language.locale`
	 * rather than `appearance.locale`.
	 *
	 * Laid out as full-width rows with the radio mark on the left, following the reference
	 * client's language screen. Two chips in a row said "pick one" less clearly than two
	 * rows do, and left the control floating in the middle of an otherwise empty card.
	 */

	import type { AppLocale } from '$lib/api/types';
	import { LOCALES, LOCALE_LABELS, t } from '$lib/i18n';
	import { locale } from '$lib/i18n/locale.svelte';
	import { appState } from '$lib/stores/app-state.svelte';

	/**
	 * Switches the interface language.
	 *
	 * The live store first, then the document, and not the other way round: `locale` is
	 * what every `t()` call reads, so setting it is what re-renders this page in the new
	 * language; persisting is only what brings it back after a restart.
	 */
	function setLocale(next: AppLocale): void {
		locale.set(next);
		appState.update((state) => {
			state.language.locale = next;
		});
	}
</script>

<section class="card flex flex-col gap-3 p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-semibold">{t('language.display')}</h2>
		<p class="dim text-xs">{t('language.help')}</p>
	</div>

	<div class="options" role="radiogroup" aria-label={t('language.display')}>
		{#each LOCALES as option (option)}
			{@const active = locale.current === option}
			<!-- Each language is named in itself, never translated: a picker that offers
			     "德语" to someone who reads only German is no use. -->
			<button
				type="button"
				role="radio"
				aria-checked={active}
				class="option"
				class:active
				onclick={() => setLocale(option)}
			>
				<span class="mark" aria-hidden="true"></span>
				<span>{LOCALE_LABELS[option]}</span>
			</button>
		{/each}
	</div>
</section>

<style>
	.options {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--c-border);
		border-radius: 10px;
		background: var(--c-surface-2);
		color: var(--c-text);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
	}

	.option:hover {
		border-color: var(--c-primary);
	}

	.option.active {
		border-color: var(--c-primary);
		background: var(--c-primary-soft);
		color: var(--c-primary-text);
	}

	.option:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	/* The radio mark, drawn rather than imported: the icon set has no filled/unfilled pair,
	 * and a 14px circle is not worth two SVG paths. */
	.mark {
		position: relative;
		flex: none;
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--c-text-dim);
		border-radius: 9999px;
	}

	.option.active .mark {
		border-color: var(--c-primary);
	}

	.option.active .mark::after {
		position: absolute;
		inset: 3px;
		border-radius: 9999px;
		background: var(--c-primary);
		content: '';
	}
</style>
