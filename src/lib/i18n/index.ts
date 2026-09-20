/**
 * Message catalogue.
 *
 * Chinese is the source language and English is written to sit beside it, key for key.
 * `i18n.test.ts` asserts the two catalogues have **identical key sets**, because a gap
 * would otherwise only show up as a raw key in the middle of a screen — the failure this
 * file used to prevent by having no English at all.
 *
 * ## What is *not* a message
 *
 * Operator, theme, squad and class names. Those are data, they are looked up rather than
 * translated, and they live in `$lib/core/names-en` — see the note there on why the
 * official English name is frequently not a translation of the Chinese one. The render
 * boundary in `$lib/i18n/names.ts` is what substitutes them.
 *
 * ## Shape
 *
 * `{placeholder}` interpolation, plus optional `key.one` / `key.other` variants picked by a
 * numeric `count` parameter. That is the whole engine, and it is deliberately minimal: this
 * module stays the seam a full i18n library would slot into, but only a few messages need a
 * plural form, so nothing here needs more than this.
 *
 * A missing key renders as the key itself: obvious at a glance, whereas a machine
 * translation reads as finished work.
 */

import { locale, type Locale } from './locale.svelte';

export type { Locale } from './locale.svelte';
export { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, isLocale, locale } from './locale.svelte';

/** Values a message may interpolate. `count` additionally selects a plural variant. */
export type MessageParams = Record<string, string | number>;

