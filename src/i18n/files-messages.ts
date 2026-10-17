// The files pages' copy: passed to client parts as props, so the bundle every page loads leaves it out

export type FilesMessages = {
	files: {
		title: string;
		lede: string;
		searchLabel: string;
		searchPlaceholder: string;
		kindLabel: string;
		tabsLabel: string;
		tabs: { files: string; fools: string; removed: string; history: string };
		viewsLabel: string;
		views: { files: string; pv: string; collection: string; texts: string };
		breadcrumb: string;
		empty: string;
		loading: string;
		failed: string;
		none: string;
		matches: string;
		view: string;
		download: string;
		tooBig: string;
		previewFailed: string;
		showMore: string;
		file: string;
		newTab: string;
		listen: string;
		watch: string;
		illustrator: string;
		kinds: {
			all: string;
			jacket: string;
			low: string;
			blur: string;
			chart: string;
			json: string;
			music: string;
			video: string;
			avatar: string;
			info: string;
			collection: string;
			art: string;
			hidden: string;
			other: string;
		};
	};
	pv: {
		title: string;
		lede: string;
		unavailable: string;
		listLabel: string;
		playerLabel: string;
		download: string;
		event: string;
		noSound: string;
		playFailed: string;
		clipMissing: string;
		nowPlaying: string;
		overlay: string;
		overlayOff: string;
		overlayOn: string;
		overlayLevel: string;
		overlayLang: string;
		transcript: string;
		backToPlayer: string;
	};
	collection: {
		title: string;
		lede: string;
		unavailable: string;
		chaptersLabel: string;
		itemCount: string;
		other: string;
		clues: string;
		author: string;
		untranslated: string;
		empty: string;
		extraShort: string;
		pagerLabel: string;
		previous: string;
		next: string;
		onThisPage: string;
		textLang: string;
		search: string;
		searchLabel: string;
		searchPlaceholder: string;
		searchTitle: string;
		results: string;
		resultsOne: string;
		noResults: string;
		more: string;
		unlockLabel: string;
		osMode: string;
		osPhase: string;
		osMap: string;
		art: string;
		artOpen: string;
		artArea: string;
		before: string;
		tile: string;
		tileAlt: string;
		hiddenSong: string;
		unlock: {
			score: string;
			scoreOnly: string;
			accuracy: string;
			level: string;
			after: string;
			flags: string;
			from: string;
			raw: string;
			unlocked: string;
			reached: string;
		};
	};
	texts: {
		title: string;
		lede: string;
		unavailable: string;
		sectionsLabel: string;
		textLang: string;
		count: string;
		fallback: string;
		image: string;
		newTab: string;
		sections: Record<
			"tips" | "avatars" | "credits",
			{ name: string; lede: string }
		>;
	};
	deduction: {
		player: string;
		stageHint: string;
		startNote: string;
		mode: string;
		video: string;
		interactive: string;
	};
	c9s6: {
		title: string;
		lede: string;
		unavailable: string;
		level: string;
		tap: string;
		drag: string;
		hold: string;
		flick: string;
		notes: string;
		lines: string;
		bpm: string;
		music: string;
		musicLabel: string;
		downloads: string;
		pack: string;
		chart: string;
		musicFile: string;
		background: string;
		download: string;
		newTab: string;
		cutscene: string;
		cutsceneLede: string;
		cutsceneMissing: string;
		player: string;
		stageHint: string;
		play: string;
		startNote: string;
		back: string;
		next: string;
		restart: string;
		replay: string;
		pageOf: string;
		language: string;
		sound: string;
		fullscreen: string;
		exitFullscreen: string;
		ended: string;
		script: string;
	};
};

