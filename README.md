# ARG · Arknights Rogue Generator

《明日方舟》集成战略（肉鸽）随机开局生成器，项目代号 **ARG**。桌面端与安卓端，同一个种子得到同一个结果。

同一份「干员 ID + 日期」永远抽出同一套开局，所以它适合用来和朋友对同一个种子，也适合每天抽一次当作当天的课题。

## 功能

- **开局生成器** —— 按当前启用的主题抽取今日开局：开局主题、开局分队、开局干员、被禁用的干员，以及抓位列表。
- **仙术杯赛制** —— 收录仙术杯 #1 至 #9（含 #1.5、#2.5），每届锁定自己的主题与禁选规则。
- **通天国际联赛** —— #1 限定水月与深蓝之树；#2 限定探索者的银凇止境，并固定禁用 17 位干员。
- **老缠杯** —— #1 限定探索者的银凇止境与矛头分队（老鲤与琳琅诗怀雅当开局干员的权重是其他干员的 5 倍）、#3 限定界园志异，这两届和开局生成器规则一致；#2 限定萨卡兹的无终奇语，不开局也不 BP，只从全部六星里抽 12 位，这一局只能用这 12 位的一技能。
- **四个 BP 档位** —— 开局 / 4 BP / 8 BP / 16 BP，档位越高禁用池越大。
- **干员池** —— 六星干员 137 名，可逐个标记「没有」或「已拥有不可使用」，也可以把 MAA 导出的干员文本直接粘贴导入。
- **头像模式** —— 可以在干员列表里用头像代替名字；被禁用、以及不在 box 里的干员会盖一层灰色遮罩。开局干员的头像会描一圈高亮边。
- **标记已用** —— 抓位可以逐个点击：点一下盖一层蓝色半透明遮罩，表示这一把你已经用掉了，再点一下还原。纯粹是进度标记，不参与抽取，换一个结果就清空。头像模式下点的是头像本身，其他干员列表不可点。
- **导出结果** —— 一键复制成 `ID：… 主题：… 分队：… 开局干员：…` 的格式，BAN 与 PICK 各是一行、不分职业，方便贴给别人。
- **个人资料** —— 自定义 ID 与头像，头像从干员头像库里选。没填 ID 时按默认 ID「博士」抽取。
- **历史记录** —— 保留最近 50 次生成；「抽取开局」不入库，BP 档位都会记录。
- **今日运势** —— 首页可以投钱问路（抽三枚通宝，看是花钱、厉钱还是听凭天命）和抽塔罗牌（两张牌，各有正逆位与关键词）。每个 ID 每天各一次，两张牌不会重复，和生成结果一样只由「ID + 日期」决定。
- **音效** —— 投钱问路落币时按结果播放对应音效；音量在「设置 → 声音」里统一控制全部音效，0 为静音。
- **中英双语** —— 界面与生成结果都可切换英文，干员名、主题名用官方英译。语言在「设置 → 语言」里单独设置，和主题配色互不影响。

## 下载