const ZH_CN: Record<string, string> = {
	/* Navigation ------------------------------------------------------------ */
	'nav.home': '首页',
	'nav.generate': '生成',
	'nav.history': '记录',
	'nav.settings': '设置',
	'nav.toggle': '切换导航',
	'nav.main': '主导航',
	'nav.generators': '生成器',
	'nav.editions': '届次',
	'nav.settingsSections': '设置子页',
	'nav.identity': '个人资料',
	'nav.identityHint': '修改个人资料',

	/* Actions ---------------------------------------------------------------- */
	'action.opening': '抽取开局',
	/*
	 * 4位BP is no longer a button on any screen. The label stays because history stores the
	 * action id rather than its name, so runs drawn before it was removed still read properly;
	 * `RETIRED_ACTION_LABELS` is the only thing that reads this key.
	 */
	'action.bp4': '4位BP',
	'action.bp8': '8位BP',
	'action.bp16': '16位BP',
	'action.draw10': '抽取 10 位',
	'action.laochanPool': '抽取本局可用的 12 位',

	/* Generators ------------------------------------------------------------- */
	'generator.opening.name': '开局生成器',
	'generator.opening.description': '按当前启用主题抽取今日开局',
	'generator.xianshu.name': '仙术杯',
	// #1–#5 and #9 fix a theme and add nothing else, so each needs a name, a one-line
	// summary for the entry list, and the constraint the generate page spells out.
	'generator.xianshu1.name': '仙术杯 #1',
	'generator.xianshu1.description': '限定肉鸽：傀影与猩红孤钻',
	'generator.xianshu1.constraint': '肉鸽固定为傀影与猩红孤钻；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu1_5.name': '仙术杯 #1.5',
	'generator.xianshu1_5.description': '限定肉鸽：傀影与猩红孤钻',
	'generator.xianshu1_5.constraint': '肉鸽固定为傀影与猩红孤钻；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu2.name': '仙术杯 #2',
	'generator.xianshu2.description': '限定肉鸽：水月与深蓝之树',
	'generator.xianshu2.constraint': '肉鸽固定为水月与深蓝之树；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu2_5.name': '仙术杯 #2.5',
	'generator.xianshu2_5.description': '限定肉鸽：水月与深蓝之树',
	'generator.xianshu2_5.constraint': '肉鸽固定为水月与深蓝之树；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu3.name': '仙术杯 #3',
	'generator.xianshu3.description': '限定肉鸽：水月与深蓝之树',
	'generator.xianshu3.constraint': '肉鸽固定为水月与深蓝之树；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu4.name': '仙术杯 #4',
	'generator.xianshu4.description': '限定肉鸽：探索者的银凇止境',
	'generator.xianshu4.constraint': '肉鸽固定为探索者的银凇止境；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu5.name': '仙术杯 #5',
	'generator.xianshu5.description': '限定肉鸽：探索者的银凇止境',
	'generator.xianshu5.constraint': '肉鸽固定为探索者的银凇止境；禁用仍按动作抽取，没有其他限制。',
	'generator.xianshu6.name': '仙术杯 #6',
	'generator.xianshu6.description': '锁定萨卡兹，整局禁用维什戴尔',
	'generator.xianshu6.constraint':
		'肉鸽固定为萨卡兹的无终奇语；禁用列表固定为维什戴尔，不随动作变化。',
	'generator.xianshu7.name': '仙术杯 #7',
	'generator.xianshu7.description': '锁定萨卡兹，整局禁用维什戴尔',
	'generator.xianshu7.constraint':
		'肉鸽固定为萨卡兹的无终奇语；禁用列表固定为维什戴尔，不随动作变化。',
	'generator.xianshu8.name': '仙术杯 #8',
	'generator.xianshu8.description': '锁定界园，禁用按悬赏加权',
	'generator.xianshu8.constraint':
		'肉鸽固定为岁的界园志异；禁用仍按动作抽取，但电弧出现的概率是其他干员的三倍，其余悬赏干员为两倍。',
	'generator.xianshu9.name': '仙术杯 #9',
	'generator.xianshu9.description': '限定肉鸽：沉沦者的黑流树海',
	'generator.xianshu9.constraint': '肉鸽固定为沉沦者的黑流树海；禁用仍按动作抽取，没有其他限制。',
	'generator.laochan.name': '老缠杯',
	// 老缠杯's two shapes: #1 and #3 are ordinary drama draws with a fixed theme, while #2
	// is only the operator draw. The descriptions have to say which, because the action
	// row underneath them is completely different (four BP buttons versus one).
	'generator.laochan1.name': '老缠杯 #1',
	'generator.laochan1.description': '限定肉鸽：探索者的银凇止境',
	'generator.laochan1.constraint':
		'肉鸽固定为探索者的银凇止境；老鲤与琳琅诗怀雅被抽为开局干员的概率是其他干员的 5 倍，其余规则与开局生成器相同。',
	'generator.laochan2.name': '老缠杯 #2',
	'generator.laochan2.description': '限定肉鸽：萨卡兹的无终奇语；整局只能用抽出的 12 位六星',
	'generator.laochan2.constraint':
		'肉鸽固定为萨卡兹的无终奇语；只抽 12 位六星，不抽开局干员、不做 BP；这 12 位从全部六星里抽，与本机 box 无关。',
	'generator.laochan3.name': '老缠杯 #3',
	'generator.laochan3.description': '限定肉鸽：岁的界园志异',
	'generator.laochan3.constraint':
		'肉鸽固定为岁的界园志异；没有额外限制，其余规则与开局生成器相同。',
	'generator.skywalking.name': '通天国际联赛',
	'generator.skywalking1.name': '通天国际联赛 #1',
	'generator.skywalking1.description': '限定肉鸽：水月与深蓝之树',
	'generator.skywalking1.constraint': '肉鸽固定为水月与深蓝之树；禁用仍按动作抽取，没有其他限制。',
	'generator.skywalking2.name': '通天国际联赛 #2',
	'generator.skywalking2.description': '限定肉鸽：探索者的银凇止境；固定禁用 17 位干员',
	'generator.skywalking2.constraint':
		'肉鸽固定为探索者的银凇止境；维什戴尔、逻各斯、魔王、乌尔比安、妮芙、佩佩、娜仁图亚、玛露西尔、维娜·维多利亚、荒芜拉普兰德、忍冬、弑君者、引星棘刺、余、烛煌、隐德来希、死芒固定禁用，其余按动作抽取。',

	/* Result chrome ---------------------------------------------------------- */
	'result.banList': '禁用列表',
	'result.picks': '各职业必选',
	'result.openingSummary': '开局结论',
	'result.copy': '复制',
	'result.copied': '已复制',

	/* Result text: composed from keys rather than inside the generators, so a result can
	   be re-rendered in another language. The generators keep emitting Chinese and
	   localisation happens only at this display boundary. `{count}` selects the
	   `.one` / `.other` variant. */
	'result.summary.opening': '{name}今天的随机肉鸽开局推荐：{rogue} {team} {operator}',
	'result.summary.cup': '{cup}：{name} 今天固定 {rogue}，用 {team} {operator} 开局',
	'result.summary.laochan.one': '{name} 今天固定 {rogue}，这一局只能使用以下 {count} 位六星干员',
	'result.summary.laochan.other': '{name} 今天固定 {rogue}，这一局只能使用以下 {count} 位六星干员',
	'result.removeBans.one': '将以下 {count} 位干员从本局游戏中移除',
	'result.removeBans.other': '将以下 {count} 位干员从本局游戏中移除',
	'result.picksHeading': '各职业六星干员必须优先选择',
	'result.markUsed': '点击标记为已使用',
	'result.notInBox.one': '{count} 位干员不在 box 中：{names}',
	'result.notInBox.other': '{count} 位干员不在 box 中：{names}',
	'result.exhausted': 'box 中已经没有更多六星干员了',
	'result.openingSuffix': '{name}（开局）',
	'result.laochanPool': '本局可用的六星干员',
	'result.export': '导出结果',
	'result.exported': '已复制到剪贴板',
	'result.exportFailed': '复制失败：{reason}',
	'result.exportNothing': '还没有结果可以导出。',

	/* Errors ----------------------------------------------------------------- */
	'error.boxEmpty': 'box 里一位六星干员都没有',
	'error.boxEmptyExceptPreBanned': 'box 里除了预禁用的 {names} 以外没有六星干员',
	'error.noRogueEnabled': '一个肉鸽主题都没启用。请在「设置 → 生成器默认选项」里至少勾选一个。',
	'error.teamEmpty': '{team} 在你 box 内的六星干员为空',

	/* History field labels --------------------------------------------------- */
	'field.rogue': '肉鸽',
	'field.team': '分队',
	'field.opening': '开局',
	'field.fixedBan': '固定禁用',
	'field.bans': '禁用',
	'field.picks': '必选',
	'field.laochanPool': '本局可用',

	'history.filter': '按生成器筛选',
	'history.filterAll': '全部',
	'history.count': '{shown} / {total} 条',
	'history.empty': '还没有生成记录。',
	'history.noMatch': '没有符合筛选条件的记录。',
	'history.noIdentity': '（无 ID）',
	'history.seed': '种子',
	'history.excludesOpening': '只留最近 50 次；「抽取开局」不入库，BP 档位都会记录。',

	/* Splash ----------------------------------------------------------------- */
	'splash.loadingOperators': '正在加载干员数据…',
	'splash.loadingSettings': '正在读取设置…',
	'splash.ready': '就绪',
	'splash.slogan': '同一天，同一个 ID，同一个开局',

	/* Settings --------------------------------------------------------------- */
	'settings.identity.title': '个人资料',
	'settings.identity.summary': 'ID 与头像。ID 是种子的唯一来源，改它就换一套结果',
	'settings.identity.help': 'ID 是种子的唯一来源。同一天、同一个 ID 的结果永远相同；留空则按「博士」计算。',
	'settings.identity.avatarTitle': '头像',
	'settings.identity.avatarHelp': '从六星干员头像里挑一个，只影响界面显示，不参与抽取。',
	'settings.identity.avatarSearch': '搜索干员',
	'settings.identity.avatarClear': '不使用头像',
	'settings.identity.avatarNone': '未选择',
	'settings.identity.avatarNoMatch': '没有匹配的干员。',
	'settings.box.title': 'box',
	'settings.box.summary': '哪些六星干员算在你的 box 里',
	'settings.box.inBox': '在 box',
	/*
	 * The three numbers on the summary line, in the order they are printed. They are bare
	 * on screen — `box 118 / 94 / 137` — so this string is the only place that says which
	 * is which, and it is what the row's tooltip shows.
	 */
	'settings.box.countsHelp': '已拥有 / 本局可用 / 六星总数',
	/*
	 * The box has three states, not two. `已拥有不可使用` is what an MAA import produces
	 * for an operator the user owns but has not promoted to elite 2: it is excluded from
	 * the draw for the same reason as a missing operator, but the reason differs, so the
	 * screen has to say which is which. Painted green in every theme because it is not a
	 * warning — the user does have the operator.
	 */
	'settings.box.unusable': '已拥有不可使用',
	'settings.box.notInBox': '不在 box 里',
	'settings.box.help':
		'左键点一下设为「在 box」，已经是「在 box」的再点一下就移出；Ctrl + 左键设为「已拥有不可使用」，已经是「已拥有不可使用」的再点一下就变成不在 box。手机上没有 Ctrl，长按等于 Ctrl + 左键。存的是排除项，所以以后新增的干员默认在 box 里；后两种状态都不参与抽取。',
	'settings.box.searchPlaceholder': '搜索干员',
	'settings.box.allInBox': '全部在 box',
	'settings.box.allOutOfBox': '全部移出',
	'settings.box.backToJobs': '职业',
	'settings.box.byJob': '按职业进入',
	'settings.box.noMatch': '没有匹配的干员。',
	'settings.box.importMaa': '从 MAA 导入',
	'settings.box.importMaaPlaceholder': '把 MAA 导出的干员文本粘贴到这里',
	'settings.box.importMaaHelp':
		'MAA 的导出是一段文本而不是文件，直接粘贴到上面即可：精英二满级的六星记为「在 box」，已拥有但未精英二的记为「已拥有不可使用」，其余略过。',
	'settings.box.importMaaOk':
		'导入完成：{usable} 位可用，{unusable} 位已拥有不可使用，{skipped} 位未拥有。',
	'settings.box.importMaaEmpty': '这段文本里没有找到六星干员。',
	'settings.box.importMaaBusy': '正在导入…',
	'settings.box.importMaaError.notJson': '这不是有效的 JSON 文本。',
	'settings.box.importMaaError.notArray': '文本里没有找到干员数组。',
	'settings.appearance.title': '外观',
	'settings.appearance.summary': '主题配色、动效与启动画面',
	'settings.language.title': '语言',
	'settings.language.summary': '界面语言，与外观配色互不影响',
	'settings.generators.title': '生成器默认选项',
	'settings.generators.summary': '肉鸽主题、分队与助战等各生成器共用选项',
	'settings.generators.common': '通用选项',
	'settings.generators.commonHelp':
		'这些选项对每个生成器都生效。被生成器强制覆盖时会失效，生成页会说明原因。',
	'settings.generators.jobTeamOnly': '仅职业分队开局',
	'settings.generators.jobTeamOnlyHelp': '开局分队只从四个职业分队里抽，不抽主题自带的分队。',
	'settings.generators.supportUnits': '允许助战开局',
	'settings.generators.supportUnitsHelp': '开启后开局干员可以从 box 之外抽取。',
	'settings.generators.noOwnOptions': '当前所有生成器都只使用通用选项，没有各自的默认选项。',
	'settings.data.title': '数据',
	'settings.data.summary': '存储位置、立即保存与重置',
	'settings.about.title': '关于',
	'settings.about.summary': '版本、功能与开发者',
	'settings.back': '设置',

	'generate.choose': '选择生成器',
	'generate.lastUsed': '上次使用',

	/* Appearance ------------------------------------------------------------- */
	'appearance.motion': '动效',
	/*
	 * Avatar mode is a display preference, not a data one: it changes how a list of
	 * operators reads, never what is drawn. The opening recommendation is exempt on
	 * purpose — it is the one line a user copies elsewhere and retypes, so it stays
	 * as names whatever this is set to.
	 */
	'appearance.avatarMode': '头像模式',
	'appearance.avatarModeHelp': '用干员头像代替名字显示。开局推荐仍然用名字，方便复制。',
	/* The language screen has its own keys rather than borrowing `appearance.*`: it is a
	   section of its own now, and a key named after the screen it used to live on would
	   be the kind of leftover that outlives its reason.

	   No `language.zh` / `language.en`: `LOCALE_LABELS` in `i18n/locale.svelte.ts` already
	   names each language in itself, and a translated language name is the one label a
	   picker must not have. */
	'language.display': '显示语言',
	'language.help': '界面与生成结果都会跟着切换，干员名与主题名使用官方英译。',
	'appearance.scheme.rhodes': '罗德岛',
	'appearance.scheme.rhodes.detail': '浅色 / 蓝',
	'appearance.scheme.endfield': '终末地',
	'appearance.scheme.endfield.detail': '暗色 / 黄',
	'appearance.scheme.p5': 'P5R',
	'appearance.scheme.p5.detail': '暗色 / 红',
	'appearance.scheme.p3r': 'P3R',
	'appearance.scheme.p3r.detail': '暗色 / 蓝',
	'appearance.scheme.jieyuan': '界园',
	'appearance.scheme.jieyuan.detail': '浅色 / 粉绿',
	'appearance.scheme.sami': '萨米',
	'appearance.scheme.sami.detail': '暗色 / 青',
	'appearance.theme': '主题',
	'appearance.themeHelp': '每个主题给出实际配色预览，点一下即可切换。',
	'appearance.motionHelp': '控制界面里的过渡与动画。',
	'appearance.splashTitle': '启动画面',
	'appearance.splashHelp': '留空则使用当前主题的背景色。图片会先压到 1920 像素以内再保存。',
	'appearance.splashDefault': '当前主题背景色',
	'appearance.splashChoose': '选择图片',
	'appearance.splashReplace': '更换图片',
	'appearance.splashRemove': '移除',
	'appearance.splashBusy': '正在处理…',
	'appearance.splashPreviewAlt': '启动画面预览',
	'appearance.splashError.notAnImage': '这不是图片文件。',
	'appearance.splashError.tooLarge': '图片超过 12 MB，请先压缩再选。',
	'appearance.splashError.tooLargeAfterResize': '压缩后仍然太大，换一张颜色更简单的图片试试。',
	'appearance.splashError.decodeFailed': '无法读取这张图片，可能已损坏或格式不受支持。',

	/* App shell, about and data ---------------------------------------------- */
	'app.title': '方舟随机肉鸽生成器',
	'app.starting': '正在启动…',
	'home.greeting.dawn': '凌晨好',
	'home.greeting.morning': '早上好',
	'home.greeting.noon': '中午好',
	'home.greeting.afternoon': '下午好',
	'home.greeting.evening': '晚上好',
	'home.greeting.withName': '{greeting}，Dr.{name}！',
	'home.greeting.anonymous': '{greeting}！',
	'home.subtitle': '今天也来抽一局吧。',
	/*
	 * 今日运势: the home screen's daily reading, which is one of two practices — 投钱问路,
	 * the three-coin toss from 岁的界园志异, or 抽塔罗牌, the two-card reading from
	 * 月行水上. The coin names and verses, and the tarot keywords, are game text and come
	 * from the data files, not from here; these are the labels around them.
	 *
	 * `fate`/`flower`/`risk` are the game's own three announcements for a finished toss, and
	 * they are the game's exact wording — 听凭天命 is *not* the common 听天由命 idiom, and
	 * the two type ones are the short forms the game prints, not sentences about what the
	 * coins bring.
	 */
	'home.fortune.title': '今日运势',
	'home.fortune.subtitle': '投钱问路 · 抽塔罗牌',
	'home.fortune.hint': '选一种问法。同一天、同一个 ID，得到的永远一样。',
	'home.fortune.toss': '投钱问路',
	'home.fortune.tossing': '投钱中…',
	'home.fortune.tarot': '抽塔罗牌',
	'home.fortune.tarotting': '洗牌中…',
	'home.fortune.drawn': '已抽',
	'home.fortune.back': '返回',
	'home.fortune.verdict.fate': '听凭天命',
	'home.fortune.verdict.flower': '花钱如愿',
	'home.fortune.verdict.risk': '厉钱行险',
	'home.fortune.type.balance': '衡钱',
	'home.fortune.type.flower': '花钱',
	'home.fortune.type.risk': '厉钱',
	'home.fortune.tarot.position.gain': '所得',
	'home.fortune.tarot.position.cost': '所失',
	'home.fortune.tarot.orientation.upright': '正位',
	'home.fortune.tarot.orientation.reversed': '逆位',
	'home.fortune.tarot.spread': '日常占卜',
	'home.fortune.tarot.kind': '正与反',
	'home.fortune.note': '和抽取一样，这三枚由 ID 和日期决定：同一天、同一个 ID 投出的永远是这三枚。仅供娱乐。',
	'home.fortune.tarotNote':
		'两张牌由 ID 和日期决定：同一天、同一个 ID 抽到的永远是这两张。仅供娱乐。',
	'about.version': '版本',
	'about.features': '功能',
	'about.featureOpening': '按启用的肉鸽主题抽取今日开局',
	'about.featureCups': '收录仙术杯 #1 至 #9、通天国际联赛 #1 与 #2、老缠杯 #1 至 #3',
	'about.featureBilingual': '中文 / English 双语界面',
	'about.featureFortune':
		'首页今日运势：投钱问路（岁的界园志异可投的 101 枚通宝，每天三枚）或抽塔罗牌（月行水上，每天两张）',
	'about.developer': '开发者',
	'identity.placeholder': '填写你的游戏 ID',
	'generate.failed': '生成失败：{reason}',
	'generate.unknownReason': '未知原因',
	'generate.hint': '选一个动作开始生成。同一天、同一个 ID、同一套设置，结果永远相同。',
	'data.storageHelp': '设置由 Rust 原子写入以下文件（临时文件 + rename，损坏时隔离为 .bak）：',
	'data.reading': '读取中…',
	'data.browserFallback':
		'当前不在 Tauri 中运行，设置只写在浏览器的 localStorage 里，仅用于开发预览。',
	'data.saveNow': '立即保存',
	'data.resetHelp': '重置会清空 box 勾选、通用选项与各生成器选项，保留 ID 和生成记录。',

	/* Common ----------------------------------------------------------------- */
	'common.clear': '清空',
	'common.close': '关闭',
	'common.reset': '重置为默认',
	'common.selectAll': '全选',
	'common.selectNone': '全不选',
	'common.saving': '保存中…',
	'common.saveFailed': '保存失败',
	'common.emptyIdentity': '未填写',
	'common.loadingSettings': '正在读取设置…',
	'common.motionSystem': '跟随系统',
	'common.motionAlways': '始终减少',
	'common.motionNever': '不减少'
};

