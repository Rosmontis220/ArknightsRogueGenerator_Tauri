/**
 * The 103 Tongbao of 岁的界园志异, and the daily toss.
 *
 * ## What a coin is
 *
 * Each one carries a type, a name, and a 判词 — four four-character phrases that read as
 * an omen. The verse is the whole point of the screen: the effect text (what the coin does
 * in a run) is deliberately not shipped, because this is a fortune, not a strategy guide.
 *
 * ## Which coins a toss can draw
 *
 * All of them but two. 103 coins are catalogued and 101 are tossable; see
 * {@link NEVER_TOSSED} for which two are not and why.
 *
 * ## Where the data came from
 *
 * The Chinese side is the game's own text, and the English side is the official English
 * wiki (`arknights.wiki.gg`). The join is recorded in `tongbao.json` and was made in two
 * steps, because neither one alone was enough:
 *
 *   - The wiki's list page has the English names but not the verses; each coin's own page
 *     has the verse as the second parameter of `{{Item description|effect|verse}}`.
 *   - 27 of those pages have an empty `cnname`, so the two lists could not be joined by
 *     name. They *are* both grouped into the same five sections in the same order, so the
 *     join is positional — and 76 of the 103 positions are independently confirmed by the
 *     pages that do carry a Chinese name.
 *
 * The four variants of 捕风 are one entry here. The game gives them four different effects
 * but the same name, image and verse, so they are the same coin for this purpose.
 *
 * ## The toss
 *
 * Three distinct coins, from `seedFor(name, date).derive('tongbao')` — the same seed the
 * run itself uses. Nothing here is random: the same ID on the same day always tosses the
 * same three, which is what lets two people compare fortunes the way they compare runs.
 */

import rawTongbao from './tongbao.json';
import { locale } from '../i18n/locale.svelte';
import type { Seed } from './seed';

/** The three kinds of coin. `balance` is 衡钱, `flower` 花钱, `risk` 厉钱. */
export type TongbaoType = 'balance' | 'flower' | 'risk';

export interface Tongbao {
	/** The ASCII slug the image is served under; see the module note on portraits. */
	readonly id: string;
	/** The Chinese name, which is also the key the wiki join was made on. */
	readonly name: string;
	readonly type: TongbaoType;
	/** The 判词, in Chinese. Always present, in both locales. */
	readonly verse: string;
	/** The official English name. */
	readonly en: string;
	/** The English verse, as the wiki renders it. */
	readonly enVerse: string;
}

/**
 * A cast rather than a hand-written schema, for the reason `names-en.ts` gives: TypeScript
 * reads the JSON's `type` field as `string`, so the union would not be enforced. The test
 * file is what validates the shape.
 */
const COINS = (rawTongbao as { coins: Tongbao[] }).coins;

/** Every coin, in the game's own order: 随盒赠钱, 砺武兵钱, 富贵商钱, 待铸子钱, 天师奇钱. */
export const TONGBAO: readonly Tongbao[] = COINS;

/**
 * The two coins the toss never draws.
 *
 * Both say so in their own effect text — 烽火台 "不会被投出", 钱盒底板 "加入钱盒时，源石锭+2。不会被投出"
 * — and neither has any toss effect to show, so drawing one would print a verse under a coin
 * that cannot be thrown. 烽火台 fires when it leaves the coffer; 钱盒底板 when it enters one.
 *
 * Held as names rather than as indices or as a filter built at load: this is a statement
 * about *these two coins*, and a name is the only key that survives the data being reordered.
 * {@link isTossable} is what reads it, so a third coin with the same wording is one line here
 * and nothing else.
 */
const NEVER_TOSSED: readonly string[] = ['烽火台', '钱盒底板'];

/** Whether a coin can come up in a toss. False only for {@link NEVER_TOSSED}. */
export function isTossable(coin: Tongbao): boolean {
	return !NEVER_TOSSED.includes(coin.name);
}

/** Every coin a toss can draw, in the game's own order. */
export const TOSSABLE_TONGBAO: readonly Tongbao[] = TONGBAO.filter(isTossable);

/**
 * How many coins a toss draws.
 *
 * Three, because that is what the game tosses and what the reference implementation drew.
 * {@link tossVerdict} depends on it: its messages are the ones the game shows when all
 * three land on the same type.
 */
