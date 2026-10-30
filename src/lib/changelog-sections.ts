import type { ChangeRelease } from "./changelog";

/** Every release's items, newest first, loaded only when the dialog opens */
export const CHANGELOG_RELEASES: ChangeRelease[] = [
	{
		date: "2026-10-31",
		sections: [
			{
				heading: { en: "Navigation", zh: "导航" },
				items: [
					{
						en: "The top bar now has three menus: Tools, Scores and Files. Hover over one, or click it, to see its pages. Your avatar opens your Account.",
						zh: "顶栏改为三个菜单：工具、成绩和资源。将鼠标移到菜单上或点击即可看到其中的页面。点击头像即可打开账号页面。",
					},
					{
						en: "Simulation, Targets and Tags moved from the Cards tabs to Tools, next to Score control, Nicknames, Phira and Guess the song.",
						zh: "曲目模拟、推分目标和谱面标签从成绩图标签移到了「工具」，与分数计算器、曲目别名、Phira 和猜曲绘放在一起。",
						href: "/simulate",
					},
				],
			},
			{
				heading: { en: "Song pages", zh: "曲目页面" },
				items: [
					{
						en: "Every song has its own page: illustration, composer, illustrator, chapter, BPM, and each chart's constant, note count, note types and charter. Signed in, you also see your score and rank on each chart.",
						zh: "每首曲目都有了自己的页面：曲绘、曲师、画师、章节、BPM，以及每张谱面的定数、物量、音符类型和谱师。登录后还能看到你在每张谱面上的成绩与排名。",
						href: "/songs",
					},
					{
						en: "Chart versions lists how each chart changed across older Phigros versions. Pick two versions to compare note counts, note types, judge lines and notes per second, second by second.",
						zh: "「谱面版本」列出每张谱面在旧版 Phigros 中的变化。选择两个版本，即可对比物量、音符类型、判定线数量，以及逐秒的音符密度。",
					},
					{
						en: "Search results on Nicknames link to the song page, and the song page opens Phira with that song already picked.",
						zh: "曲目别名的搜索结果会链接到曲目页面，曲目页面可直接打开已选好该曲目的 Phira 页面。",
						href: "/songs",
					},
				],
			},
			{
				heading: { en: "New Cards tabs", zh: "成绩图新标签" },
				items: [
					{
						en: "Targets lists the accuracy each chart needs to push your RKS up to the next step, with filters by level. Each song links to its song page.",
						zh: "「推分目标」列出每张谱面把 RKS 推到下一档所需的准确率，可按难度筛选，点击曲名即可打开曲目页面。",
						href: "/targets",
					},
					{
						en: "Progress shows how many charts you have cleared, full combo'd and All Perfect'd, by difficulty and constant. Pick a cell to list its charts.",
						zh: "「完成度」按难度和定数显示通关、Full Combo 和 All Perfect 的谱面数量，点击格子即可列出其中的谱面。",
						href: "/progress",
					},
					{
						en: "Trend draws your RKS over time and lists the scores that went up, newest first.",
						zh: "「走势」绘制 RKS 随时间的变化，并按时间倒序列出提升过的成绩。",
						href: "/trend",
					},
					{
						en: "More now has Download scores: every chart you have played, as CSV or JSON.",
						zh: "「更多」菜单新增「下载成绩」：以 CSV 或 JSON 导出你玩过的所有谱面。",
						href: "/me",
					},
				],
			},
			{
				heading: { en: "Sharing", zh: "分享" },
				items: [
					{
						en: "Compare players puts two players side by side: RKS, clears by difficulty, best 30 and every chart both have played. A player can be compared only after turning on Allow compare in their Share link menu; it is off by default.",
						zh: "「玩家对比」可并排查看两位玩家：RKS、各难度通关、Best 30，以及两人都玩过的每张谱面。玩家需在「分享链接」菜单中打开「允许对比」才能被对比，默认关闭。",
						href: "/compare",
					},
					{
						en: "The Share link menu has an RKS badge for GitHub profiles and forum signatures, in six styles, with Markdown and HTML to copy.",
						zh: "「分享链接」菜单新增 RKS 徽章，可用于 GitHub 主页和论坛签名，提供六种样式，可复制 Markdown 或 HTML。",
						href: "/me",
					},
				],
			},
			{
				heading: { en: "Guess the song", zh: "猜曲绘" },
				items: [
					{
						en: "A daily puzzle: name the song from a close-up of its illustration, blurred, recoloured and inverted. Each wrong guess zooms out and clears it up. Practice puzzles never run out.",
						zh: "每日一题：从经过模糊、变色和反色处理的曲绘特写中猜出曲目。每猜错一次，画面就会拉远并变得更清晰。练习题可以无限游玩。",
						href: "/guess",
					},
					{
						en: "A timer runs from Start, and signed-in players can join the daily leaderboard, ranked by fewest tries, then fastest time.",
						zh: "按下「开始」后开始计时；登录后可加入每日排行榜，先比尝试次数，再比用时。",
						href: "/guess",
					},
				],
			},
			{
				heading: { en: "Terms and privacy", zh: "条款与隐私" },
				items: [
					{
						en: "Every section of the terms and the privacy policy now starts with a one-line TL;DR. Both pages cover comparing, the badge, score downloads and the Guess the song leaderboard.",
						zh: "使用条款和隐私政策的每一节开头都新增了一句话总结。两份文件都已加入对比、徽章、成绩下载和猜曲绘排行榜的说明。",
						href: "/privacy",
					},
				],
			},
		],
	},
	{
		date: "2026-10-28",
		sections: [
			{
				heading: { en: "Multiplayer server", zh: "多人游戏服务器" },
				items: [
					{
						en: "The new Multiplayer server page shows whether PhiBot's Phira server is online, how many players and rooms there are, and who is in each room. It updates every 15 seconds; open it from the Phira page.",
						zh: "新的「多人游戏服务器」页面会显示 PhiBot 的 Phira 服务器是否在线、在线玩家与房间数量，以及每个房间里的玩家，每 15 秒更新一次。可从 Phira 页面进入。",
						href: "/phira-mp",
					},
					{
						en: "Status now tracks the multiplayer server too: uptime, latency, players, rooms, CPU and memory.",
						zh: "运行状态页新增多人游戏服务器：可用率、延迟、玩家、房间、CPU 和内存。",
						href: "/status",
					},
				],
			},
		],
	},
	{
		date: "2026-10-27",
		sections: [
			{
				heading: { en: "New look", zh: "新外观" },
				items: [
					{
						en: "Checkout PhiBot's New homepage!",
						zh: "PhiBot 首页焕然一新！",
						href: "/",
					},
				],
			},
			{
				heading: { en: "Move save", zh: "迁移存档" },
				items: [
					{
						en: "After a copy, Move save offers to bind the To account, so your cards and /b30 in Discord use the copied save.",
						zh: "复制完成后，「迁移存档」会询问是否绑定目标账号，之后成绩图和 Discord 里的 /b30 都会使用复制过去的存档。",
						href: "/account/migrate",
					},
					{
						en: "If you sign in to PhiBot with TapTap, the offer tells you which TapTap account to sign in with afterwards.",
						zh: "如果你用 TapTap 登录 PhiBot，绑定提示会说明之后应使用哪个 TapTap 账号登录。",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复" },
				items: [
					{
						en: "If TapTap fails while you switch to another account, the account you had stays bound, with its save.",
						zh: "切换到其他账号时若 TapTap 出错，原来绑定的账号及其存档都会保留。",
					},
					{
						en: "Switching the language changes the whole page at once, instead of the buttons first and the rest a moment later.",
						zh: "切换语言时整个页面会同时切换，不再先切换按钮、稍后才切换其余内容。",
					},
					{
						en: "A failed TapTap request shows a message in your language instead of a raw code such as bind_failed.",
						zh: "TapTap 请求失败时会显示对应语言的提示，不再显示 bind_failed 之类的原始代码。",
					},
				],
			},
		],
	},
	{
		date: "2026-10-25",
		sections: [
			{
				heading: { en: "Story timeline", zh: "剧情时间线" },
				items: [
					{
						en: "Files has a new Timeline tab: Phigros' story laid out by in-game date on a track you scroll sideways, with artwork for each era and a story map that shows every thread at once.",
						zh: "资源页新增「剧情」标签：按游戏内日期横向排列 Phigros 的剧情，每个纪元都有专属插图，剧情地图可一次纵览所有剧情线。",
						href: "/files?view=timeline",
					},
					{
						en: "Zoom the cards from brief titles to full notes, zoom the story map up to 16×, and jump straight to any era.",
						zh: "事件卡片可在简要标题与完整注释之间缩放，剧情地图最多可放大 16 倍，也可以直接跳到任意纪元。",
						href: "/files?view=timeline",
					},
					{
						en: "Events come from the Collection and from every page of the Limbo Wiki, each linked to the wiki pages behind it. Notes mark where the wiki adds to, backs up or contradicts an event, including deathMark's Q&A answers.",
						zh: "事件取自收藏品与林泊百科的全部页面，并链接到对应的百科页面。注释会标出百科对事件的补充、佐证或矛盾之处，也收录了 deathMark 的答疑。",
						href: "/files?view=timeline",
					},
					{
						en: "The Eras, Threads and Chapters tabs list the story by period, by story thread and by chapter.",
						zh: "「纪元」「剧情线」「章节」标签分别按时期、剧情线与章节整理剧情。",
						href: "/files?view=timeline&tab=eras",
					},
					{
						en: "Setting is a glossary of the Tower's places, peoples, groups, whims and ideas, each with the events that mention it: 190 official entries, plus over 3,000 from the community.",
						zh: "「设定」是像素塔的地点、族群、组织、异想与概念词典，每个条目都列出提到它的事件：190 条官方条目，另有 3,000 多条社区设定。",
						href: "/files?view=timeline&tab=setting",
					},
					{
						en: "Fan-written lore stays hidden until you choose Show community lore.",
						zh: "社区创作的设定默认隐藏，点击「显示社区设定」即可查看。",
						href: "/files?view=timeline&community=1",
					},
				],
			},
			{
				heading: { en: "Account", zh: "账号" },
				items: [
					{
						en: "Unbind now sits on the Account page, next to your sessionToken.",
						zh: "「解绑」按钮移至账号页面，位于 sessionToken 旁边。",
						href: "/account",
					},
					{
						en: "When TapTap rate limits PhiBot, sign-in and save errors now say so and suggest waiting a few minutes.",
						zh: "TapTap 对 PhiBot 限流时，登录与存档相关的报错会明确说明，并建议等几分钟再试。",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复" },
				items: [
					{
						en: "Long pages have a Back to top button in the corner.",
						zh: "较长的页面右下角会出现「回到顶部」按钮。",
					},
					{
						en: "Files and PV show a loading placeholder as soon as you click, instead of waiting on the old page.",
						zh: "点击资源或 PV 后会立即显示加载占位，不再停留在原页面等待。",
						href: "/files",
					},
					{
						en: "The Phira page shows a spinner while it is still looking for a song's Legacy, SP and older charts.",
						zh: "Phira 页面在查找曲目的 Legacy、SP 谱面与旧版本时会显示加载提示。",
						href: "/phira",
					},
				],
			},
		],
	},
	{
		date: "2026-10-22",
		sections: [
			{
				heading: { en: "Move save", zh: "迁移存档" },
				items: [
					{
						en: "Move save, on the Account page, copies a Phigros cloud save from one TapTap account to another, on the CN or Global server. Sign in to each account by QR code, login link or sessionToken, then check both saves side by side before the copy. The From save is only read.",
						zh: "账号页面新增「迁移存档」：把一个 TapTap 账号的 Phigros 云存档复制到另一个账号，国服或国际服都可以。两个账号都可以用二维码、登录链接或 sessionToken 登录，复制前会并排核对两边的存档。来源存档只会被读取。",
						href: "/account/migrate",
					},
					{
						en: "When you sign in to TapTap by QR code, Copy link copies the login link so you can open it on another device, and Open login link opens it in a new tab.",
						zh: "用 TapTap 二维码登录时，可以点击「复制链接」复制登录链接，在其他设备上打开；「打开登录链接」会在新标签页中打开。",
					},
				],
			},
		],
	},
	{
		date: "2026-10-17",
		sections: [
			{
				heading: { en: "From older versions", zh: "旧版本内容" },
				items: [
					{
						en: "Pick a game version on the Phira page to download a song's charts as they were then: 289 older charts of 89 songs, from 1.2.0 on, each with the music of its version. Legacy charts stay listed whichever version you pick.",
						zh: "在 Phira 页面选择游戏版本，即可下载曲目当时的谱面：共 89 首曲目的 289 张旧版谱面，最早来自 1.2.0，每张都附带对应版本的音乐。无论选择哪个版本，Legacy 谱面都会显示。",
						href: "/phira",
					},
					{
						en: "Files has an Old versions tab with every older chart and its pack.",
						zh: "资源页新增「旧版本」标签，收录所有旧版谱面及谱面包。",
						href: "/files",
					},
					{
						en: "Christmas (from 1.2.4) and HAZARD's April Fools chart join the 4/1 charts.",
						zh: "4/1 特别谱面新增 Christmas（来自 1.2.4）与 HAZARD 的愚人节谱面。",
						href: "/phira",
					},
					{
						en: "Winter ↑cube↓ BND now comes with the joke music it was charted to.",
						zh: "Winter ↑cube↓ 的 BND 谱面现在附带其原本的恶搞音乐。",
						href: "/phira",
					},
					{
						en: "Destination, Anomaly and テリトリーバトル, songs the game has since removed: a Phira pack for every difficulty, plus the music, illustration and charts, from the last version that had them.",
						zh: "收录游戏已移除的曲目 Destination、Anomaly 与 テリトリーバトル：每个难度的 Phira 谱面包，以及音乐、曲绘与谱面，取自最后收录它们的版本。",
						href: "/phira",
					},
					{
						en: "The 24 Legacy charts removed in 2.4.1, and hidden charts from early versions: Dead Soul, Rubbish Sorting, もぺもぺ and Wavetapper SP, 混乱-Confusion AT and Winter ↑cube↓ BND. Each pack carries the music it was charted to.",
						zh: "收录 2.4.1 移除的 24 张 Legacy 谱面，以及早期版本的隐藏谱面：Dead Soul、Rubbish Sorting、もぺもぺ 与 Wavetapper 的 SP，混乱-Confusion 的 AT，以及 Winter ↑cube↓ 的 BND。每个谱面包都附带写谱时所用的音乐。",
						href: "/phira",
					},
					{
						en: "The Phira page marks each one with the version it comes from, and Files has a new Removed tab.",
						zh: "Phira 页面会注明每张谱面来自哪个版本，资源页也新增了「已移除」标签。",
						href: "/files",
					},
				],
			},
			{
				heading: { en: "Sharing", zh: "分享" },
				items: [
					{
						en: "A link to any PhiBot page now shows a preview image for that page, and a shared card's link previews that player's card.",
						zh: "分享任意 PhiBot 页面链接时都会显示该页面的预览图，分享的成绩图链接会预览该玩家的成绩图。",
					},
				],
			},
			{
				heading: { en: "Files", zh: "资源" },
				items: [
					{
						en: "Files, PV and Collection now switch with tabs at the top, so each page uses the full width.",
						zh: "资源、PV、收藏品改为页面顶部的标签切换，每个页面都能使用完整宽度。",
						href: "/files",
					},
					{
						en: "Every chart can be downloaded as the game's own JSON: choose Chart JSON in Files.",
						zh: "所有谱面都可以下载游戏原始 JSON：在资源中选择「谱面 JSON」。",
						href: "/files",
					},
					{
						en: "Song cards and Files name the illustrator next to each illustration.",
						zh: "曲目卡片与资源页会在曲绘旁注明画师。",
						href: "/files",
					},
					{
						en: "The Files page no longer jumps while its list loads.",
						zh: "资源页在列表加载时不再跳动。",
					},
				],
			},
			{
				heading: { en: "PV", zh: "PV" },
				items: [
					{
						en: "Watch or download the game's chapter and event videos, including the unlock PVs from earlier versions.",
						zh: "可以在线观看或下载游戏内的章节与活动视频，包括历史版本的解锁 PV。",
						href: "/files?view=pv",
					},
					{
						en: "Turn on the in-game overlay to see a PV with its song card, at the difficulty you pick.",
						zh: "开启「游戏内界面」即可查看带曲目卡片的 PV，并可选择卡片上显示的难度。",
						href: "/files?view=pv",
					},
					{
						en: "The QD and After Deduction captions come in all five of the game's languages, and both PVs link to their transcripts.",
						zh: "QD 与 After Deduction 的字幕支持游戏的全部五种语言，两段 PV 均可跳转到字幕文本。",
						href: "/files?view=pv&v=qd",
					},
					{
						en: "On wide screens the video list sits beside the player. On phones, picking a video keeps your place, and a Back to player button takes you up.",
						zh: "宽屏下视频列表位于播放器旁边；手机上选择视频不再跳回顶部，可用「回到播放器」按钮返回。",
						href: "/files?view=pv",
					},
					{
						en: "Deduction, the scene before After Deduction, is now a PV in all five of the game's languages, and you can also play it interactively, tap by tap, as in the game.",
						zh: "After Deduction 之前的「推演」场景现已加入 PV，支持游戏的全部五种语言；也可以像游戏中一样点击推进，互动重播。",
						href: "/files?view=pv&v=deduction",
					},
				],
			},
			{
				heading: { en: "Collection", zh: "收藏品" },
				items: [
					{
						en: "Search the whole Collection: every chapter's titles and text, in the language you pick, with the matches highlighted.",
						zh: "可以搜索全部收藏品：在所选语言下搜索各章节的标题与正文，并高亮匹配内容。",
						href: "/files?view=collection",
					},
					{
						en: "Collection and Game text pages use the full width, with the On this page list at the right edge.",
						zh: "收藏品与游戏文本页面使用完整宽度，「本页内容」列表位于最右侧。",
						href: "/files?view=collection",
					},
					{
						en: "Read every Collection entry, filed by chapter as in the game, with each clue and how it unlocks.",
						zh: "按游戏中的章节浏览全部收藏品，包括每条线索及其解锁条件。",
						href: "/files?view=collection",
					},
					{
						en: "Chapter IX shows the OS map's illustrations beside or above the text, as the game does, with a full-size view.",
						zh: "第九章收藏品按游戏中的样式显示 OS 地图插图，并可查看原图。",
						href: "/files?view=collection&chapter=c9",
					},
					{
						en: "Three Chapter IX entries also show the text the map shows before the story unlocks them.",
						zh: "三条第九章收藏品同时显示剧情解锁前地图上的文字。",
						href: "/files?view=collection&chapter=c9",
					},
					{
						en: "Read the Collection in any of the game's five languages, whatever language the site is in.",
						zh: "收藏品可切换为游戏的五种语言之一，与网站语言无关。",
						href: "/files?view=collection",
					},
					{
						en: "Entries show the details the game lists with them, such as a recording's length or a file number.",
						zh: "收藏品会显示游戏列出的附加信息，例如录音时长或档案编号。",
						href: "/files?view=collection",
					},
					{
						en: "Chapter IX entries show the tiles the OS map draws for them.",
						zh: "第九章收藏品显示 OS 地图上对应的图块。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: { en: "Cards", zh: "成绩图" },
				items: [
					{
						en: "Chart tags and Simulation are now tabs of the Cards page, next to B30 and the other cards; the top menu is shorter.",
						zh: "谱面标签与曲目模拟现在是成绩图页面的标签页，与 B30 等成绩图并列；顶部菜单更简洁。",
						href: "/me/b30",
					},
				],
			},
			{
				heading: { en: "Other resources", zh: "其他资源" },
				items: [
					{
						en: "Game text is now Other resources: the loading tips in all five of the game's languages, every avatar with its name, and the About us staff roll.",
						zh: "「游戏文本」更名为「其他资源」：收录五种语言的加载提示、全部头像及其名称，以及「关于我们」中的制作人员名单。",
						href: "/files?view=texts",
					},
					{
						en: "Story lines that only live in the game's code now sit with their chapter in the Collection: Chapter IX has the Baseline Challenge monologue, its unlock popups, the After Deduction captions and the ending staff roll; Chapter VIII has the QD captions.",
						zh: "只存在于游戏代码中的剧情文本移至收藏品的对应章节：第九章收录 Baseline Challenge 独白、解锁提示、After Deduction 字幕与片尾制作人员名单；第八章收录 QD 字幕。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: { en: "Chapter IX hidden song", zh: "第九章隐藏曲" },
				items: [
					{
						en: "True home, True world, the song behind the Chapter IX passcode: its stats, music, Phira pack (SP Lv.?), chart and background.",
						zh: "True home, True world：第九章密码背后的隐藏曲，提供物量、音乐、Phira 谱面包（SP Lv.?）、谱面与背景。",
						href: "/files?view=c9s6",
					},
					{
						en: "Replay the cutscene the game plays before it, in any of its five languages.",
						zh: "可以重播游戏在这首歌之前播放的过场剧情，支持游戏的五种语言。",
						href: "/files?view=c9s6",
					},
					{
						en: "The Answer in Chapter IX shows its map tile and links to the song.",
						zh: "第九章收藏品「答案」显示其地图图块，并链接到这首歌。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: { en: "Charts and Phira packs", zh: "谱面与 Phira 谱面包" },
				items: [
					{
						en: "Phira packs for charts the song list does not offer: Message SP (only in Chapter IX's Baseline Challenge) and 望影の方舟Six EZ, HD and IN Error (only during the Igallta unlock).",
						zh: "新增歌曲列表之外的谱面包：Message SP（仅在第九章 Baseline Challenge 中出现）与 望影の方舟Six EZ、HD、IN Error（仅在 Igallta 解锁过程中出现）。",
						href: "/phira",
					},
					{
						en: "Phira packs for the four Legacy charts, with their own difficulty and charter.",
						zh: "新增四首歌曲 Legacy 谱面的 Phira 谱面包，含其定数与谱师。",
						href: "/phira",
					},
					{
						en: "Pick these levels on the Phira page, or find them under Chart in Files.",
						zh: "可以在 Phira 页面选择这些难度，也可以在资源的「谱面」中找到。",
						href: "/phira",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复" },
				items: [
					{
						en: "Illustrations, music, videos and packs load faster: your browser and our CDN now keep them, and a link changes as soon as its file does. If something still looks out of date, use Refresh files at the bottom of any page.",
						zh: "曲绘、音乐、视频与谱面包加载更快：浏览器与 CDN 会缓存这些文件，文件一更新链接就会随之改变。如仍看到旧内容，可点击页面底部的「刷新文件缓存」。",
					},
					{
						en: "Files have tidier names: chart JSON sits in chart/<song>/ without the .0, and the 4/1, removed and old-version files are named after the game's own track ids. Links saved to the old names no longer work.",
						zh: "资源文件命名更统一：谱面 JSON 位于 chart/<曲目>/（不再带 .0），4/1、已移除与旧版本文件均以游戏的曲目 ID 命名。旧文件名的链接已失效。",
						href: "/files",
					},
					{
						en: "Language pickers fit on one line on phones.",
						zh: "语言选择栏在手机上改为单行显示。",
					},
					{
						en: "Fix slightly wrong transparency at the avatar edges.",
						zh: "修复头像边缘透明度的细微错误。",
					},
					{
						en: "The Video category in Files now lists only videos; the PV manifests moved to Other.",
						zh: "资源页的「视频」分类现在只列出视频文件，PV 清单文件移至「其他」。",
					},
				],
			},
		],
	},
];
