/**
 * The eight tarot cards of 月行水上, and the daily reading.
 *
 * ## What a card is
 *
 * A numeral, a name, and **four keywords per orientation**. The reading is the two cards
 * plus which way up each one landed — not an interpretation, and deliberately not a
 * prediction. As with 投钱问路, the point is the omen, not advice.
 *
 * ## Where the data came from
 *
 * The cards and all 64 keywords are the Chinese text of the game's own 今日答案！ page
 * (PRTS). There is no official English wiki for this page, so the English keywords are a
 * translation rather than a quotation, unlike {@link TONGBAO}'s verses. They follow the
 * standard tarot vocabulary the Chinese is drawn from (`Upright` / `Reversed`).
 *
 * ## The reading
 *
 * Two cards, named after the 占卜牌阵 entry DAILY READING — THE **COIN** 正与反: one for
 * what the day gives (所得/Gain) and one for what it costs (所失/Cost). Each lands upright
 * or reversed, so the two orientations are independent.
 *
 * Nothing here is random: the reading comes from `seedFor(name, date)`, the same seed the
 * run itself uses, so the same ID on the same day always reads the same way.
 */

import { locale } from '../i18n/locale.svelte';
import type { Seed } from './seed';

/** The four keywords a card shows, in the fixed order the game prints them. */
export type TarotKeywords = readonly [string, string, string, string];

export interface TarotCard {
	/** The ASCII slug the image is served under; see the module note on portraits. */
	readonly id: string;
	/** The numeral the card is numbered with, as the game prints it: `XIV`, `XVII`. */
	readonly numeral: string;
	/** The Chinese name, which is how the game names the card: 节制. */
	readonly name: string;
	/** The official English name, as the game's own English release spells it. */
	readonly en: string;
	/** The keywords when the card lands upright. */
	readonly upright: TarotKeywords;
	/** The keywords when the card lands reversed. */
	readonly reversed: TarotKeywords;
	/** The English keywords for {@link upright}. */
	readonly enUpright: TarotKeywords;
	/** The English keywords for {@link reversed}. */
	readonly enReversed: TarotKeywords;
}

/** Every card, in the order the game's 塔罗牌盒 lists them. */
export const TAROT: readonly TarotCard[] = [
	{
		id: 'temperance',
		numeral: 'XIV',
		name: '节制',
		en: 'Temperance',
		upright: ['平衡', '耐心', '谨慎', '调和'],
		reversed: ['焦躁', '极端', '仓促', '鲁莽'],
		enUpright: ['Balance', 'Patience', 'Caution', 'Harmony'],
		enReversed: ['Agitation', 'Extremes', 'Haste', 'Recklessness']
	},
	{
		id: 'hanged-one',
		numeral: 'XII',
		name: '倒吊人',
		en: 'The Hanged One',
		upright: ['沉思', '等待', '牺牲', '改变视角'],
		reversed: ['拖延', '停滞', '漠然', '优柔寡断'],
		enUpright: ['Contemplation', 'Waiting', 'Sacrifice', 'A New Angle'],
		enReversed: ['Delay', 'Stagnation', 'Apathy', 'Indecision']
	},
	{
		id: 'hermit',
		numeral: 'IX',
		name: '隐者',
		en: 'The Hermit',
		upright: ['审视', '独处', '求真', '寻找自我'],
		reversed: ['逃避', '孤独', '被困', '自命不凡'],
		enUpright: ['Introspection', 'Solitude', 'Truth-Seeking', 'Finding Oneself'],
		enReversed: ['Evasion', 'Loneliness', 'Entrapment', 'Conceit']
	},
	{
		id: 'star',
		numeral: 'XVII',
		name: '星',
		en: 'The Star',
		upright: ['希望', '治愈', '新生', '信念'],
		reversed: ['绝望', '挫败', '自苛', '妄求'],
		enUpright: ['Hope', 'Healing', 'Rebirth', 'Faith'],
		enReversed: ['Despair', 'Frustration', 'Self-Blame', 'Wishful Thinking']
	},
	{
		id: 'pope',
		numeral: 'V',
		name: '教宗',
		en: 'The Pope',
		upright: ['知识', '信仰', '道德', '导师'],
		reversed: ['无知', '受限', '伪善', '背叛'],
		enUpright: ['Knowledge', 'Faith', 'Morality', 'A Mentor'],
		enReversed: ['Ignorance', 'Constraint', 'Hypocrisy', 'Betrayal']
	},
	{
		id: 'strength',
		numeral: 'XI',
		name: '力量',
		en: 'The Strength',
		upright: ['勇敢', '真诚', '自信', '毅力'],
		reversed: ['怯懦', '恐惧', '自卑', '强硬'],
		enUpright: ['Courage', 'Sincerity', 'Confidence', 'Perseverance'],
		enReversed: ['Cowardice', 'Fear', 'Self-Doubt', 'Rigidity']
	},
	{
		id: 'magician',
		numeral: 'I',
		name: '魔术师',
		en: 'The Magician',
		upright: ['意志', '创造', '智谋', '资源充沛'],
		reversed: ['诡计', '操纵', '游移', '滥用能力'],
		enUpright: ['Willpower', 'Creation', 'Cunning', 'Abundant Resources'],
		enReversed: ['Guile', 'Manipulation', 'Vacillation', 'Misused Power']
	},
	{
		id: 'chariot',
		numeral: 'VII',
		name: '战车',
		en: 'The Chariot',
		upright: ['胜利', '专注', '决心', '控制力'],
		reversed: ['冲动', '失控', '无力', '走错路'],
		enUpright: ['Victory', 'Focus', 'Resolve', 'Control'],
		enReversed: ['Impulsiveness', 'Loss of Control', 'Helplessness', 'A Wrong Turn']
	}
];