到 [Releases](https://github.com/Rosmontis220/ArknightsRogueGenerator_Tauri/releases) 取最新版本：

| 平台 | 文件 |
| --- | --- |
| Windows（免安装） | `ArknightsRogueGenerator-<版本>-portable.exe` |
| Windows（安装） | `ArknightsRogueGenerator-<版本>-setup.exe` 或 `ArknightsRogueGenerator-<版本>-x64.msi` |
| Android | `ArknightsRogueGenerator-<版本>.apk` |

文件名是 ASCII 的，这不是笔误：GitHub 会把 Release 资源名里的非 ASCII 字符直接删掉，中文名传上去会被削成 `_0.3.0.apk` 这种。中文说明写在 Release 正文里。

Windows 免安装版是单文件绿色版，双击即用，不写注册表。安卓端需要 Android 7.0（API 24）及以上。

## 技术栈

| | |
| --- | --- |
| 壳 | Tauri 2（Rust） |
| 前端 | SvelteKit + Svelte 5（runes）+ TypeScript |
| 样式 | Tailwind CSS v4 |
| 打包 | `adapter-static`，纯静态产物，无服务端 |

Rust 侧只负责持久化：把状态原子地写到应用数据目录下的 `state.json`。所有生成逻辑都在前端，不联网。

## 开发

需要 Node.js 20+、pnpm、Rust 工具链，以及 Tauri 的系统依赖（见 [Tauri 前置要求](https://tauri.app/start/prerequisites/)）。

```sh
pnpm install
pnpm tauri dev
```

类型检查与构建：

```sh
pnpm check      # svelte-check
pnpm build      # 前端产物到 build/
```

## 打包

### 桌面端

```sh
pnpm tauri build
```

产物在 `src-tauri/target/release/bundle/`：`msi/` 与 `nsis/` 各一份安装包。单文件绿色版是 `src-tauri/target/release/arknights-rogue-generator.exe`——文件名来自 Cargo 的包名，拷出来改成 `ArknightsRogueGenerator.exe` 不影响运行。

### 安卓端

还需要 JDK 17+、Android SDK（platform 36、build-tools）与 NDK（23.1.7779620 实测可用）。

```sh
pnpm tauri android init     # 首次，生成 gen/android
pnpm tauri android build --apk
```

产物在 `src-tauri/gen/android/app/build/outputs/apk/`。发布用的 APK 需要用你自己的 keystore 签名：把 `storeFile` / `storePassword` / `keyAlias` / `keyPassword` 写进 `src-tauri/gen/android/keystore.properties`（已被 git 忽略），`app/build.gradle.kts` 会自动读取；没有这个文件也能构建，只是产物未签名。

注意 `storeFile` 请用纯 ASCII 路径：Gradle 用 `Properties.load(InputStream)` 读这个文件，按 ISO-8859-1 解码，非 ASCII 路径会变成乱码、构建时找不到 keystore。

`gen/android/` 随仓库提供，里面固定了 build-tools `36.0.0`——AGP 8.11 默认要 35.0.0，没装就会直接报 `Failed to find Build Tools revision 35.0.0`。你本机装的版本不同的话，改 `gen/android/app/build.gradle.kts` 与 `gen/android/build.gradle.kts` 里的 `buildToolsVersion`。

## 目录结构

```
src/
  lib/
    core/         干员表、主题表、种子推导、SHA-256
    generators/   各赛制的生成逻辑，registry.ts 是唯一的总表
    i18n/         中英词条与显示边界上的本地化
    stores/       应用状态、历史记录
  routes/
    splash/       开屏
    home/         首页、生成、历史、设置
  static/avatars/ 137 位六星干员的头像，文件名是干员 id
src-tauri/        Rust 侧：窗口配置、持久化命令、图标
```

生成器全部由 `src/lib/generators/registry.ts` 登记，生成页照着这份表渲染。新增一个赛制 = 加一个模块 + 在表里加一行，不需要改任何界面代码。

## 结果是怎么定下来的

每次生成只由「干员 ID + 日期」决定：不依赖随机数发生器，也不依赖系统时间，所以同一份输入永远得到同一个结果。

## 数据

干员、主题、分队等数据以中文存放在源码里，本地化发生在显示边界上（`t()` 与 `localize*`），生成逻辑本身不碰语言。英文干员名与主题名采用官方客户端的译名。

## 许可证

[Apache-2.0](LICENSE)。

---

## English

**ARG** (Arknights Rogue Generator) is a random run generator for *Arknights* Integrated Strategies. Desktop (Tauri 2 + SvelteKit) and Android, in Chinese and English.

Results depend only on the player ID and the date, with no random number generator, no network access, and no dependence on the system clock — so the same ID and date always produce the same run.

It covers the opening generator, Theurgy Cup #1–#9, Skywalking Global League #1–#2, and LAO CHAN BEI #1–#3, plus 4/8/16 ban-pick sizes, a 137-operator box with MAA import, portrait mode, result export, a custom profile picture, a 50-run history, a daily coin-toss and tarot reading, and sound effects with a master volume under Settings → Sound.