export const filesEn: FilesMessages = {
	files: {
		title: "Files",
		lede: "Search illustrations, chart packs, music, videos and info files, then view, play or download them.",
		searchLabel: "Search files",
		searchPlaceholder: "Title, nickname or file name",
		kindLabel: "Kind",
		tabsLabel: "File group",
		tabs: {
			files: "Assets",
			fools: "4/1 charts",
			removed: "Removed",
			history: "Old versions",
		},
		viewsLabel: "Sections",
		views: {
			texts: "Other resources",
			files: "Files",
			pv: "PV",
			collection: "Collection",
		},
		breadcrumb: "Breadcrumb",
		empty: "No files yet.",
		loading: "Loading files…",
		failed: "File list unavailable.",
		none: "No matches.",
		matches: "Showing {shown} of {total}",
		view: "View",
		download: "Download",
		tooBig: "This file is too large to preview.",
		previewFailed: "Couldn't preview this file.",
		showMore: "Show {n} more",
		file: "File",
		newTab: "(opens in a new tab)",
		listen: "Listen",
		illustrator: "Illustration: {name}",
		watch: "Watch",
		kinds: {
			all: "All",
			jacket: "Jacket",
			low: "Low",
			blur: "Blur",
			chart: "Chart",
			json: "Chart JSON",
			music: "Music",
			video: "Video",
			avatar: "Avatar",
			info: "Info",
			collection: "Collection",
			art: "Collection art",
			hidden: "Hidden song",
			other: "Other",
		},
	},
	pv: {
		title: "PV",
		lede: "The game's chapter and event videos, including the unlock PVs from earlier versions. Watch them here or download the MP4.",
		unavailable: "The video list is unavailable right now.",
		listLabel: "Videos",
		playerLabel: "Video player",
		download: "Download MP4",
		event: "{name} PV",
		noSound: "No sound",
		playFailed:
			"This video could not be played. You can still try the download.",
		clipMissing: "Unavailable",
		nowPlaying: "Now playing: {title}",
		overlay: "In-game overlay",
		overlayOff: "Off",
		overlayOn: "On",
		overlayLevel: "EZ to AT picks the difficulty shown on the song card.",
		overlayLang: "Captions in any of the game's five languages.",
		transcript: "Transcript",
		backToPlayer: "Back to player",
	},
	collection: {
		title: "Collection",
		lede: "Every item in the game's Collection, with its clues and text, filed under the chapters the game uses.",
		unavailable: "The collection is unavailable right now.",
		chaptersLabel: "Chapters",
		itemCount: "{n} items",
		other: "Other",
		clues: "Clues",
		author: "By {name}",
		untranslated:
			"Not translated into English in the game yet. This is the original Chinese.",
		empty: "Nothing is filed under this chapter.",
		extraShort: "Extra",
		pagerLabel: "More chapters",
		previous: "Previous chapter",
		next: "Next chapter",
		onThisPage: "On this page",
		textLang: "Text language",
		search: "Search",
		searchLabel: "Search the Collection",
		searchPlaceholder: "Search titles and text in every chapter",
		searchTitle: "Search the Collection",
		results: "{n} entries match “{q}”.",
		resultsOne: "1 entry matches “{q}”.",
		noResults: "Nothing in the Collection matches “{q}”.",
		more: "Showing the first {n}. Add words to narrow the search.",
		unlockLabel: "Unlock condition",
		osMode: "OS mode",
		osPhase: "Chapter 9 map · phase {n}",
		osMap: "Chapter 9 map",
		art: "Illustration: {title}",
		artOpen: "Enlarge the illustration for {title}",
		artArea: "Illustration, scroll to pan",
		before: "Before {name} is unlocked",
		tile: "Map tile",
		tileAlt: "Map tile for {title}",
		hiddenSong: "Hidden song: {name}",
		unlock: {
			score: "Score ≥ {n} on {chart}",
			scoreOnly: "Score ≥ {n}",
			accuracy: "Accuracy ≥ {n}% on {chart}",
			level: "an {level} chart",
			after: "Opens after {items}",
			flags: "Story progress: {items}",
			from: "Opens from {place}",
			raw: "Condition: {data}",
			unlocked: "unlocked",
			reached: "reached",
		},
	},
	texts: {
		title: "Other resources",
		lede: "The loading tips, every avatar and the About us staff roll. Story lines from outside the Collection are in the Collection, with their chapter.",
		unavailable: "This page isn't available right now.",
		sectionsLabel: "Sections",
		textLang: "Text language",
		count: "{n} lines",
		fallback:
			"The game has no version in this language, so this is the Simplified Chinese text.",
		image: "{title}, image {n}",
		newTab: "(opens in a new tab)",
		sections: {
			tips: {
				name: "Loading tips",
				lede: "The tips the loading screen picks from before a song. Each language has its own list.",
			},
			avatars: {
				name: "Avatars",
				lede: "Every avatar in the game, with its name.",
			},
			credits: {
				name: "Staff roll",
				lede: "The credits that scroll in Settings › About us.",
			},
		},
	},
	deduction: {
		player: "Deduction replay",
		stageHint:
			"Tap the picture, or press Space or Enter, to continue, as in the game.",
		startNote:
			"Plays the scene from the game's own pictures, sounds and timings.",
		mode: "Watch as",
		video: "Video",
		interactive: "Interactive",
	},
	c9s6: {
		title: "Hidden song",
		lede: "Hidden song unlocked from the passcode tile on the Chapter 9 phase 1 map. The game lists no credits or level for it.",
		unavailable: "The hidden song is unavailable right now.",
		level: "Level",
		tap: "Tap",
		drag: "Drag",
		hold: "Hold",
		flick: "Flick",
		notes: "Notes",
		lines: "Judge lines",
		bpm: "BPM",
		music: "Music",
		musicLabel: "Music: {name}",
		downloads: "Downloads",
		pack: "Phira pack",
		chart: "Chart (game JSON)",
		musicFile: "Music",
		background: "Background",
		download: "Download",
		newTab: "(opens in a new tab)",
		cutscene: "Cutscene",
		cutsceneLede:
			"The scene the game plays before this song, in any of its five languages. Nothing plays until you press Play, and sound stays off until you turn it on.",
		cutsceneMissing: "The cutscene is unavailable right now.",
		player: "Cutscene player",
		stageHint:
			"The right and left arrow keys also turn the pages, and selecting the picture goes to the next one.",
		play: "Play",
		startNote: "Sound is off. Turn it on with Sound.",
		back: "Back",
		next: "Next",
		restart: "Restart",
		replay: "Replay",
		pageOf: "Page {n} of {total}",
		language: "Text language",
		sound: "Sound",
		fullscreen: "Full screen",
		exitFullscreen: "Exit full screen",
		ended: "End of the cutscene.",
		script: "Full script",
	},
};