/**
 * The English catalogue.
 *
 * Written rather than translated. The conventions below were settled deliberately (they are
 * recorded as D1–D8 in `英文翻译待定表.xlsx`):
 *
 *   - the tournaments are `Theurgy Cup` and `Laochan Cup`; the latter is edition **#2**;
 *   - class names use the game's own term, **Class**, not the code's `job`;
 *   - `box` stays `box` — it is the community's word and the Chinese interface already
 *     says "box", so `roster` would only put the two languages out of step;
 *   - `BP` stays on the buttons (`4 BP`) because they must be short, and is spelled out as
 *     "ban/pick" wherever there is room;
 *   - editions keep the `#6` form, which invents nothing the Chinese does not say.
 */
const EN: Record<string, string> = {
	/* Navigation ------------------------------------------------------------ */
	'nav.home': 'Home',
	'nav.generate': 'Generate',
	'nav.history': 'History',
	'nav.settings': 'Settings',
	'nav.toggle': 'Toggle navigation',
	'nav.main': 'Main navigation',
	'nav.generators': 'Generators',
	'nav.editions': 'Editions',
	'nav.settingsSections': 'Settings sections',
	'nav.identity': 'ID',
	'nav.identityHint': 'Change ID',

	/* Actions ---------------------------------------------------------------- */
	'action.opening': 'Draw opening',
	// 4位BP is gone from the buttons; kept for the history. See the Chinese catalogue.
	'action.bp4': '4 BP',
	'action.bp8': '8 BP',
	'action.bp16': '16 BP',
	'action.draw10': 'Draw 10',
	'action.laochanPool': "Draw this run's 12",

	/* Generators ------------------------------------------------------------- */
	'generator.opening.name': 'Opening generator',
	'generator.opening.description': "Draws today's opening from the enabled themes",
	'generator.xianshu.name': 'Theurgy Cup',
	'generator.xianshu1.name': 'Theurgy Cup #1',
	'generator.xianshu1.description': 'Theme locked to Phantom & Crimson Solitaire',
	'generator.xianshu1.constraint':
		'Theme fixed to Phantom & Crimson Solitaire. Bans are still drawn per action; there are no other restrictions.',
	'generator.xianshu1_5.name': 'Theurgy Cup #1.5',
	'generator.xianshu1_5.description': 'Theme locked to Phantom & Crimson Solitaire',
	'generator.xianshu1_5.constraint':
		'Theme fixed to Phantom & Crimson Solitaire. Bans are still drawn per action; there are no other restrictions.',
	'generator.xianshu2.name': 'Theurgy Cup #2',
	'generator.xianshu2.description': 'Theme locked to Mizuki & Caerula Arbor',
	'generator.xianshu2.constraint':
		'Theme fixed to Mizuki & Caerula Arbor. Bans are still drawn per action; there are no other restrictions.',
	'generator.xianshu2_5.name': 'Theurgy Cup #2.5',
	'generator.xianshu2_5.description': 'Theme locked to Mizuki & Caerula Arbor',
	'generator.xianshu2_5.constraint':
		'Theme fixed to Mizuki & Caerula Arbor. Bans are still drawn per action; there are no other restrictions.',
	'generator.xianshu3.name': 'Theurgy Cup #3',
	'generator.xianshu3.description': 'Theme locked to Mizuki & Caerula Arbor',
	'generator.xianshu3.constraint':
		'Theme fixed to Mizuki & Caerula Arbor. Bans are still drawn per action; there are no other restrictions.',
	'generator.xianshu4.name': 'Theurgy Cup #4',
	'generator.xianshu4.description': "Theme locked to Expeditioner's Jǫklumarkar",
	'generator.xianshu4.constraint':
		"Theme fixed to Expeditioner's Jǫklumarkar. Bans are still drawn per action; there are no other restrictions.",
	'generator.xianshu5.name': 'Theurgy Cup #5',
	'generator.xianshu5.description': "Theme locked to Expeditioner's Jǫklumarkar",
	'generator.xianshu5.constraint':
		"Theme fixed to Expeditioner's Jǫklumarkar. Bans are still drawn per action; there are no other restrictions.",
	'generator.xianshu6.name': 'Theurgy Cup #6',
	'generator.xianshu6.description': "Locked to Sarkaz, Wiš'adel banned all run",
	'generator.xianshu6.constraint':
		"Theme locked to Sarkaz's Furnaceside Fables; the ban list is fixed to Wiš'adel and does not change with the action.",
	'generator.xianshu7.name': 'Theurgy Cup #7',
	'generator.xianshu7.description': "Locked to Sarkaz, Wiš'adel banned all run",
	'generator.xianshu7.constraint':
		"Theme locked to Sarkaz's Furnaceside Fables; the ban list is fixed to Wiš'adel and does not change with the action.",
	'generator.xianshu8.name': 'Theurgy Cup #8',
	'generator.xianshu8.description': 'Locked to the Garden, bans weighted by bounty',
	'generator.xianshu8.constraint':
		"Theme locked to Sui's Garden of Grotesqueries; bans are still drawn per action, but Raidian is three times as likely as other operators and the other bounty operators twice as likely.",
	'generator.xianshu9.name': 'Theurgy Cup #9',
	'generator.xianshu9.description': 'Theme locked to The Black Flow of the Drowning Seekers',
	'generator.xianshu9.constraint':
		'Theme fixed to The Black Flow of the Drowning Seekers. Bans are still drawn per action; there are no other restrictions.',
	'generator.laochan.name': 'LAO CHAN BEI',
	'generator.laochan1.name': 'LAO CHAN BEI #1',
	'generator.laochan1.description': "Locked to Expeditioner's Jǫklumarkar",
	'generator.laochan1.constraint':
		"Theme fixed to Expeditioner's Jǫklumarkar. Lee and Swire the Elegant Wit are five times as likely to be drawn as the opening operator; everything else follows the opening generator.",
	'generator.laochan2.name': 'LAO CHAN BEI #2',
	'generator.laochan2.description':
		"Locked to Sarkaz's Furnaceside Fables; twelve six-stars for the whole run",
	'generator.laochan2.constraint':
		"Theme fixed to Sarkaz's Furnaceside Fables. Only twelve six-stars are drawn — no opening operator and no BP — and they come from the whole six-star list rather than from this machine's box.",
	'generator.laochan3.name': 'LAO CHAN BEI #3',
	'generator.laochan3.description': "Locked to Sui's Garden of Grotesqueries",
	'generator.laochan3.constraint':
		"Theme fixed to Sui's Garden of Grotesqueries. There are no additional restrictions; everything else follows the opening generator.",
	'generator.skywalking.name': 'Skywalking Global League',
	'generator.skywalking1.name': 'Skywalking Global League #1',
	'generator.skywalking1.description': 'Theme locked to Mizuki & Caerula Arbor',
	'generator.skywalking1.constraint':
		'Theme fixed to Mizuki & Caerula Arbor. Bans are still drawn per action; there are no other restrictions.',
	'generator.skywalking2.name': 'Skywalking Global League #2',
	'generator.skywalking2.description':
		"Locked to Expeditioner's Jǫklumarkar; 17 operators banned all run",
	// The seventeen are listed out because this ban list is the restriction, and a reader
	// deciding whether their favourite is playable should not have to start a run to find
	// out. Names are the official English ones, matching `names-en.json`.
	'generator.skywalking2.constraint':
		"Theme fixed to Expeditioner's Jǫklumarkar. Wiš'adel, Logos, Civilight Eterna, Ulpianus, Nymph, Pepe, Narantuya, Marcille, Vina Victoria, Lappland the Decadenza, Vulpisfoglia, Crownslayer, Thorns the Lodestar, Yu, Blaze the Igniting Spark, Entelechia and Necrass are banned for the whole run; everyone else is drawn per action.",

	/* Result chrome ---------------------------------------------------------- */
	'result.banList': 'Ban list',
	'result.picks': 'Mandatory picks by class',
	'result.openingSummary': 'Opening verdict',
	'result.copy': 'Copy',
	'result.copied': 'Copied',

	/* Result text ------------------------------------------------------------ */
	'result.summary.opening':
		"{name}'s random rogue opening for today: {rogue}, {team}, {operator}",
	'result.summary.cup': '{cup}: {name} is locked to {rogue} today, opening with {team} and {operator}',
	'result.summary.laochan.one':
		'{name} is locked to {rogue} today and may use only the one six-star below this run',
	'result.summary.laochan.other':
		'{name} is locked to {rogue} today and may use only the {count} six-stars below this run',
	'result.removeBans.one': 'Remove the one operator below from this run',
	'result.removeBans.other': 'Remove the {count} operators below from this run',
	'result.picksHeading': 'Every class’s six-stars must be picked first',
	'result.markUsed': 'Click to mark as used',
	'result.notInBox.one': 'One operator is not in your box: {names}',
	'result.notInBox.other': '{count} operators are not in your box: {names}',
	'result.exhausted': 'No more six-stars left in your box',
	'result.openingSuffix': '{name} (opening)',
	'result.laochanPool': 'Six-stars available this run',
	// Not announced; see the note on the Chinese catalogue.
	'result.export': 'Export result',
	'result.exported': 'Copied to the clipboard',
	'result.exportFailed': 'Could not copy: {reason}',
	'result.exportNothing': 'There is no result to export yet.',

	/* Errors ----------------------------------------------------------------- */
	'error.boxEmpty': 'There is not a single six-star in your box',
	'error.boxEmptyExceptPreBanned':
		'Your box has no six-stars besides the pre-banned {names}',
	'error.noRogueEnabled':
		'No theme is enabled. Tick at least one under Settings → Generator defaults.',
	'error.teamEmpty': '{team} has no six-stars in your box',

	/* History field labels --------------------------------------------------- */
	'field.rogue': 'Theme',
	'field.team': 'Squad',
	'field.opening': 'Opening',
	'field.fixedBan': 'Fixed ban',
	'field.bans': 'Bans',
	'field.picks': 'Picks',
	'field.laochanPool': 'Available this run',

	'history.filter': 'Filter by generator',
	'history.filterAll': 'All',
	'history.count': '{shown} / {total} runs',
	'history.empty': 'No runs recorded yet.',
	'history.noMatch': 'No runs match this filter.',
	'history.noIdentity': '(no ID)',
	'history.seed': 'Seed',
	'history.excludesOpening':
		'Only the last 50 are kept. Drawing an opening is not archived; every BP size is.',

	/* Splash ----------------------------------------------------------------- */
	'splash.loadingOperators': 'Loading operator data…',
	'splash.loadingSettings': 'Reading settings…',
	'splash.ready': 'Ready',
	'splash.slogan': 'Same day, same ID, same opening',

	/* Settings --------------------------------------------------------------- */
	'settings.identity.title': 'Profile',
	'settings.identity.summary': 'ID and portrait. The ID is the seed’s only source — change it and every result changes',
	'settings.identity.help':
		'The ID is the seed’s only source. The same ID on the same day always gives the same result; left blank it counts as the default ID.',
	'settings.identity.avatarTitle': 'Portrait',
	'settings.identity.avatarHelp':
		'Pick one from the six-star portraits. It is decoration only — it never takes part in the draw.',
	'settings.identity.avatarSearch': 'Search operators',
	'settings.identity.avatarClear': 'No portrait',
	'settings.identity.avatarNone': 'Not chosen',
	'settings.identity.avatarNoMatch': 'No matching operators.',
	'settings.box.title': 'box',
	'settings.box.summary': 'Which six-stars count as being in your box',
	'settings.box.inBox': 'In box',
	// The three numbers on the summary line; see the note on the Chinese catalogue.
	'settings.box.countsHelp': 'Owned / usable this run / all six-stars',
	// The third state; see the note on the Chinese catalogue.
	'settings.box.unusable': 'Owned, unusable',
	'settings.box.notInBox': 'Not in box',
	'settings.box.help':
		'Left-click sets “in box”, and clicking one that already is takes it back out; Ctrl + left-click sets “owned, unusable”, and clicking one that already is makes it not-in-box. On a touch screen, long-press is the Ctrl gesture. What is stored is the exclusions, so an operator added later is in the box by default; both excluded states are kept out of the draw.',
	'settings.box.searchPlaceholder': 'Search operators',
	'settings.box.allInBox': 'All in box',
	'settings.box.allOutOfBox': 'Remove all',
	'settings.box.backToJobs': 'Classes',
	'settings.box.byJob': 'Browse by class',
	'settings.box.noMatch': 'No matching operators.',
	'settings.box.importMaa': 'Import from MAA',
	'settings.box.importMaaPlaceholder': "Paste MAA's exported operator text here",
	'settings.box.importMaaHelp':
		"MAA's export is a block of text rather than a file, so paste it above: six-stars at elite 2 count as in your box, ones you own below elite 2 as “owned, unusable”, and the rest are skipped.",
	'settings.box.importMaaOk':
		'Imported: {usable} usable, {unusable} owned but unusable, {skipped} not owned.',
	'settings.box.importMaaEmpty': 'No six-star operators were found in that text.',
	'settings.box.importMaaBusy': 'Importing…',
	'settings.box.importMaaError.notJson': 'That is not valid JSON text.',
	'settings.box.importMaaError.notArray': 'No operator list was found in that text.',
	'settings.appearance.title': 'Appearance',
	'settings.appearance.summary': 'Theme, motion and splash screen',
	'settings.language.title': 'Language',
	'settings.language.summary': 'Interface language, independent of the colour scheme',
	'settings.generators.title': 'Generator defaults',
	'settings.generators.summary': 'Options shared by every generator: theme, squad and support units',
	'settings.generators.common': 'Common options',
	'settings.generators.commonHelp':
		'These apply to every generator. A generator that forces a value overrides them, and the generate page says why.',
	'settings.generators.jobTeamOnly': 'Job squads only',
	'settings.generators.jobTeamOnlyHelp':
		'Draw the opening squad from the four job squads only, never from the theme’s own list.',
	'settings.generators.supportUnits': 'Allow support units',
	'settings.generators.supportUnitsHelp':
		'When on, the opening operator may be drawn from outside your box.',
	'settings.generators.noOwnOptions':
		'Every generator uses only the common options; none has defaults of its own.',
	'settings.data.title': 'Data',
	'settings.data.summary': 'Storage location, save now and reset',
	'settings.about.title': 'About',
	'settings.about.summary': 'Version, features and developer',
	'settings.back': 'Settings',

	'generate.choose': 'Choose a generator',
	'generate.lastUsed': 'Last used',

	/* Appearance ------------------------------------------------------------- */
	'appearance.motion': 'Motion',
	'appearance.avatarMode': 'Portrait mode',
	'appearance.avatarModeHelp':
		'Show operator portraits instead of names. The opening recommendation stays as names so it is easy to copy.',
	'language.display': 'Display language',
	'language.help':
		'The interface and the generated results both follow this. Operator and theme names use their official English.',
	// No `language.zh` / `language.en`; see the note on the Chinese catalogue.
	'appearance.scheme.rhodes': 'Rhodes Island',
	'appearance.scheme.rhodes.detail': 'Light / blue',
	'appearance.scheme.endfield': 'Endfield',
	'appearance.scheme.endfield.detail': 'Dark / yellow',
	'appearance.scheme.p5': 'P5R',
	'appearance.scheme.p5.detail': 'Dark / red',
	'appearance.scheme.p3r': 'P3R',
	'appearance.scheme.p3r.detail': 'Dark / blue',
	'appearance.scheme.jieyuan': 'Jieyuan',
	'appearance.scheme.jieyuan.detail': 'Light / pink and green',
	'appearance.scheme.sami': 'Sami',
	'appearance.scheme.sami.detail': 'Dark / cyan',
	'appearance.theme': 'Theme',
	'appearance.themeHelp': 'Each theme previews its real colours; click one to switch.',
	'appearance.motionHelp': 'Controls transitions and animation across the interface.',
	'appearance.splashTitle': 'Splash screen',
	'appearance.splashHelp':
		'Empty uses the current theme’s background colour. Images are scaled to 1920px before saving.',
	'appearance.splashDefault': 'Current theme background',
	'appearance.splashChoose': 'Choose image',
	'appearance.splashReplace': 'Replace image',
	'appearance.splashRemove': 'Remove',
	'appearance.splashBusy': 'Processing…',
	'appearance.splashPreviewAlt': 'Splash preview',
	'appearance.splashError.notAnImage': 'That is not an image file.',
	'appearance.splashError.tooLarge': 'The image is over 12 MB — compress it before choosing.',
	'appearance.splashError.tooLargeAfterResize':
		'Still too large after scaling — try an image with simpler colours.',
	'appearance.splashError.decodeFailed':
		'Could not read that image — it may be corrupt or in an unsupported format.',

	/* App shell, about and data ---------------------------------------------- */
	'app.title': 'Arknights Rogue Generator',
	'app.starting': 'Starting…',
	/*
	 * Five buckets here too. English has no greeting of its own for the small hours or for
	 * midday, so rather than invent one the late one borrows the phrase people actually say
	 * at 3am, and midday takes the one English does have for it.
	 */
	'home.greeting.dawn': 'Still up',
	'home.greeting.morning': 'Good morning',
	'home.greeting.noon': 'Good midday',
	'home.greeting.afternoon': 'Good afternoon',
	'home.greeting.evening': 'Good evening',
	'home.greeting.withName': '{greeting}, Dr. {name}!',
	'home.greeting.anonymous': '{greeting}!',
	'home.subtitle': "Let's draw a run for today.",
	/*
	 * 今日运势; see the note on the Chinese catalogue.
	 *
	 * The three verdicts are the game's own English messages, quoted verbatim on the wiki's
	 * list page along with the colour each is printed in — which is why they read
	 * differently from the Chinese: the localisation is a paraphrase, and 花钱如愿 became a
	 * sentence about what the coin brings.
	 *
	 * The tarot labels have no official English to quote: the wiki page that carries the
	 * cards and their keywords is Chinese-only, so 正位/逆位 are the standard tarot terms
	 * rather than a translation of a localisation. The event's English name, *Sur le lac
	 * lune vivante*, comes from the Terra Wiki — which is the game's own title for it, but
	 * flagged there as provisional, because the crossover has not reached the Global server
	 * and the localisation may yet rename it.
	 */
	'home.fortune.title': "Today's Fortune",
	'home.fortune.subtitle': 'Tongbao Toss · Tarot',
	'home.fortune.hint': 'Pick one reading. One ID on one day always gives the same answer.',
	'home.fortune.toss': 'Tongbao Toss',
	'home.fortune.tossing': 'Tossing…',
	'home.fortune.tarot': 'Draw Tarot',
	'home.fortune.tarotting': 'Shuffling…',
	'home.fortune.drawn': 'Drawn',
	'home.fortune.back': 'Back',
	'home.fortune.verdict.fate': 'Let Fate Decide',
	'home.fortune.verdict.flower': 'Flower Coin Brings Prosperity',
	'home.fortune.verdict.risk': 'Risk Coin Brings Peril',
	'home.fortune.type.balance': 'Balance Coin',
	'home.fortune.type.flower': 'Flower Coin',
	'home.fortune.type.risk': 'Risk Coin',
	'home.fortune.tarot.position.gain': 'Gain',
	'home.fortune.tarot.position.cost': 'Cost',
	'home.fortune.tarot.orientation.upright': 'Upright',
	'home.fortune.tarot.orientation.reversed': 'Reversed',
	'home.fortune.tarot.spread': 'Daily Reading',
	'home.fortune.tarot.kind': 'Gain & Cost',
	'home.fortune.note':
		'Like everything else here, the three are decided by your ID and the date: one ID on one day always tosses these three. For entertainment only.',
	'home.fortune.tarotNote':
		'The two cards are decided by your ID and the date: one ID on one day always draws these two. For entertainment only.',
	'about.version': 'Version',
	'about.features': 'Features',
	'about.featureOpening': "Draws today's opening from the themes you enable",
	'about.featureCups':
		'Covers Theurgy Cup #1 through #9, Skywalking Global League #1 and #2, and LAO CHAN BEI #1 through #3',
	'about.featureBilingual': 'Chinese and English interface',
	'about.featureFortune':
		"Today's Fortune on the home page: a Tongbao Toss (the 101 tossable coins of Sui's Garden of Grotesqueries, three a day) or a Tarot reading (Sur le lac lune vivante, two cards a day)",
	'about.developer': 'Developer',
	'identity.placeholder': 'Enter your in-game ID',
	'generate.failed': 'Generation failed: {reason}',
	'generate.unknownReason': 'unknown reason',
	'generate.hint':
		'Pick an action to start. The same ID and the same settings on the same day always give the same result.',
	'data.storageHelp':
		'Rust writes the settings atomically to the file below (temp file + rename; a corrupt file is quarantined as .bak):',
	'data.reading': 'Reading…',
	'data.browserFallback':
		'Not running inside Tauri, so settings are written to the browser’s localStorage. Development preview only.',
	'data.saveNow': 'Save now',
	'data.resetHelp':
		'Resetting clears the box ticks, the common options and every generator’s options. The ID and the run history are kept.',

	/* Common ----------------------------------------------------------------- */
	'common.clear': 'Clear',
	'common.close': 'Close',
	'common.reset': 'Reset to defaults',
	'common.selectAll': 'Select all',
	'common.selectNone': 'Select none',
	'common.saving': 'Saving…',
	'common.saveFailed': 'Save failed',
	'common.emptyIdentity': 'Not set',
	'common.loadingSettings': 'Reading settings…',
	'common.motionSystem': 'Follow system',
	'common.motionAlways': 'Always reduce',
	'common.motionNever': 'Never reduce'
};

export const CATALOGUES: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
	'zh-CN': ZH_CN,
	en: EN
};

/** Replaces `{name}` with its parameter. Unknown placeholders are left alone. */
function interpolate(template: string, params: MessageParams | undefined): string {
	if (params === undefined) return template;

	return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
		key in params ? String(params[key]) : whole
	);
}

/**
 * Looks up a message in the active locale.
 *
 * Pass `count` to select the `.one` / `.other` variant; without one the base key is used,
 * so a message that needs no plural is written once.
 */
export function t(key: string, params?: MessageParams): string {
	const catalogue = CATALOGUES[locale.current];

	let resolved = key;
	if (typeof params?.count === 'number') {
		const variant = params.count === 1 ? `${key}.one` : `${key}.other`;
		if (catalogue[variant] !== undefined) resolved = variant;
	}

	// Falling back to the key, not to Chinese: a key on screen is obviously unfinished,
	// whereas Chinese in an English interface reads as if the text were meant to be there.
	const template = catalogue[resolved] ?? catalogue[key] ?? key;
	return interpolate(template, params);
}

/** Looks a message up in a specific locale, for tests and for the key-parity check. */
export function messageFor(localeId: Locale, key: string): string | undefined {
	return CATALOGUES[localeId][key];
}