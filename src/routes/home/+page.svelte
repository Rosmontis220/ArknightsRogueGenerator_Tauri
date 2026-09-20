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
	import { locale } from '$lib/i18n/locale.svelte';
	import { formatDate, seedFor } from '$lib/core/seed';
	import {
		TOSS_SIZE,
		tongbaoImageUrl,
		tongbaoName,
		tongbaoVerseLines,
		tossTongbao,
		tossVerdict
	} from '$lib/core/tongbao';
	import {
		TAROT_POSITIONS,
		readTarot,
		tarotImageUrl,
		tarotKeywordLine,
		tarotName
	} from '$lib/core/tarot';
	import { appState } from '$lib/stores/app-state.svelte';
	import { readFortuneOn, writeFortuneOn } from '$lib/persistence';
	import type { FortunePractice } from '$lib/persistence';

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

	/** How long the deck shuffles before the cards are dealt. Shorter: no landing to stagger. */
	const SHUFFLE_MS = 520;

	/** How much later each coin lands than the one before it. */
	const LANDING_STAGGER_MS = 90;

	/** One entry per coin the tumble draws, so the placeholder count cannot drift from it. */
	const SLOTS: readonly number[] = Array.from({ length: TOSS_SIZE }, (_, index) => index);

	/** One entry per card the shuffle deals, for the same reason. */
	const CARD_SLOTS: readonly number[] = TAROT_POSITIONS.map((_, index) => index);

	/** Which practice the card is showing. `choose` is the two buttons and nothing else. */
	type View = 'choose' | FortunePractice;

	let hour = $state(new Date().getHours());
	let today = $state(formatDate(new Date()));

	/**
	 * The day each practice was last performed, read back from the previous run.
	 *
	 * Kept as *dates* rather than booleans, and compared against `today` below. That is what
	 * makes a reveal last exactly as long as its fortune does: reopening the app on the same
	 * day goes straight to the result, and a window left open across midnight falls back to
	 * asking on its own, with nothing to clear and no timer to arm.
	 */
	let tossedOn = $state<string | null>(readFortuneOn('toss'));
	let tarotOn = $state<string | null>(readFortuneOn('tarot'));

	/**
	 * Which practice is on screen, and whether it is still being performed.
	 *
	 * One `view` rather than a flag per practice: the card shows exactly one thing at a time,
	 * so two booleans would admit states — both open, neither open — that have no meaning.
	 */
	let view = $state<View>('choose');

	/** True only while the coins are in the air or the deck is shuffling. */
	let busy = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const tossedToday = $derived(tossedOn === today);
	const tarotToday = $derived(tarotOn === today);

	onMount(() => {
		const tick = setInterval(() => {
			hour = new Date().getHours();

			const now = formatDate(new Date());
			if (now !== today) {
				// The day rolled over with the window open. What is on screen belongs to
				// yesterday, so the card goes back to asking; the stored keys stop matching
				// the new `today` on their own, so there is nothing to clear. A draw that was
				// still in the air is dropped rather than landed: it would otherwise mark the
				// new day as drawn without the reader ever having seen it.
				today = now;
				view = 'choose';
				busy = false;
				clearTimeout(timer);
			}
		}, 60_000);
		return () => clearInterval(tick);
	});

	// The reveal timer is short, but a user who tosses and immediately navigates away would
	// otherwise have it fire into a destroyed component.
	onDestroy(() => clearTimeout(timer));

	/**
	 * Lands the result and remembers the day, so the next visit does not ask again.
	 *
	 * There is no "draw again" once it is down: the coins and the cards are fixed for this ID
	 * on this day, so a second attempt would either repeat itself — which reads as a broken
	 * button — or lie. A new day is what re-arms it.
	 */
	function reveal(practice: FortunePractice): void {
		busy = false;
		if (practice === 'toss') {
			tossedOn = today;
			writeFortuneOn('toss', today);
		} else {
			tarotOn = today;
			writeFortuneOn('tarot', today);
		}
	}

	/**
	 * Performs a practice, or jumps straight to its result when it has already been done today.
	 *
	 * The second branch is what the 已抽 mark does: the button stays tappable, and tapping it
	 * shows the same reading rather than being inert. The result is never stored, only the
	 * fact that it was drawn, so this re-derives it from the same `(ID, date)` pair.
	 */
	function start(practice: FortunePractice, ms: number): void {
		if (busy) return;

		view = practice;

		const alreadyDone = practice === 'toss' ? tossedToday : tarotToday;
		if (alreadyDone || prefersReducedMotion()) {
			reveal(practice);
			return;
		}

		busy = true;
		timer = setTimeout(() => reveal(practice), ms);
	}

	/** Back to the two buttons, with whatever has been drawn today marked 已抽. */
	function back(): void {
		clearTimeout(timer);
		busy = false;
		view = 'choose';
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

	/** The two cards, from the same seed the toss uses — one fortune per ID per day. */
	const reading = $derived(readTarot(seedFor(appState.state.identity.name, today)));

	/**
	 * The game labels the spread in English — `DAILY READING`, `THE COIN` — and names every
	 * card in English too. Those are proper nouns and are shown as they are in both
	 * languages; only the Chinese mode needs the Chinese alongside them, so only the Chinese
	 * mode gets the second half of `DAILY READING日常占卜` and `XVII 星 The Star`. Without
	 * this the English mode would read `DAILY READINGDaily Reading` and `XVII The Star The
	 * Star`.
	 */
	const chinese = $derived(locale.current === 'zh-CN');
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
			A fixed floor on the body, so asking for a draw does not grow the card and shove
			the 生成 button down the page. The stacked layout on a narrow screen is taller
			than this, which is fine — a floor is not a ceiling.
		-->
		<div class="fortune-body">
			{#if view === 'choose'}
				<div class="ask">
					<p class="dim hint">{t('home.fortune.hint')}</p>
					<!--
						One button per practice. A practice already performed today stays
						enabled and carries 已抽 rather than being greyed out: the reading is
						still there to re-read, it just cannot be drawn a second time.
					-->
					<div class="choices">
						<button class="btn btn-primary choice" onclick={() => start('toss', TOSS_MS)}>
							<span>{t('home.fortune.toss')}</span>
							{#if tossedToday}<span class="drawn">{t('home.fortune.drawn')}</span>{/if}
						</button>
						<button class="btn choice" onclick={() => start('tarot', SHUFFLE_MS)}>
							<span>{t('home.fortune.tarot')}</span>
							{#if tarotToday}<span class="drawn">{t('home.fortune.drawn')}</span>{/if}
						</button>
					</div>
				</div>
			{:else if view === 'toss'}
				{#if busy}
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
					<button class="btn back" onclick={back}>{t('home.fortune.back')}</button>
				{/if}
			{:else if busy}
				<div class="tumbling" aria-hidden="true">
					{#each CARD_SLOTS as slot (slot)}
						<span class="card-back"></span>
					{/each}
				</div>
				<p class="verdict dim">{t('home.fortune.tarotting')}</p>
			{:else}
				<!--
					The 正与反 spread, drawn the way the game draws it: a dark blue frame whose
					white middle carries the reading, a white band naming the spread in the
					game's red, and one black slot per position. Each slot holds the card the
					way the game's card box shows it — art tilted in its own gradient frame
					beside a blue name bar, with the keyword row under the bar.

					A card that landed reversed is shown upside down, which is the whole of
					what 逆位 means. The tilt does not change: the card still lies at the same
					angle on the table, only its face is turned. The name and the keyword row
					stay upright either way, because they are text to be read.
				-->
				<div class="reading">
					<p class="reading-head">
						<span class="reading-tag">DAILY READING</span>{#if chinese}{t(
								'home.fortune.tarot.spread'
							)}{/if}
						<br />
						<span class="reading-tag">THE <span class="reading-big">COIN</span></span
						>{#if chinese}{t('home.fortune.tarot.kind')}{/if}
					</p>

					<ul class="slots">
						{#each reading as draw, index (TAROT_POSITIONS[index])}
							<li
								class="slot"
								data-reversed={draw.orientation === 'reversed'}
								in:fadeUp={{ delay: index * LANDING_STAGGER_MS }}
							>
								<span class="slot-label">
									{t(`home.fortune.tarot.position.${TAROT_POSITIONS[index]}`)}
								</span>

								<table class="tarot">
									<tbody>
										<tr>
											<td class="tarot-art" rowspan="2">
												<img
													class="tarot-image"
													src={tarotImageUrl(draw.card.id)}
													alt=""
													draggable="false"
												/>
											</td>
											<td class="tarot-name" colspan="2">
												{draw.card.numeral} {tarotName(draw.card)}{#if chinese}{' '}<span
														class="tarot-en">{draw.card.en}</span
													>{/if}
											</td>
										</tr>
										<tr>
											<td class="tarot-caption">
												{t(`home.fortune.tarot.orientation.${draw.orientation}`)}
											</td>
											<td class="tarot-keywords">{tarotKeywordLine(draw)}</td>
										</tr>
									</tbody>
								</table>
							</li>
						{/each}
					</ul>
				</div>

				<p class="dim note">{t('home.fortune.tarotNote')}</p>
				<button class="btn back" onclick={back}>{t('home.fortune.back')}</button>
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

	/* The two practices, sharing the row evenly like the buttons below the card. */
	.choices {
		display: flex;
		gap: 0.6rem;
		width: 100%;
	}

	.choice {
		flex: 1 1 0;
	}

	/*
	 * The 已抽 mark. It reads as part of the label rather than as a badge pinned over the
	 * button: it has to sit on a filled primary button and on a plain one, so it inherits
	 * whatever text colour the button already carries instead of bringing its own.
	 */
	.drawn {
		font-size: 0.7rem;
		font-weight: 400;
		opacity: 0.8;
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

	/* A card face-down. Portrait, and the same width as the real card below, so the deal
	   does not resize the row when it lands. */
	.card-back {
		width: 6rem;
		aspect-ratio: 160 / 242;
		border: 1px solid var(--c-border);
		border-radius: 0.5rem;
		background: var(--c-surface);
		animation: riffle 520ms ease-in-out infinite;
	}

	.card-back:nth-child(2) {
		animation-delay: 130ms;
	}

	/* The deck being cut: a short lift and settle, alternating, so two of them read as a
	   shuffle rather than as one card blinking. */
	@keyframes riffle {
		0%,
		100% {
			transform: translateY(0) rotate(-1.5deg);
			opacity: 0.6;
		}
		50% {
			transform: translateY(-0.35rem) rotate(1.5deg);
			opacity: 1;
		}
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

	/*
	 * The tarot block is the one place in the app that does not follow the theme palette.
	 * It is a reproduction of a specific table out of the game — the 正与反 spread and the
	 * card box that feeds it — so the colours are the game's own and are fixed on purpose.
	 * Everything here is taken from the wiki's stylesheet for those two tables.
	 */

	/* The spread's frame: dark blue bands down both sides with the reading on the white
	   middle, which is what a 105° gradient with stops at 20% and 80% draws.

	   Wider than the game's 500px table, and centred rather than stretched: the body is a
	   stretching flex column, and a frame floating against the left edge of a wider card
	   reads as a mistake. The extra width is what lets the card box inside a slot keep the
	   keyword line whole. */
	.reading {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-self: center;
		gap: 0.5rem;
		width: 100%;
		max-width: 40rem;
		padding: 0.6rem 0.5rem 0.7rem;
		background: linear-gradient(105deg, #060146 20%, #fff 20% 80%, #060146 80%);
		text-align: center;
	}

	/* The spread's name: dark text on the white middle, with the stylised English set on
	   its own white band in the game's red. */
	.reading-head {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.7;
		color: #202122;
	}

	.reading-tag {
		padding-inline: 0.5em;
		background: #fff;
		color: #ed3244;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.reading-big {
		font-size: 1.2em;
	}

	.slots {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* One position: a black box, which is how the game draws an empty slot in a spread.

	   The 19rem basis is what decides when the two stack. The card inside needs roughly
	   3.75rem of art, 3rem of caption and a whole keyword line; below two of those the
	   frame stacks rather than squeezing the keyword line onto a second row. */
	.slot {
		flex: 1 1 19rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.3rem 0.4rem;
		background: #000;
		color: #fff;
	}

	/* 所得 / 所失, in the game's serif italic. */
	.slot-label {
		font-family: serif;
		font-style: italic;
		font-weight: 700;
		font-size: 0.8rem;
		line-height: 1.2;
	}

	/* The card, as the game's card box draws it: the art in its own gradient frame beside
	   a blue name bar, with the keyword row under the bar. */
	.tarot {
		width: 100%;
		border-collapse: collapse;
	}

	.tarot td {
		border: 1px solid #a2a9b1;
		vertical-align: middle;
	}

	.tarot-art {
		width: 3.75rem;
		padding: 0.3rem 0.15rem;
		background: linear-gradient(45deg, #130c4c, #3322b3 70%, #2834db 70%);
	}

	/* The tilt is the game's: the card lies on the table at an angle rather than squared
	   up to the grid. Only the first glow is kept — the other three the game sets have no
	   blur and no offset, so they draw nothing. */
	.tarot-image {
		width: 100%;
		aspect-ratio: 160 / 242;
		object-fit: contain;
		transform: scale(0.85) rotateX(10deg) rotateZ(8deg);
		filter: drop-shadow(0 0 4px #ceffffdd);
	}

	/* A reversed card is shown upside down, which is the whole of what 逆位 means. The
	   tilt is unchanged: the card still lies at the same angle, only its face is turned. */
	.slot[data-reversed='true'] .tarot-image {
		transform: scale(0.85) rotateX(10deg) rotateZ(8deg) rotate(180deg);
	}

	.tarot-name {
		padding: 0.25rem 0.35rem;
		background: #1b39df;
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1.45;
		text-align: left;
	}

	.tarot-en {
		font-weight: 400;
	}

	/* Upright / Reversed, in the game's serif small caps. */
	.tarot-caption {
		width: 3rem;
		padding: 0.2rem;
		background: #f8f9fa;
		color: #202122;
		font-family: serif;
		font-size: 0.66rem;
		font-variant: small-caps;
		text-align: center;
	}

	/* The keywords are one 顿号-separated line, as the game prints them. The column is
	   sized so that line stays whole: a wrapped list reads as two lists. */
	.tarot-keywords {
		padding: 0.2rem 0.25rem;
		background: #f8f9fa;
		color: #202122;
		font-size: 0.66rem;
		line-height: 1.4;
		text-align: left;
	}

	/* Under the result rather than beside it: the draw is over, and the only way on is back
	   to the other practice. */
	.back {
		align-self: flex-start;
	}

	.note {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	@media (max-width: 30rem) {
		/* Three across is unreadable at this width; two rows of one-and-a-half is worse, so
		   they stack and the verses get the full width to themselves. The spread's two slots
		   need no rule here: two 19rem slots already outgrow any frame this narrow. */
		.coin {
			flex-basis: 100%;
		}

		/* The two practices are the only thing on the card at this point, so they stack too
		   rather than splitting a narrow row between two four-character labels. */
		.choices {
			flex-direction: column;
		}

		.fortune-body {
			min-height: 0;
		}
	}
</style>
