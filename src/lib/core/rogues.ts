/**
 * Rogue themes and their squad lists.
 *
 * Two ordering rules in here are load-bearing and must not be "tidied":
 *
 * 1. `ROGUE_NAME_LIST` is indexed by rogue id minus {@link ROGUE_ID_MIN}, so its
 *    order *is* the id mapping (傀影与猩红孤钻 = rogue 2 … 沉沦者的黑流树海 = rogue 7).
 * 2. Each squad list is consumed with `hash % list.length`, so both its contents
 *    and its order decide which squad comes out. Re-sorting or de-duplicating any
 *    of these arrays silently changes every generated result.
 *
 * Everything here is data; the picking itself lives in `seed.ts`.
 */

/** Rogue ids start at 2 because the game does not count 刻俄柏的灰蕈迷境 as a theme. */
export const ROGUE_ID_MIN = 2;

/** Order corresponds to `rogue_2` … `rogue_7`. */
export const ROGUE_NAME_LIST = [
	'傀影与猩红孤钻',
	'水月与深蓝之树',
	'探索者的银凇止境',
	'萨卡兹的无终奇语',
	'岁的界园志异',
	'沉沦者的黑流树海'
];

/** Every selectable rogue id, in the order the settings screen lists them. */
export const ROGUE_IDS = ROGUE_NAME_LIST.map((_, index) => index + ROGUE_ID_MIN);

/**
 * The themes the 仙术杯 editions are pinned to, one constant per theme.
 *
 * Named rather than written as a literal at the call site: the ids come from
 * {@link ROGUE_NAME_LIST}'s order, so a literal `5` would silently start pointing at
 * a different theme if that list were ever reordered, while this name would fail a
 * test instead.
 */
export const ROGUE_ID_PHANTOM = 2;
export const ROGUE_ID_MIZUKI = 3;
/** 探索者的银凇止境 — 萨米, the region the theme is set in. */
export const ROGUE_ID_SAMI = 4;
export const ROGUE_ID_SARKAZ = 5;
export const ROGUE_ID_JIEYUAN = 6;
/** 沉沦者的黑流树海 — 仙术杯 #9's theme, the newest one and the only one the global client lacks. */
export const ROGUE_ID_SEABED = 7;

const TEAM_LIST_2 = [
	'指挥分队',
	'集群分队',
	'后勤分队',
	'矛头分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'研究分队',
	'高规格分队'
];

const TEAM_LIST_3 = [
	'心胜于物分队',
	'物尽其用分队',
	'以人为本分队',
	'指挥分队',
	'集群分队',
	'后勤分队',
	'矛头分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'研究分队',
	'高规格分队'
];

const TEAM_LIST_4 = [
	'指挥分队',
	'集群分队',
	'后勤分队',
	'矛头分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'特训分队',
	'高规格分队',
	'永恒狩猎分队',
	'生活至上分队',
	'科学主义分队'
];

const TEAM_LIST_5 = [
	'博闻广记分队',
	'魂灵护送分队',
	'蓝图测绘分队',
	'指挥分队',
	'集群分队',
	'后勤分队',
	'矛头分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'高规格分队',
	'因地制宜分队',
	'异想天开分队',
	'点刺成锭分队',
	'拟态学者分队',
	'专业人士分队'
];

const TEAM_LIST_6 = [
	'指挥分队',
	'特勤分队',
	'后勤分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'高台突破分队',
	'地面突破分队',
	'高规格分队',
	'游客分队',
	'司岁台分队',
	'天师府分队'
];

/**
 * 沉沦者的黑流树海 (live 2026-07-17).
 *
 * Note the deliberate absence of 高规格分队: this theme has 15 squads and that is
 * not one of them. It is exactly the kind of gap that copying a neighbouring theme's
 * list would fill in by accident, so `rogues.test.ts` asserts the contents and the
 * order of every one of these arrays.
 */
const TEAM_LIST_7 = [
	'指挥分队',
	'特勤分队',
	'后勤分队',
	'矛头分队',
	'突击战术分队',
	'堡垒战术分队',
	'远程战术分队',
	'破坏战术分队',
	'高台突破分队',
	'地面突破分队',
	'本源研修分队',
	'文明开化分队',
	'开拓者分队',
	'多边贸易分队',
	'地质调查分队'
];

/**
 * The four squads that exist in every theme and are used by the
 * "job team only" option. Order matters: it is indexed by `hash % 4`.
 */
export const JOB_TEAM_LIST = ['突击战术分队', '堡垒战术分队', '远程战术分队', '破坏战术分队'];

/** Theme name -> that theme's selectable squads. */
export const ROGUE_TEAM_LIST_MAP: Readonly<Record<string, readonly string[]>> = {
	傀影与猩红孤钻: TEAM_LIST_2,
	水月与深蓝之树: TEAM_LIST_3,
	探索者的银凇止境: TEAM_LIST_4,
	萨卡兹的无终奇语: TEAM_LIST_5,
	岁的界园志异: TEAM_LIST_6,
	沉沦者的黑流树海: TEAM_LIST_7
};

/**
 * Resolves a rogue id to its theme name.
 *
 * @throws RangeError on an id outside `rogue_2` … `rogue_7`. Returning `undefined`
 *   instead would let it propagate into string concatenation, which surfaces much
 *   later as an unreadable `undefined` in a result.
 */
export function getRogueName(rogueId: number): string {
	const name = ROGUE_NAME_LIST[rogueId - ROGUE_ID_MIN];
	if (name === undefined) {
		throw new RangeError(`unknown rogue id ${rogueId}; expected ${ROGUE_ID_MIN}..${ROGUE_ID_MIN + ROGUE_NAME_LIST.length - 1}`);
	}
	return name;
}

/** Picks a squad from a theme using the run's seed (`hash % length`). */
export function getRogueTeam(rogueName: string, hash: number): string {
	const teamList = ROGUE_TEAM_LIST_MAP[rogueName];
	if (teamList === undefined) {
		throw new RangeError(`unknown rogue theme: ${JSON.stringify(rogueName)}`);
	}
	return teamList[hash % teamList.length];
}