export const filesZh: FilesMessages = {
	files: {
		title: "资源",
		lede: "搜索曲绘、谱面包、音乐、视频和资料文件，在线查看、试听或下载。",
		searchLabel: "搜索文件",
		searchPlaceholder: "曲名、别名或文件名",
		kindLabel: "分类",
		tabsLabel: "文件分组",
		tabs: {
			files: "资源",
			fools: "4/1 特别谱面",
			removed: "已移除",
			history: "旧版本",
		},
		viewsLabel: "分区",
		views: { files: "资源", pv: "PV", collection: "收藏品", texts: "其他资源" },
		breadcrumb: "当前位置",
		empty: "暂时没有文件。",
		loading: "正在加载文件…",
		failed: "文件列表暂不可用。",
		none: "没有匹配的文件。",
		matches: "显示 {shown} / {total} 个",
		view: "查看",
		download: "下载",
		tooBig: "文件太大，无法预览。",
		previewFailed: "无法预览这个文件。",
		showMore: "再显示 {n} 个",
		file: "文件",
		newTab: "（在新标签页打开）",
		listen: "试听",
		illustrator: "曲绘：{name}",
		watch: "观看",
		kinds: {
			all: "全部",
			jacket: "曲绘",
			low: "低清",
			blur: "模糊",
			chart: "谱面",
			json: "谱面 JSON",
			music: "音乐",
			video: "视频",
			avatar: "头像",
			info: "资料",
			collection: "收藏品",
			art: "收藏品插图",
			hidden: "隐藏曲",
			other: "其他",
		},
	},
	pv: {
		title: "PV",
		lede: "游戏内的章节与活动视频，包含历代版本的解锁 PV。可在线观看，也可下载 MP4。",
		unavailable: "视频列表暂不可用。",
		listLabel: "视频",
		playerLabel: "视频播放器",
		download: "下载 MP4",
		event: "{name} PV",
		noSound: "无声",
		playFailed: "这个视频无法播放，可以试试下载。",
		clipMissing: "暂不可用",
		nowPlaying: "正在播放：{title}",
		overlay: "游戏内界面",
		overlayOff: "关闭",
		overlayOn: "开启",
		overlayLevel: "EZ 至 AT 选择曲目卡片上显示的难度。",
		overlayLang: "字幕可选游戏内的五种语言。",
		transcript: "字幕文本",
		backToPlayer: "回到播放器",
	},
	collection: {
		title: "收藏品",
		lede: "游戏内收藏品的全部内容，含线索与文本，按游戏中的章节分类。",
		unavailable: "收藏品暂不可用。",
		chaptersLabel: "章节",
		itemCount: "{n} 件",
		other: "其他",
		clues: "线索",
		author: "作者：{name}",
		untranslated: "游戏内暂无该语言的文本，显示的是中文原文。",
		empty: "这个章节下没有收藏品。",
		extraShort: "外传",
		pagerLabel: "更多章节",
		previous: "上一章",
		next: "下一章",
		onThisPage: "本页内容",
		textLang: "文本语言",
		search: "搜索",
		searchLabel: "搜索收藏品",
		searchPlaceholder: "搜索各章节收藏品的标题与正文",
		searchTitle: "搜索收藏品",
		results: "共 {n} 条与“{q}”匹配。",
		resultsOne: "共 1 条与“{q}”匹配。",
		noResults: "收藏品中没有与“{q}”匹配的内容。",
		more: "仅显示前 {n} 条，可增加关键词缩小范围。",
		unlockLabel: "解锁条件",
		osMode: "OS 模式",
		osPhase: "第九章地图 · 第 {n} 阶段",
		osMap: "第九章地图",
		art: "插图：{title}",
		artOpen: "放大「{title}」的插图",
		artArea: "插图，可滚动查看",
		before: "解锁 {name} 前",
		tile: "地图图块",
		tileAlt: "「{title}」的地图图块",
		hiddenSong: "隐藏曲：{name}",
		unlock: {
			score: "{chart} 得分 ≥ {n}",
			scoreOnly: "得分 ≥ {n}",
			accuracy: "{chart} 准确率 ≥ {n}%",
			level: "任意 {level} 谱面",
			after: "阅读 {items} 后开启",
			flags: "剧情进度：{items}",
			from: "来自 {place}",
			raw: "条件：{data}",
			unlocked: "已解锁",
			reached: "已到达",
		},
	},
	texts: {
		title: "其他资源",
		lede: "加载提示、全部头像，以及「关于我们」中的制作人员名单。收藏品之外的剧情文本已移至收藏品的对应章节。",
		unavailable: "此页面暂不可用。",
		sectionsLabel: "分类",
		textLang: "文本语言",
		count: "{n} 条",
		fallback: "游戏内没有该语言的版本，显示的是简体中文。",
		image: "{title}，图片 {n}",
		newTab: "（在新标签页打开）",
		sections: {
			tips: {
				name: "加载提示",
				lede: "进入曲目前，加载界面会从这里随机显示一条。每种语言有各自的列表。",
			},
			avatars: {
				name: "头像",
				lede: "游戏内的全部头像，以及它们的名称。",
			},
			credits: {
				name: "制作人员名单",
				lede: "设置 › 关于我们 中滚动显示的制作人员名单。",
			},
		},
	},
	deduction: {
		player: "推演回放",
		stageHint: "与游戏中一样，点击画面或按空格、回车键继续。",
		startNote: "使用游戏本身的图片、音效和时间重现这段剧情。",
		mode: "观看方式",
		video: "视频",
		interactive: "互动重播",
	},
	c9s6: {
		title: "隐藏曲",
		lede: "由第九章第一阶段地图上的密码图块解锁的隐藏曲。游戏没有给出它的制作人员与定数。",
		unavailable: "隐藏曲暂不可用。",
		level: "难度",
		tap: "Tap",
		drag: "Drag",
		hold: "Hold",
		flick: "Flick",
		notes: "物量",
		lines: "判定线",
		bpm: "BPM",
		music: "音乐",
		musicLabel: "音乐：{name}",
		downloads: "下载",
		pack: "Phira 谱面包",
		chart: "谱面（游戏 JSON）",
		musicFile: "音乐",
		background: "背景图",
		download: "下载",
		newTab: "（在新标签页打开）",
		cutscene: "过场剧情",
		cutsceneLede:
			"游戏在这首曲目之前播放的剧情，可切换五种语言。声音默认关闭。",
		cutsceneMissing: "过场剧情暂不可用。",
		player: "过场剧情播放器",
		stageHint: "也可以用左右方向键翻页，点按画面会翻到下一页。",
		play: "播放",
		startNote: "声音已关闭，可用「声音」按钮开启。",
		back: "上一页",
		next: "下一页",
		restart: "从头开始",
		replay: "重新播放",
		pageOf: "第 {n} 页，共 {total} 页",
		language: "文本语言",
		sound: "声音",
		fullscreen: "全屏",
		exitFullscreen: "退出全屏",
		ended: "过场剧情已结束。",
		script: "完整剧本",
	},
};