export const TOSS_SIZE = 3;

/** The phrase separator inside a verse: an ideographic space, not an ASCII one. */
const PHRASE_SEPARATOR = '\u3000';

/**
 * How many lines a verse is printed on.
 *
 * Not {@link TOSS_SIZE} spelled out again: a verse is four phrases because that is what the
 * game's verses are, and the two numbers coinciding would be a coincidence to preserve by
 * accident. The data build enforces four on the Chinese side.
 */
const VERSE_LINES = 4;

/** Where the coin images are served from. Absolute: `static/` lands at the bundle's root. */
const IMAGE_BASE = '/tongbao/';

/** The URL of a coin's image. Every coin has one; the test asserts it. */
export function tongbaoImageUrl(id: string): string {
	return `${IMAGE_BASE}${id}.png`;
}

/** The coin's name in the reader's language. */
export function tongbaoName(coin: Tongbao): string {
	return locale.current === 'zh-CN' ? coin.name : coin.en;
}

/** The coin's verse in the reader's language. */
export function tongbaoVerse(coin: Tongbao): string {
	return locale.current === 'zh-CN' ? coin.verse : coin.enVerse;
}

/**
 * One English sentence, punctuation and a closing quote included.
 *
 * Written as a match rather than a split because the punctuation is not uniform: 鸭爵金币's
 * verse is `A Fine Piece! Priceless? Take my offer. Dare you refuse.` and 志欲遂's quotes
 * itself, `Old tree blooms. "I still last." Aged testee asks. "Did I pass?"`. Splitting on
 * `.` gets 3 parts for the first and 3 for the second, and a lookbehind that also accepts
 * `!` and `?` still leaves the closing quote stranded at the start of the next line.
 */
const EN_SENTENCE = /[^.?!]+[.?!]+"?/g;

/**
 * The verse split into one phrase per line, which is how it is printed.
 *
 * The Chinese side is safe to split: the separator is an ideographic space and the data
 * build rejects any verse that is not exactly four phrases. The English side is four
 * sentences, and all 103 do yield exactly four — but it is still only split when the count
 * is right, so a wiki edit that merges two sentences degrades to one line instead of
 * printing three.
 */
export function tongbaoVerseLines(coin: Tongbao): readonly string[] {
	if (locale.current === 'zh-CN') return coin.verse.split(PHRASE_SEPARATOR);

	const parts = (coin.enVerse.match(EN_SENTENCE) ?? [])
		.map((part) => part.trim())
		.filter((part) => part !== '');

	return parts.length === VERSE_LINES ? parts : [coin.enVerse];
}

/**
 * Today's three coins.
 *
 * The pool shrinks as coins are taken, so the three are always distinct — the game can only
 * have one of each in the coffer. Each draw derives its own child seed rather than reusing
 * the parent: with a fixed value, `value % length` is the same index every time, and three
 * draws would return three copies of one coin.
 *
 * Drawn from {@link TOSSABLE_TONGBAO}, not from all 103: the two coins that cannot be tossed
 * are not in the coffer's draw any more than they are in the game's.
 */
export function tossTongbao(seed: Seed): readonly Tongbao[] {
	const pool = [...TOSSABLE_TONGBAO];
	const drawn: Tongbao[] = [];

	for (let i = 0; i < TOSS_SIZE; i++) {
		const index = seed.derive(`tongbao-${i}`).pickIndex(pool.length);
		drawn.push(pool[index]);
		pool.splice(index, 1);
	}

	return drawn;
}

/** What the game announces when the toss is over. */
export type TossVerdict = 'flower' | 'risk' | 'fate';

/**
 * The verdict, by the game's own rule: all three Flower Coins, all three Risk Coins, or
 * anything else. It is decided on the types alone — the coins' effects do not enter into
 * it, and neither does the order they were drawn in.
 */
export function tossVerdict(coins: readonly Tongbao[]): TossVerdict {
	if (coins.length > 0 && coins.every((coin) => coin.type === 'flower')) return 'flower';
	if (coins.length > 0 && coins.every((coin) => coin.type === 'risk')) return 'risk';
	return 'fate';
}
