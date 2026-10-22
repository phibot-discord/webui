import type { ChangeRelease } from "./changelog";

/** Every release's items, newest first, loaded only when the dialog opens */
export const CHANGELOG_RELEASES: ChangeRelease[] = [
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
