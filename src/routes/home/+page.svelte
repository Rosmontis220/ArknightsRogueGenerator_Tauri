<script lang="ts">
	/**
	 * 首页: the landing screen. A greeting, 投钱问路, and a way into 生成.
	 *
	 * The hour is re-read on a timer rather than once at mount, so a window left open
	 * across noon — or across midnight with the user asleep — says the right thing when
	 * they come back to it instead of freezing on whatever it said at launch. Same reason
	 * the generate screen re-reads the date, and the reason the date is re-read *here*:
	 * it is half of the toss's seed, so a window left open across midnight has to toss
	 * the new day's coins rather than keep showing yesterday's.
	 */

	import { onDestroy, onMount } from 'svelte';
	import { fadeUp, prefersReducedMotion } from '$lib/motion';
	import { t } from '$lib/i18n';
	import { formatDate, seedFor } from '$lib/core/seed';
	import {
		TOSS_SIZE,
		tongbaoImageUrl,
		tongbaoName,
		tongbaoVerseLines,
		tossTongbao,
		tossVerdict
	} from '$lib/core/tongbao';
	import { appState } from '$lib/stores/app-state.svelte';
	import { readTossedOn, writeTossedOn } from '$lib/persistence';

	/**
	 * 凌晨 0:00–5:59, 早上 6:00–10:59, 中午 11:00–12:59, 下午 13:00–17:59, 晚上 18:00–23:59.
	 *
	 * Five buckets, not three: with only 早上 / 下午 / 晚上, 3am came out as 晚上好, and the
	 * hour people actually open this app after lunch was indistinguishable from one at nine.
	 * The boundaries are checked in order and the last branch catches the rest, so the
	 * function is total — every hour of the day has exactly one greeting.
	 */
	function greetingKeyFor(hour: number): string {
		if (hour < 6) return 'home.greeting.dawn';
		if (hour < 11) return 'home.greeting.morning';
		if (hour < 13) return 'home.greeting.noon';
		if (hour < 18) return 'home.greeting.afternoon';
		return 'home.greeting.evening';
	}

	/**
	 * How long the coins tumble before the result lands.
	 *
	 * Long enough to read as a toss rather than a flicker, short enough that nobody waits
	 * for it. The delay is skipped entirely when motion is reduced — not shortened, since
	 * there is nothing to see in a 0ms tumble.
	 */
	const TOSS_MS = 620;

	/** How much later each coin lands than the one before it. */
	const LANDING_STAGGER_MS = 90;

	/** One entry per coin the tumble draws, so the placeholder count cannot drift from it. */
	const SLOTS: readonly number[] = Array.from({ length: TOSS_SIZE }, (_, index) => index);

	type Phase = 'idle' | 'tossing' | 'shown';

	let hour = $state(new Date().getHours());
	let today = $state(formatDate(new Date()));

	/**
	 * The day the toss was last made, read back from the previous run.
	 *
	 * Kept as a *date* rather than a boolean, and compared against `today` below. That is
	 * what makes the reveal last exactly as long as the fortune does: reopening the app
	 * on the same day goes straight to the coins, and a window left open across midnight
	 * falls back to asking on its own, with nothing to clear and no timer to arm.
	 */
	let revealedOn = $state<string | null>(readTossedOn());

	/** True only while the coins are in the air. */
	let tossing = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const revealed = $derived(revealedOn === today);
	const phase: Phase = $derived(tossing ? 'tossing' : revealed ? 'shown' : 'idle');

	onMount(() => {
		const tick = setInterval(() => {
			hour = new Date().getHours();
			today = formatDate(new Date());
		}, 60_000);
		return () => clearInterval(tick);
	});

	// The reveal timer is short, but a user who tosses and immediately navigates away would
	// otherwise have it fire into a destroyed component.
	onDestroy(() => clearTimeout(timer));

	/**
	 * Lands the coins and remembers the day, so the next visit does not ask again.
	 *
	 * There is no "toss again" once they are down: the three are fixed for this ID on this
	 * day, so a second toss would either repeat itself — which reads as a broken button —
	 * or lie. A new day is what re-arms it.
	 */
	function reveal(): void {
		tossing = false;
		revealedOn = today;
		writeTossedOn(today);
	}

	function startToss(): void {
		if (phase !== 'idle') return;
		if (prefersReducedMotion()) {
			reveal();
			return;
		}
		tossing = true;
		timer = setTimeout(reveal, TOSS_MS);
	}

	const name = $derived(appState.state.identity.name.trim());
	const greeting = $derived(t(greetingKeyFor(hour)));

	// Reached while the ID field is blank mid-edit, and on a document older than the default
	// ID. It is no longer the normal first-run state: an unnamed player is stored as 博士 now.
	// The branch stays because a name and an empty string are not the same thing to a
	// salutation, and "Dr." followed by nothing is not a greeting.
	const line = $derived(
		name === ''
			? t('home.greeting.anonymous', { greeting })
			: t('home.greeting.withName', { greeting, name })
	);

	/**
	 * The three coins, keyed on the same `(ID, date)` pair the run uses.
	 *
	 * The stored name, not the trimmed one the greeting uses: an untrimmed name would seed
	 * differently here than it does on the generate screen, and the two would disagree
	 * about which day it is for a player whose ID has a trailing space.
	 */
	const coins = $derived(tossTongbao(seedFor(appState.state.identity.name, today)));
	const verdict = $derived(tossVerdict(coins));
