#!/usr/bin/env python3
"""Builds the English-translation worksheet (`英文翻译待定表.xlsx`).

Why this exists: the plan (appendix F) puts `en` alongside `zh-CN`, and the strings that
block it are not the interface chrome — those are mechanical — but the proper nouns.
Arknights has an official English client, so operator names, class names and squads all
*do* have an official English form, and guessing them from the Chinese would produce
something that looks finished and is wrong.

The first version of this table asked the reader to supply all of those names. It no longer
does: they were looked up instead, by joining our dictionary against the official English
tables **by the game's own ids** (`char_112_siege`, `rogue_5_band_17`), which is exact and
does not depend on reading Chinese correctly. The result lives in
`src/lib/core/names-en.json` and is pre-filled here, with a column saying where each name
came from. What is left for the reader is the part that is genuinely a person's call:
the community tournament names, the register questions (BP, box, Class vs Job), and the
handful of names that do not exist in English yet because the global client trails the
Chinese one.

Only 干员名, 肉鸽主题 and 分队 are read from the source; the interface rows are listed by
hand, because "which strings are genuinely ambiguous" is a judgement, not a query.

Usage (from kaiju-tauri/):
    python scripts/make-i18n-worksheet.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PROJECT_ROOT.parent
TARGET = REPO_ROOT / '英文翻译待定表.xlsx'

# ---------------------------------------------------------------------------
# Styling
# ---------------------------------------------------------------------------

HEADER_FILL = PatternFill('solid', fgColor='1F3864')
HEADER_FONT = Font(bold=True, color='FFFFFF', size=10)
NOTE_FONT = Font(italic=True, size=9, color='595959')
# The column the reader writes into. Coloured so it is obvious what is being asked for.
FILL_ME_FILL = PatternFill('solid', fgColor='FFF2CC')
FILL_ME_FONT = Font(bold=True, size=10, color='7F6000')
# Already looked up; the reader is reviewing rather than supplying.
MY_DRAFT_FILL = PatternFill('solid', fgColor='EAF1F8')
# No name exists to look up.
GAP_FILL = PatternFill('solid', fgColor='FCE4E4')

THIN = Side(style='thin', color='BFBFBF')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

WRAP_TOP = Alignment(wrap_text=True, vertical='top')

# Headings that mean "you write here" / "already filled in" / "nothing to fill in".
FILL_ME_PREFIXES = ('你的',)
FILLED_PREFIXES = ('英文名', '官方英文名', '来源', '我的', '已采用', '英文（已采用）')
GAP_HEADING = '缺口'


def cell_style(heading: str) -> tuple[PatternFill | None, Font | None]:
    if heading.startswith(FILL_ME_PREFIXES):
        return FILL_ME_FILL, FILL_ME_FONT
    if heading.startswith(FILLED_PREFIXES):
        return MY_DRAFT_FILL, None
    if heading.startswith(GAP_HEADING):
        return GAP_FILL, None
    return None, None


def write_sheet(workbook: Workbook, title: str, columns: list[tuple[str, int]], rows: list[list[str]],
                notes: list[str] | None = None, first: bool = False):
    """One sheet: a note block, a frozen header row, and the rows."""
    sheet = workbook.create_sheet(title) if not first else workbook.active
    sheet.title = title

    row_index = 1
    if notes:
        for note in notes:
            sheet.cell(row=row_index, column=1, value=note).font = NOTE_FONT
            row_index += 1
        row_index += 1

    header_row = row_index
    for column_index, (heading, width) in enumerate(columns, start=1):
        cell = sheet.cell(row=header_row, column=column_index, value=heading)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
        cell.border = BORDER
        sheet.column_dimensions[get_column_letter(column_index)].width = width
    sheet.row_dimensions[header_row].height = 26

    for offset, values in enumerate(rows):
        for column_index, value in enumerate(values, start=1):
            cell = sheet.cell(row=header_row + 1 + offset, column=column_index, value=value)
            cell.alignment = WRAP_TOP
            cell.border = BORDER
            cell.font = Font(size=10)

            fill, font = cell_style(columns[column_index - 1][0])
            if fill is not None:
                cell.fill = fill
            if font is not None:
                cell.font = font

    sheet.freeze_panes = sheet.cell(row=header_row + 1, column=1)
    return sheet


# ---------------------------------------------------------------------------
# Source data
# ---------------------------------------------------------------------------

def load_operators() -> list[str]:
    """The 137 shipped six-stars, in dictionary order."""
    data = json.loads((PROJECT_ROOT / 'src/lib/core/operators.json').read_text(encoding='utf-8'))
    return list(data.keys())


def load_names() -> dict:
    """The looked-up English names, plus the squads that have none."""
    return json.loads((PROJECT_ROOT / 'src/lib/core/names-en.json').read_text(encoding='utf-8'))


def load_rogues() -> tuple[list[str], list[str], list[str]]:
    """(themes, every squad, the four job squads) read out of `rogues.ts`."""
    text = (PROJECT_ROOT / 'src/lib/core/rogues.ts').read_text(encoding='utf-8')

    theme_block = re.search(r'ROGUE_NAME_LIST = \[(.*?)\]', text, re.S)
    if theme_block is None:
        raise SystemExit('ROGUE_NAME_LIST not found in rogues.ts')
    themes = re.findall(r"'([^']+)'", theme_block.group(1))

    job_block = re.search(r'JOB_TEAM_LIST = \[(.*?)\]', text, re.S)
    job_squads = re.findall(r"'([^']+)'", job_block.group(1)) if job_block else []

    squads: list[str] = []
    for match in re.finditer(r"'([^'\n]*分队)'", text):
        if match.group(1) not in squads:
            squads.append(match.group(1))

    return themes, squads, job_squads


SOURCE_LABELS = {
    'official': '官方客户端',
    'wiki': '英文 wiki（外服未上线）',
    'literal': '直译（官方与 wiki 都没有）',
}
PENDING_LABEL = '★ 官方与英文 wiki 都还没有'


def name_of(names: dict, table: str, key: str) -> tuple[str, str]:
    """(English name, source label) for one entry, empty when nothing was found."""
    entry = names.get(table, {}).get(key)
    if entry is None:
        return '', PENDING_LABEL
    return entry['en'], SOURCE_LABELS[entry['source']]


# ---------------------------------------------------------------------------
# Sheets
# ---------------------------------------------------------------------------

DECISIONS = [
    [
        'D1',
        '仙术杯 怎么处理？',
        '没有官方英译。这是社区赛事名。',
        '直译 / 拼音 / 保留中文',
        '直译为主。理由：它是「仙术」+「杯」，读者能从字面理解；纯拼音 Xianshu 对英文读者是空字符串。',
        '已采用 Theurgy Cup（你定的）。',
        '你的决定：Theurgy Cup。已写入 generator.xianshu*.name 与 result.summary.cup。',
    ],
    [
        'D2',
        '老缠杯 怎么处理？',
        '「老缠」是社区绰号，没有官方英译，也没有字面含义可依。',
        '拼音 / 意译 / 保留中文',
        '保留拼音：Laochan Cup。理由：它和 D1 不同，「老缠」不是一个能翻译的词，意译只会造出一个没人认识的词。',
        '已采用 Laochan Cup #2（你定的，并要求标届次）。',
        '你的决定：Laochan Cup #2。中文侧也从「老缠杯」改成「老缠杯 #2」，两边届次一致。',
    ],
    [
        'D3',
        '干员名在英文界面里要不要翻？',
        '结果里的干员名来自中文数据。英文界面下有两种可能：显示官方英文名（Wiš\'adel），或保留中文（维什戴尔）。',
        '翻成官方英文 / 保留中文',
        '翻。对照表已经查好了（见「干员名」页，137 位全部有名字），所以这个决定的代价已经付掉了。',
        '已采用：翻。',
        '英文界面显示官方英文名；数据与记录里存的仍是中文，所以中英下都能正确显示同一条记录。',
    ],
    [
        'D4',
        '肉鸽主题名用官方英文还是直译？',
        '例如 萨卡兹的无终奇语 / 岁的界园志异。官方英文名与中文是两套命名（前者不是后者的翻译），'
        '官方名已查得：Sarkaz\'s Furnaceside Fables / Sui\'s Garden of Grotesqueries。',
        '官方英文 / 直译',
        '官方英文。理由：玩家在游戏里看到的就是官方名，直译会造出游戏里不存在的说法。见「专有名词」页。',
        '已采用：官方英文。',
        '6 个主题里 5 个有官方名，沉沦者的黑流树海 外服未上线，用英文 wiki 写法并标了来源。',
    ],
    [
        'D5',
        '「职业」用 Class 还是 Job？',
        '代码与数据里都叫 job（operators.json 与 JOB_ALIAS_MAP），但官方英文客户端用的是 Class。',
        'Class / Job',
        'Class。理由：这是给玩家看的词，应该和游戏一致；job 留作代码内部命名。',
        '已采用 Class。',
        '界面上一律 Class；代码与数据里仍是 job，不改动，免得同一个概念出现两套字段名。',
    ],
    [
        'D6',
        'box 要不要保留原词？',
        '「box」不是英文单词的常规用法，是这类工具的社区行话（指自己拥有的干员集合）。',
        '保留 box / 换成 collection、roster 等',
        '保留 box。理由：中文界面里它本来就直接写作 box，说明这个词在社区里已经通用；换成 roster 反而让两边对不上。',
        '已采用：保留 box。',
        '英文界面同样直接用 box。',
    ],
    [
        'D7',
        'BP 要不要展开？',
        '按钮上的 4位BP / 8位BP / 16位BP。BP = ban/pick。',
        '保留 BP / 展开为 ban-pick 或 ban & pick',
        '保留 BP 但在需要完整表达的地方展开。理由：按钮上要短，但英文读者未必知道 BP。',
        '已采用：按钮 "4 BP"，说明文字里 ban/pick。',
        '按钮 action.bp4/bp8/bp16 写作 4 BP / 8 BP / 16 BP。',
    ],
    [
        'D8',
        '届次怎么写？',
        '仙术杯 #6 / #7 / #8。',
        '#6 / Season 6 / Cup 6',
        '保持 #6。理由：和中文一致，且不引入「season」这个原文没有的含义。',
        '已采用 #6。',
        '英文侧写作 Xianshu Cup #6 这类，中文侧不变。',
    ],
]

INTERFACE = [
    ['UI1', 'nav.generate', '生成', 'Generate'],
    ['UI2', 'nav.history', '记录', 'History'],
    ['UI3', 'nav.settings', '设置', 'Settings'],
    ['UI4', 'nav.editions', '届次', 'Editions'],
    ['UI5', 'action.opening', '抽取开局', 'Draw the opening'],
    ['UI6', 'action.bp4', '4位BP', '4 BP'],
    ['UI7', 'action.draw10', '抽取 10 位', 'Draw 10'],
    ['UI8', 'generator.opening.name', '开局生成器', 'Opening generator'],
    ['UI9', 'generator.opening.description', '按当前启用主题抽取今日开局',
     'Draws today\'s opening from the enabled themes'],
    ['UI10', 'generator.laochan.description', '整局只能用抽出的 10 位六星',
     'The whole run uses only the ten six-stars that were drawn'],
    ['UI11', 'result.banList', '禁用列表', 'Ban list'],
    ['UI12', 'result.picks', '各职业必选', 'Mandatory picks by class'],
    ['UI13', 'result.openingSummary', '开局结论', 'Opening verdict'],
    ['UI14', 'field.rogue', '肉鸽', 'Theme (roguelike)'],
    ['UI15', 'field.team', '分队', 'Squad'],
    ['UI16', 'field.opening', '开局', 'Opening'],
    ['UI17', 'field.fixedBan', '固定禁用', 'Fixed ban'],
    ['UI18', 'field.picks', '必选', 'Mandatory picks'],
    ['UI19', 'field.laochanPool', '本局可用', 'Available this run'],
    ['UI20', 'history.seed', '种子', 'Seed'],
    ['UI21', 'history.noIdentity', '（无 ID）', '(no ID)'],
    ['UI22', 'splash.slogan', '同一天，同一个 ID，同一个开局',
     'Same day, same ID, same opening'],
    ['UI23', 'settings.box.inBox', '在 box', 'In box'],
    ['UI24', 'settings.box.allInBox', '全部在 box', 'All in box'],
    ['UI25', 'settings.box.allOutOfBox', '全部移出', 'Remove all'],
    ['UI26', 'settings.box.byJob', '按职业进入', 'Browse by class'],
    ['UI27', 'settings.box.backToJobs', '职业', 'Classes'],
    ['UI28', 'settings.box.help',
     '勾选表示「在 box 中」。存的是排除项，所以以后新增的干员默认在 box 里。',
     'Ticked means "in box". What is stored is the exclusions, so an operator added later '
     'is in the box by default.'],
    ['UI29', 'settings.generators.summary', '肉鸽主题、分队与助战等各生成器共用选项',
     'Options shared by every generator: theme, squad, support units'],
    ['UI30', 'appearance.splashHelp', '留空则使用当前主题的背景色。图片会先压到 1920 像素以内再保存。',
     'Empty uses the current theme\'s background colour. Images are scaled to 1920px before saving.'],
    ['UI31', 'appearance.splashError.tooLargeAfterResize',
     '压缩后仍然太大，换一张颜色更简单的图片试试。',
     'Still too large after scaling — try an image with simpler colours.'],
    ['UI32', 'common.motionAlways', '始终减少', 'Always reduce'],
    ['UI33', 'common.motionNever', '不减少', 'Never reduce'],
    ['UI34', 'generator.xianshu6.constraint',
     '肉鸽固定为萨卡兹的无终奇语；禁用列表固定为维什戴尔，不随动作变化。',
     'Theme locked to Sarkaz\'s Furnaceside Fables; the ban list is fixed to Wiš\'adel and does '
     'not change with the action.'],
    ['UI35', 'generator.xianshu8.constraint',
     '肉鸽固定为岁的界园志异；禁用仍按动作抽取，但电弧出现的概率是其他干员的三倍，其余悬赏干员为两倍。',
     'Theme locked to Sui\'s Garden of Grotesqueries; bans are still drawn per action, but '
     'Raidian (电弧) is three times as likely as other operators and the other bounty '
     'operators twice as likely.'],
    ['UI36', '（术语）', '助战 / 招募助战', 'Support unit'],
    ['UI37', '（术语）', '悬赏干员', 'Bounty operator'],
    ['UI38', '（术语）', '肉鸽（模式本身，不是主题）', 'Integrated Strategies / roguelike'],
    ['UI39', '（术语）', '电弧（在这套规则里被单独加权）', 'Raidian —— 已由官方客户端确认'],
    ['UI40', '（术语）', '整局（如「整局禁用」）', 'for the whole run'],
]

# The four places `operators.json`'s `code_name_en` disagrees with the official client.
# Recorded rather than silently fixed: `operators.json` is the shipped dictionary and stays
# as generated, so it is not ours to edit. `names-en.json` uses the official side, and
# names-en.test.ts pins these four so a regression cannot pass unnoticed.
BASELINE_DIFFS = [
    ['早露', 'char_197_poca', 'Роса', 'Rosa', 'operators.json 用了俄文拼写（早露是乌萨斯干员）'],
    ['鸿雪', 'char_4055_bgsnow', 'Позёмка', 'Pozëmka', '同上：operators.json 用了俄文拼写'],
    ['焰影苇草', 'char_1020_reed2', 'Reed The Flame Shadow', 'Reed the Flame Shadow', '大小写：官方用 the 小写'],
    ['丰川祥子', 'char_4182_oblvns', 'Togawa Sakiko', 'Sakiko Togawa', '姓名顺序：官方用西式顺序'],
]


def build():
    workbook = Workbook()
    names = load_names()

    write_sheet(
        workbook,
        '决策项',
        [('编号', 7), ('要定的事', 26), ('为什么需要你定', 42), ('可选做法', 22), ('我的建议', 52),
         ('已采用', 34), ('你的决定 / 修改', 30)],
        DECISIONS,
        notes=[
            '★ 8 个决策都已经定下并写进代码了，这一页现在是复核清单，不是待填表单。',
            '「已采用」列是最终写进代码的方案，来源写在最后一列。有异议直接在最后一列写。',
        ],
        first=True,
    )

    themes, squads, job_squads = load_rogues()
    job_squad_set = set(job_squads)
    gap_squads = set(names.get('pendingSquads', []))

    write_sheet(
        workbook,
        '专有名词',
        [('类型', 20), ('中文', 24), ('英文名（已查证）', 34), ('来源', 24),
         ('出现位置', 28), ('你的修改', 24)],
        [
            ['肉鸽主题', theme, *name_of(names, 'themes', theme),
             'settings.generators · field.rogue', '']
            for theme in themes
        ] + [
            ['分队' + ('（四职业队之一）' if squad in job_squad_set else ''), squad,
             *name_of(names, 'squads', squad),
             'field.team · 开局生成器的分队选项', '']
            for squad in squads
        ],
        notes=[
            '这一页已经填好了：名字是从官方英文客户端数据里按内部 id 对出来的，不是从中文翻译的。',
            '「来源」为「官方客户端」的是游戏内正式名称；「英文 wiki（外服未上线）」的是国服已上线、外服还没有的内容，'
            '用的是英文社区 wiki 的写法，外服上线后可能变；「直译」的是外服与 wiki 都还没有的分队，'
            '由我按字面译出，外服上线后应替换为官方名。',
            '这一页没有 ★ 缺口了：全部条目都有名字。',
        ],
    )

    write_sheet(
        workbook,
        '命名差异',
        [('中文名', 14), ('charId', 20), ('operators.json 的 code_name_en', 24), ('官方英文客户端', 24), ('差异性质', 46)],
        BASELINE_DIFFS,
        notes=[
            'operators.json 里的 code_name_en 有 4 处和官方客户端不一致，列在这里备查。',
            '已按官方侧写入 names-en.json；operators.json 保持生成时的原样，因为它是数据源，不该由我们改。',
        ],
    )

    write_sheet(
        workbook,
        '界面文案',
        [('编号', 8), ('key / 位置', 34), ('中文原文', 46), ('英文（已采用）', 46), ('你的修改', 40)],
        [[row[0], row[1], row[2], row[3], ''] for row in INTERFACE],
        notes=[
            '这一页的英文已经全部写进 i18n/index.ts 并跑通了，现在是复核清单。',
            '其余界面文案同样已经写完（目录里中英键集一致，有测试保证），不在这一页逐条列出。',
            '专有名词已按查证结果填入（UI34/UI35/UI39）。',
            'UI36–UI40 是术语，不是 key：它们出现在多条文案里，定一次就够了。',
        ],
    )

    operators = load_operators()
    write_sheet(
        workbook,
        '干员名',
        [('序号', 6), ('中文名', 16), ('官方英文名', 26), ('来源', 24), ('你的修改', 20)],
        [
            [index + 1, name, *name_of(names, 'operators', name), '']
            for index, name in enumerate(operators)
        ],
        notes=[
            f'共 {len(operators)} 位六星干员，顺序就是字典序（也是生成结果里各职业内的顺序），请勿调整行序。',
            '全部 137 位都有名字了，不需要你填写——只需要抽查，或按「决策项」D3 决定英文界面下要不要显示。',
            '「英文 wiki（外服未上线）」的 10 位是国服已上线、外服还没有的干员。',
        ],
    )

    wiki_operators = sum(1 for entry in names['operators'].values() if entry['source'] == 'wiki')
    # Counted rather than hard-coded: the number changes whenever a squad is added or the
    # global client catches up, and a stale figure in a sheet nobody regenerates is worse
    # than no figure.
    literal_squads = sum(1 for entry in names['squads'].values() if entry['source'] == 'literal')
    wiki_themes = sum(1 for entry in names['themes'].values() if entry['source'] == 'wiki')

    write_sheet(
        workbook,
        '说明',
        [('项目', 22), ('内容', 100)],
        [
            ['这份表要解决什么', '接 svelte-i18n 加 en 之前，把「只能由人决定」的部分收集起来。'
                                 '界面骨架的翻译是机械工作，不需要你参与。'],
            ['专有名词已经查完了', '干员名、肉鸽主题、分队不再需要你填。它们是从官方英文客户端数据里'
                                   '按游戏内部 id 对出来的（char_112_siege、rogue_5_band_17 这样），'
                                   '不经过中文，所以不会出现「看起来像翻译」的错名。结果落在 '
                                   'src/lib/core/names-en.json，并有测试保证不漏、不多。'],
            ['还剩多少', f'干员 {len(operators)}/{len(operators)}、主题 {len(themes)}/{len(themes)}、'
                         f'分队 {len(squads)}/{len(squads)} 全部有名字，没有缺口。'
                         f'其中 {wiki_operators} 位干员、{wiki_themes} 个主题、{literal_squads} 个分队'
                         f'不在官方英文客户端里（见「专有名词」页的来源列）。'],
            ['外服落后是正常的', '外服（英文客户端）落后国服约半年，所以国服已上线、外服没有的内容，'
                                 '官方英文名确实还不存在。这不是数据缺失。'],
            ['那你需要做什么', '① 抽查「专有名词」和「界面文案」，有异议写在最后一列；'
                               '② 「决策项」现在是复核清单，8 条都已定；③ 「命名差异」看一眼有没有异议。'],
            ['英文已经接进去了', 'i18n/index.ts 里中英两份目录，键集完全一致；'
                                 'i18n/names.ts 负责把存下来的中文专有名词翻成显示用英文。'
                                 '生成器仍然只产出中文数据——中文名是结果的身份（勾选与记录都以它为准），所以本地化放在显示边界。'],
            ['怎么切换', '设置 → 外观 → 语言。语言存进设置文件，重启后保持。'],
            ['剩下的不确定只有一类', '英文本身有多种合理写法的措辞（BP、box、Class/Job）——'
                                     '这些是偏好，不是查证能解决的。'],
            ['表格是怎么生成的', '由 kaiju-tauri/scripts/make-i18n-worksheet.py 生成，'
                                 '读 operators.json、rogues.ts 与 names-en.json。'
                                 '字典或名字更新后重跑脚本就能刷新。'],
        ],
        first=False,
    )

    # 说明 first, since it is the page a reader should see first.
    workbook.move_sheet('说明', offset=-(len(workbook.sheetnames) - 1))
    workbook.save(TARGET)
    return TARGET, themes, squads, operators, gap_squads


if __name__ == '__main__':
    target, themes, squads, operators, gaps = build()
    print(f'themes={len(themes)} squads={len(squads)} (pending {len(gaps)}) '
          f'decisions={len(DECISIONS)} interface={len(INTERFACE)} operators={len(operators)}')
    print(f'-> {target}')