/** Which way up a card landed. */
export type TarotOrientation = 'upright' | 'reversed';

/** One card of the reading: which card, and which way up. */
export interface TarotDraw {
	readonly card: TarotCard;
	readonly orientation: TarotOrientation;
}

/**
 * The two positions of 正与反, in the order the spread lists them.
 *
 * Held as ids rather than as the drawn cards so the labels can be looked up in i18n, and
 * so the reading keeps its meaning if the deal order is ever changed.
 */
export const TAROT_POSITIONS: readonly ['gain', 'cost'] = ['gain', 'cost'];

/** One of {@link TAROT_POSITIONS}. */
type TarotPosition = (typeof TAROT_POSITIONS)[number];

/** A full reading: one card per position, in {@link TAROT_POSITIONS} order. */
export type TarotReading = readonly [TarotDraw, TarotDraw];

/** Where the card images are served from. Absolute, like the coin images. */
const IMAGE_BASE = '/tarot/';

/** The URL of a card's image. Every card has one; the test asserts it. */
export function tarotImageUrl(id: string): string {
	return `${IMAGE_BASE}${id}.png`;
}

/** The card's name in the reader's language. */
export function tarotName(card: TarotCard): string {
	return locale.current === 'zh-CN' ? card.name : card.en;
}

/** The card's keywords for the side it landed on, in the reader's language. */
export function tarotKeywords(draw: TarotDraw): TarotKeywords {
	if (locale.current === 'zh-CN') {
		return draw.orientation === 'upright' ? draw.card.upright : draw.card.reversed;
	}
	return draw.orientation === 'upright' ? draw.card.enUpright : draw.card.enReversed;
}

/**
 * The card's keywords as the single line the game's card box prints.
 *
 * The separator follows the language for the same reason the operator lists do: `、` is
 * Chinese punctuation, and in an English sentence it reads as a typo rather than a comma.
 */
export function tarotKeywordLine(draw: TarotDraw): string {
	return tarotKeywords(draw).join(locale.current === 'zh-CN' ? '、' : ', ');
}

/**
 * Today's reading.
 *
 * The two cards come off one deck, drawn without replacement: the second is read from the
 * seven the first did not take. The app's deck is the game's — one card per arcana — and a
 * spread that could show the same arcana twice is not one it deals. The reversed side of an
 * arcana is still that arcana, so the pool loses the *card* and never one of its two
 * orientations.
 *
 * The orientation stays a third, independent draw, so it cannot correlate with which card
 * was taken. Every draw is salted per position as well as per purpose, so adding a position
 * later cannot shift the cards the existing two are dealt.
 */
export function readTarot(seed: Seed): TarotReading {
	const gain = readPosition(seed, 'gain', TAROT);
	// One card fewer for the cost position. The filter compares cards rather than draws,
	// which is exactly what makes a reversed card the same card here.
	const cost = readPosition(
		seed,
		'cost',
		TAROT.filter((card) => card !== gain.card)
	);

	return [gain, cost];
}

/** One position's card and side, read from whichever deck it is handed. */
function readPosition(seed: Seed, position: TarotPosition, deck: readonly TarotCard[]): TarotDraw {
	const card = seed.derive(`tarot-card-${position}`).pick(deck);
	const orientation: TarotOrientation =
		seed.derive(`tarot-side-${position}`).pickIndex(2) === 0 ? 'upright' : 'reversed';

	return { card, orientation };
}