</script>

<section class="flex flex-col gap-4">
	<div class="card flex flex-col gap-2 px-5 py-6">
		<h2 class="greeting">{line}</h2>
		<p class="dim text-sm">{t('home.subtitle')}</p>
	</div>

	<div class="card fortune">
		<div class="fortune-head">
			<h3 class="fortune-title">{t('home.fortune.title')}</h3>
			<span class="dim fortune-subtitle">{t('home.fortune.subtitle')}</span>
			<span class="dim fortune-date">{today}</span>
		</div>

		<!--
			A fixed floor on the body, so asking for the toss does not grow the card and
			shove the 生成 button down the page. The stacked layout on a narrow screen is
			taller than this, which is fine — a floor is not a ceiling.
		-->
		<div class="fortune-body">
			{#if phase === 'idle'}
				<div class="ask">
					<p class="dim hint">{t('home.fortune.hint')}</p>
					<button class="btn btn-primary toss" onclick={startToss}>
						{t('home.fortune.toss')}
					</button>
				</div>
			{:else if phase === 'tossing'}
				<div class="tumbling" aria-hidden="true">
					{#each SLOTS as slot (slot)}
						<span class="disc"></span>
					{/each}
				</div>
				<p class="verdict dim">{t('home.fortune.tossing')}</p>
			{:else}
				<p class="verdict" data-verdict={verdict} in:fadeUp>
					{t(`home.fortune.verdict.${verdict}`)}
				</p>

				<ul class="coins">
					{#each coins as coin, index (coin.id)}
						<!-- The type is carried by a coloured stripe and a dot, never by
						     coloured text: the game's own three colours are teal, pink and
						     dark red, and white on its teal is 2.6:1. The colour is
						     decoration on top of the written label, so a reader who cannot
						     tell them apart loses nothing. -->
						<li
							class="coin"
							data-type={coin.type}
							in:fadeUp={{ delay: index * LANDING_STAGGER_MS }}
						>
							<img
								class="coin-image"
								src={tongbaoImageUrl(coin.id)}
								alt=""
								draggable="false"
							/>
							<span class="coin-type">{t(`home.fortune.type.${coin.type}`)}</span>
							<span class="coin-name">{tongbaoName(coin)}</span>
							<span class="coin-verse">
								{#each tongbaoVerseLines(coin) as phrase, line (line)}
									<span class="coin-phrase">{phrase}</span>
								{/each}
							</span>
						</li>
					{/each}
				</ul>

				<p class="dim note">{t('home.fortune.note')}</p>
			{/if}
		</div>
	</div>

	<!-- Two ways out of the landing screen, sharing the width evenly. `flex: 1 1 0` rather
	     than `1 1 auto`: with auto, 生成 and 历史 would take shares of the row in proportion
	     to their labels and the two would not line up with anything. -->
	<div class="actions">
		<a class="btn btn-primary" href="/home/generate">{t('nav.generate')}</a>
		<a class="btn" href="/home/history">{t('nav.history')}</a>
	</div>
</section>

<style>
	.greeting {
		margin: 0;
		font-size: clamp(1.4rem, 4.2vw, 2rem);
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}

	.actions {
		display: flex;
		gap: 0.6rem;
	}

	.actions > a {
		flex: 1 1 0;
	}

	.fortune {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem 1.1rem;
	}

	.fortune-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.fortune-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
	}

	.fortune-subtitle {
		font-size: 0.8rem;
	}

	/* Pushed to the far end of the row: it is a fact about the toss, not part of its name. */
	.fortune-date {
		margin-left: auto;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	.fortune-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 13rem;
	}

	/* Centred in the reserved space, so the card reads as waiting rather than as empty. */
	.ask {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		text-align: center;
	}

	.hint {
		margin: 0;
		font-size: 0.85rem;
	}

	.toss {
		min-width: 9rem;
	}

	/* The tumble, held to the same height as the three cards so nothing jumps on landing. */
	.tumbling {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.disc {
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 50%;
		border: 2px solid var(--c-border);
		background: var(--c-surface);
		animation: tumble 620ms ease-in-out infinite;
	}

	.disc:nth-child(2) {
		animation-delay: 110ms;
	}

	.disc:nth-child(3) {
		animation-delay: 220ms;
	}

	/* A coin caught mid-air: it spins on its own axis and bobs. No translate on the X axis,
	   so three of them do not read as a slot machine paying out. */
	@keyframes tumble {
		0%,
		100% {
			transform: rotateY(0deg) translateY(0);
			opacity: 0.55;
		}
		50% {
			transform: rotateY(180deg) translateY(-0.4rem);
			opacity: 1;
		}
	}

	.verdict {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: 0.08em;
	}

	/*
	 * The finished verdict, as a badge filled with the game's own colour for the outcome:
	 * 花钱 pink, 厉钱 blood red, 听凭天命 the teal the game prints it in. The same three
	 * colours the coin types carry below, and deliberately *not* re-tinted per scheme — the
	 * toss is a game artefact and should read the same on all six.
	 *
	 * Filled rather than coloured text, which is the part worth explaining. Coloured text was
	 * the first attempt and it cannot be made to work: measured against each scheme's card,
	 * the game's colours run from 1.25:1 (厉钱 on 萨米's mid-grey) to 8.39:1, so every scheme
	 * would need its own trio — and on 萨米 no pink that clears 4.5:1 is still distinguishable
	 * from a blood red that does. A fill sidesteps the whole problem, because the text on it is
	 * chosen per *fill* rather than per scheme, so three pairs cover all six schemes. Measured:
	 * black on the teal 6.73:1, black on the pink 6.31:1, white on the red 8.39:1.
	 *
	 * Only when a verdict exists — the "投钱中…" line carries no `data-verdict`, so it keeps
	 * the dim treatment it had and there is no background to compete with the tumble.
	 */
	.verdict[data-verdict] {
		align-self: flex-start;
		padding: 0.3rem 0.9rem;
		border-radius: 999px;
		background: var(--verdict);
		color: var(--on-verdict);
	}

	.verdict[data-verdict='fate'] {
		--verdict: #0da997;
		--on-verdict: #0a0a0a;
	}

	.verdict[data-verdict='flower'] {
		--verdict: #f06179;
		--on-verdict: #0a0a0a;
	}

	.verdict[data-verdict='risk'] {
		--verdict: #941f33;
		--on-verdict: #ffffff;
	}

	.coins {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* The stripe is the type's colour and the only place a coin's type is painted. */
	.coin {
		flex: 1 1 8.5rem;
		min-width: 8.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.85rem 0.7rem 0.9rem;
		border: 1px solid var(--c-border);
		border-top: 3px solid var(--coin-type, var(--c-border));
		border-radius: 0.6rem;
		background: var(--c-surface-2);
		text-align: center;
	}

	.coin[data-type='balance'] {
		--coin-type: #0da997;
	}

	.coin[data-type='flower'] {
		--coin-type: #f06179;
	}

	.coin[data-type='risk'] {
		--coin-type: #941f33;
	}

	.coin-image {
		width: 4rem;
		height: 4rem;
		object-fit: contain;
	}

	.coin-type {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: var(--c-text-dim);
	}

	.coin-type::before {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--coin-type);
		content: '';
	}

	.coin-name {
		font-size: 0.95rem;
		font-weight: 600;
	}

	/* One phrase per line, which is how a 判词 is printed. */
	.coin-verse {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--c-text-dim);
	}

	.note {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	@media (max-width: 30rem) {
		/* Three across is unreadable at this width; two rows of one-and-a-half is worse, so
		   they stack and the verses get the full width to themselves. */
		.coin {
			flex-basis: 100%;
		}

		.fortune-body {
			min-height: 0;
		}
	}
</style>
