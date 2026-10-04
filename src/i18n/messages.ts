export type Messages = {
	meta: { title: string; description: string };
	brand: string;
	skip: string;
	signIn: string;
	invite: string;
	signOut: string;
	signedIn: string;
	credit: { before: string; after: string; heart: string; name: string };
	locale: { en: string; zh: string; label: string };
	theme: { label: string };
	home: {
		kicker: string;
		title: string;
		lede: string;
		lookupsTitle: string;
		lookups: { name: string; blurb: string }[];
		footer: string;
		boardTitle: string;
		boardLede: string;
		showFull: string;
		openDesk: string;
	};
	notice: {
		body: string;
		coffee: string;
		dismiss: string;
	};
	nav: {
		cards: string;
		menu: string;
		tags: string;
		phira: string;
		files: string;
		score: string;
		b30: string;
		hisb30: string;
		info: string;
		x30: string;
		fc30: string;
	};
	score: {
		title: string;
		lede: string;
		chart: string;
		clearChart: string;
		searchPlaceholder: string;
		loadingCharts: string;
		chartsFailed: string;
		notes: string;
		notesShort: string;
		notesHint: string;
		target: string;
		mode: string;
		modeNormal: string;
		modeChallenge: string;
		challengeHint: string;
		plan: string;
		allSplits: string;
		perfect: string;
		good: string;
		badMiss: string;
		maxCombo: string;
		acc: string;
		exactScore: string;
		tip: string;
		roundingHint: string;
		noteAccuracy: string;
		none: string;
		nearest: string;
		useScore: string;
	};
	phira: {
		title: string;
		lede: string;
		searchPlaceholder: string;
		download: string;
		empty: string;
	};
	files: {
		title: string;
		lede: string;
		searchPlaceholder: string;
		kindLabel: string;
		empty: string;
		loading: string;
		failed: string;
		none: string;
		matches: string;
		view: string;
		download: string;
		close: string;
		tooBig: string;
		previewFailed: string;
		kinds: {
			all: string;
			jacket: string;
			low: string;
			blur: string;
			chart: string;
			avatar: string;
			info: string;
			other: string;
		};
	};
	manual: {
		title: string;
		lede: string;
		notice: string;
		playerName: string;
		playerNamePlaceholder: string;
		addChart: string;
		searchPlaceholder: string;
		empty: string;
		acc: string;
		score: string;
		scoreEstimated: string;
		fc: string;
		rks: string;
		remove: string;
		charts: string;
		save: string;
		saving: string;
		saveFailed: string;
		edit: string;
		clear: string;
		clearConfirm: string;
		clearing: string;
		clearFailed: string;
		deskNote: string;
		badge: string;
		invalid: string;
	};
	tags: {
		title: string;
		lede: string;
		empty: string;
	};
	me: {
		title: string;
		banned: string;
		rks: string;
		lastSynced: string;
		cachedSave: string;
	};
	bind: {
		title: string;
		lede: string;
		server: string;
		cn: string;
		gb: string;
		qr: string;
		cancel: string;
		starting: string;
		waitingTap: string;
		scan: string;
		scanned: string;
		openPhone: string;
		expires: string;
		qrAlt: string;
		tokenLabel: string;
		tokenPlaceholder: string;
		tokenHint: string;
		tokenSubmit: string;
		or: string;
		failed: string;
		manualTitle: string;
		manualLede: string;
		manualStart: string;
		unbind: string;
		unbindConfirm: string;
		unbindYes: string;
		unbindNo: string;
		unbinding: string;
		unbindFailed: string;
	};
	public: { hint: string };
	card: {
		charts: string;
		quality: string;
		qualityFast: string;
		qualityHigh: string;
		download: string;
		tagProfile: string;
		rendering: string;
		renderFailed: string;
		unreachable: string;
		alt: string;
		titles: Record<"b30" | "x30" | "fc30" | "hisb30" | "info", string>;
		stats: string;
		statsHit: string;
		statsMiss: string;
		statsCache: string;
		statsStoreR2: string;
		statsStoreKv: string;
		statsRender: string;
		statsHeight: string;
		statsLookup: string;
		statsData: string;
		statsHtml: string;
		statsAssets: string;
		statsMeasure: string;
		statsRaster: string;
		statsEncode: string;
		statsPaint: string;
		statsServer: string;
		statsWait: string;
		statsHintCache: string;
		statsHintHeight: string;
		statsHintLookup: string;
		statsHintData: string;
		statsHintHtml: string;
		statsHintAssets: string;
		statsHintMeasure: string;
		statsHintRaster: string;
		statsHintEncode: string;
		statsHintPaint: string;
		statsHintServer: string;
		statsHintWait: string;
		statsHintStoreR2: string;
		statsHintStoreKv: string;
		statsHintRender: string;
	};
	refresh: {
		save: string;
		pending: string;
		waitingTap: string;
		wait: string;
		failed: string;
		bypass: string;
		bypassPending: string;
		bypassFailed: string;
	};
	share: {
		menu: string;
		creating: string;
		link: string;
		copy: string;
		copied: string;
		revoke: string;
	};
	notFound: { title: string; body: string };
	errors: {
		unauthorized: string;
		unknown_card: string;
		not_bound: string;
		banned: string;
		no_save: string;
		refresh_cooldown: string;
		cache_bypass_cooldown: string;
		refresh_failed: string;
		rate_limit: string;
		share_not_found: string;
		profile_unavailable: string;
		render_failed: string;
		already_bound: string;
		invalid_token: string;
		qr_busy: string;
		qr_expired: string;
		qr_missing: string;
		bind_failed: string;
		unbind_failed: string;
		tapapi_unavailable: string;
	};
};

export const en: Messages = {
	meta: {
		title: "PhiBot",
		description:
			"Look up your Phigros B30, history, and player info. The same cards as the Discord bot.",
	},
	brand: "PhiBot",
	skip: "Skip to content",
	signIn: "Continue with Discord",
	invite: "Add to Discord",
	signOut: "Sign out",
	signedIn: "signed in",
	credit: {
		before: "Made with",
		after: "by",
		heart: "love",
		name: "MiyukiYue",
	},
	locale: { en: "EN", zh: "中文", label: "Language" },
	theme: { label: "Color theme" },
	home: {
		kicker: "PhiBot",
		title: "After the last chart.",
		lede: "Open your B30 on your phone. Sign in, then bind TapTap here.",
		lookupsTitle: "Lookups",
		lookups: [
			{ name: "B30", blurb: "Best 30, plus three phi slots." },
			{ name: "History", blurb: "Recent score updates and your RKS trend." },
			{ name: "Info", blurb: "Name, RKS, player card." },
			{ name: "x30", blurb: "Best if a 1-Good still counts." },
			{ name: "fc30", blurb: "Best Full Combo charts." },
		],
		footer:
			"PhiBot draws Phigros cards from a save bound to your Discord login.",
		boardTitle: "Your B30, drawn for you",
		boardLede:
			"Player card, best 30 with overflow, and an RKS breakdown in one image. Run /b30 in Discord or open it here.",
		showFull: "See the full render",
		openDesk: "Open your cards",
	},
	notice: {
		body: "Image generation and loading is sped up by the Vercel Pro plan, as we can select multiple function regions. Consider buying me a cup of coffee.",
		coffee: "Buy me a coffee",
		dismiss: "Got it",
	},
	nav: {
		cards: "Cards",
		menu: "Pages",
		tags: "Tags",
		phira: "Phira",
		files: "Files",
		score: "Score control",
		b30: "B30",
		hisb30: "History",
		info: "Info",
		x30: "x30",
		fc30: "fc30",
	},
	score: {
		title: "Score control",
		lede: "Find the Perfect / Good / Bad·Miss split and the max combo that land exactly on a target score.",
		chart: "Chart",
		clearChart: "Clear chart",
		searchPlaceholder: "Search a song to fill in its note count…",
		loadingCharts: "Loading chart list…",
		chartsFailed: "Chart list unavailable. Type the note count instead.",
		notes: "Notes",
		notesShort: "notes",
		notesHint: "Total notes in the chart. Picking a song fills it in.",
		target: "Target score",
		mode: "Mode",
		modeNormal: "Normal",
		modeChallenge: "Challenge",
		challengeHint:
			"Challenge mode scores judgements only, so combo does not matter.",
		plan: "Closest split",
		allSplits: "All splits ({n})",
		perfect: "Perfect",
		good: "Good",
		badMiss: "Bad / Miss",
		maxCombo: "Max combo",
		acc: "Accuracy",
		exactScore: "Exact score",
		tip: "Sorted by distance to the target, then fewest Goods, then a max combo close to the Perfect count.",
		roundingHint:
			"The game shows a whole number but does not always round the exact score to the nearest one (1671 notes, FC with 5 Goods is 999057.45 and shows as 999058). Every split within 1 point of the target is listed with its exact score and offset.",
		noteAccuracy:
			"Accuracy is shown in full. In game and on the cards it is rounded to two decimals; the save keeps more digits.",
		none: "No split lands within 1 point of {score} on this chart.",
		nearest: "Closest reachable",
		useScore: "Use {score}",
	},
	phira: {
		title: "Phira chart",
		lede: "Search a song and download one difficulty as a .pez pack.",
		searchPlaceholder: "Search a song…",
		download: "Download .pez",
		empty: "Pick a song to see its difficulties.",
	},
	files: {
		title: "Files",
		lede: "Search illustrations, chart packs, and info files, then view or download them.",
		searchPlaceholder: "Song or file name…",
		kindLabel: "Kind",
		empty: "Type a name, or choose a kind to browse.",
		loading: "Loading files…",
		failed: "File list unavailable.",
		none: "No matches.",
		matches: "matches",
		view: "View",
		download: "Download",
		close: "Close",
		tooBig: "This file is too large to preview.",
		previewFailed: "Couldn't preview this file.",
		kinds: {
			all: "All",
			jacket: "Jacket",
			low: "Low",
			blur: "Blur",
			chart: "Chart",
			avatar: "Avatar",
			info: "Info",
			other: "Other",
		},
	},
	manual: {
		title: "Manual scores",
		lede: "Type each chart's accuracy — the two decimals the game shows, or the exact value if you have it. Score and FC are optional; a blank score is estimated from the accuracy.",
		notice:
			"Accuracy typed with two decimals is what the game shows, not the exact value it stores, so RKS drawn from it can differ slightly from the in-game value.",
		playerName: "Player name",
		playerNamePlaceholder: "Shown on the cards",
		addChart: "Add a chart",
		searchPlaceholder: "Search a song, then pick a difficulty…",
		empty: "No charts yet. Search above to add one.",
		acc: "ACC %",
		score: "Score",
		scoreEstimated: "estimated",
		fc: "FC",
		rks: "RKS",
		remove: "Remove",
		charts: "{n} charts",
		save: "Save and draw cards",
		saving: "Saving…",
		saveFailed: "Could not save.",
		edit: "Edit scores",
		clear: "Delete manual scores",
		clearConfirm: "Delete every manually entered score for this Discord login?",
		clearing: "Deleting…",
		clearFailed: "Could not delete.",
		deskNote:
			"Manual mode: cards are drawn from the accuracy you typed. If it was the two-decimal in-game figure, RKS here is approximate.",
		badge: "Manual",
		invalid:
			"Check the highlighted rows: accuracy is 0–100 and score is 0–1000000.",
	},
	tags: {
		title: "Chart tags",
		lede: "Labels on the B30 tag profile. Descriptions come from phib19.",
		empty: "The tag list is not available right now.",
	},
	me: {
		title: "Your cards",
		banned: "This account is banned. Cards are not available.",
		rks: "RKS",
		lastSynced: "Last synced",
		cachedSave: "cached save",
	},
	bind: {
		title: "Bind Phigros",
		lede: "Scan TapTap with the account Phigros uses, or paste the 25-character code. Do not share it.",
		server: "Server",
		cn: "CN",
		gb: "Global",
		qr: "Scan TapTap",
		cancel: "Cancel",
		starting: "Getting QR…",
		waitingTap: "Waiting for TapTap…",
		scan: "Scan with TapTap.",
		scanned: "QR scanned. Confirm on your phone.",
		openPhone: "Open on this phone",
		expires: "Expires in {seconds}s",
		qrAlt: "TapTap login QR code",
		tokenLabel: "sessionToken",
		tokenPlaceholder: "25 characters",
		tokenHint: "Stays on the server. Never pasted into chat.",
		tokenSubmit: "Bind code",
		or: "or",
		failed: "Bind failed.",
		manualTitle: "No account mode",
		manualLede:
			"Skip TapTap. Type the accuracy you see in game for each chart and the same cards are drawn from that.",
		manualStart: "Enter scores by hand",
		unbind: "Unbind",
		unbindConfirm: "Remove the Phigros bind from this Discord login?",
		unbindYes: "Unbind",
		unbindNo: "Keep",
		unbinding: "Unbinding…",
		unbindFailed: "Could not unbind.",
	},
	public: {
		hint: "This is a public copy of their cards. Opening the page does not refresh their save.",
	},
	card: {
		charts: "Charts",
		quality: "Quality",
		qualityFast: "Faster · normal",
		qualityHigh: "High quality · slower",
		download: "Download JPEG",
		tagProfile: "Tag profile",
		rendering: "Rendering card…",
		renderFailed: "Could not render this card.",
		unreachable: "Could not reach the render server.",
		alt: "{name} card",
		titles: {
			b30: "B30",
			x30: "x30 (1-Good)",
			fc30: "fc30 (Full Combo)",
			hisb30: "Score history",
			info: "Player info",
		},
		stats: "Timing",
		statsHit: "Hit",
		statsMiss: "Miss",
		statsCache: "JPEG",
		statsStoreR2: "R2",
		statsStoreKv: "KV",
		statsRender: "Render",
		statsHeight: "Height",
		statsLookup: "Cache lookup",
		statsData: "Data",
		statsHtml: "HTML",
		statsAssets: "Assets",
		statsMeasure: "Measure",
		statsRaster: "Raster",
		statsEncode: "Encode",
		statsPaint: "Paint",
		statsServer: "Server",
		statsWait: "Request",
		statsHintCache:
			"Finished JPEG. Hit returns the stored image. Miss paints it this request. Same save, language, and quality reuse it.",
		statsHintHeight:
			"Pixel height of this layout. Hit skips measuring. Same save, language, and quality reuse it.",
		statsHintLookup: "Time spent looking up the stored JPEG.",
		statsHintData: "Loading save data, catalog, and chart tags.",
		statsHintHtml: "Building the card HTML.",
		statsHintAssets: "Loading jackets, fonts, and other images.",
		statsHintMeasure:
			"Measuring how tall the card is. Skipped when height cache hits.",
		statsHintRaster: "Painting the card into pixels.",
		statsHintEncode: "Encoding the JPEG.",
		statsHintPaint: "Measure, raster, and encode together.",
		statsHintServer: "Server time for this request.",
		statsHintWait: "Your wait, including download.",
		statsHintStoreR2: "Served from R2 object storage.",
		statsHintStoreKv: "Served from KV.",
		statsHintRender: "Cache miss — this JPEG was painted now.",
	},
	refresh: {
		save: "Refresh save",
		pending: "Refreshing…",
		waitingTap: "Waiting for TapTap…",
		wait: "Wait {seconds}s",
		failed: "Refresh failed.",
		bypass: "Bypass cache",
		bypassPending: "Bypassing…",
		bypassFailed: "Could not bypass cache.",
	},
	share: {
		menu: "Share",
		creating: "Creating…",
		link: "Public link",
		copy: "Copy",
		copied: "Copied",
		revoke: "Stop sharing",
	},
	notFound: {
		title: "Not found",
		body: "This page or share link does not exist.",
	},
	errors: {
		unauthorized: "unauthorized",
		unknown_card: "unknown card",
		not_bound: "No Phigros account is bound.",
		banned: "This account is banned.",
		no_save: "No cached save yet. Use Refresh on this site.",
		refresh_cooldown:
			"Refresh is on cooldown. Try again in a couple of minutes.",
		cache_bypass_cooldown:
			"Cache bypass is on cooldown. Try again in a few minutes.",
		refresh_failed: "Refresh failed.",
		rate_limit: "Too many requests. Wait a minute.",
		share_not_found: "share link not found",
		profile_unavailable: "profile unavailable",
		render_failed: "Could not render this card.",
		already_bound: "An account is already bound. Unbind first.",
		invalid_token: "That is not a 25-character sessionToken.",
		qr_busy: "A QR bind is already running.",
		qr_expired: "QR expired. Scan again.",
		qr_missing: "No QR session. Scan again.",
		bind_failed: "Bind failed.",
		unbind_failed: "Could not unbind.",
		tapapi_unavailable:
			"TapTap's cloud (TapAPI) timed out. This is TapTap's problem, not PhiBot. Try again in a few minutes.",
	},
};

export const zh: Messages = {
	meta: {
		title: "PhiBot",
		description:
			"查询你的 Phigros B30、历史成绩和玩家信息。和 Discord 机器人同一套成绩图",
	},
	brand: "PhiBot",
	skip: "跳到正文",
	signIn: "使用 Discord 继续",
	invite: "邀请到 Discord",
	signOut: "退出",
	signedIn: "已登录",
	credit: { before: "用", after: "打造 ·", heart: "心", name: "MiyukiYue" },
	locale: { en: "EN", zh: "中文", label: "语言" },
	theme: { label: "颜色主题" },
	home: {
		kicker: "PhiBot",
		title: "打完最后一首",
		lede: "用手机看 B30。登录后在本页绑定 TapTap",
		lookupsTitle: "能查什么",
		lookups: [
			{ name: "B30", blurb: "最好的 30 首，外加三个 AP" },
			{ name: "历史", blurb: "最近更新的成绩和 RKS 走势" },
			{ name: "Info", blurb: "名字、RKS、玩家信息" },
			{ name: "x30", blurb: "算上 1 Good 时最好的谱" },
			{ name: "fc30", blurb: "Full Combo 最好的谱" },
		],
		footer: "PhiBot 用绑定到你 Discord 登录的存档出 Phigros 成绩图",
		boardTitle: "一张图看完你的 B30",
		boardLede:
			"玩家信息、Best 30 与溢出曲目、RKS 分析全在一张图里。在 Discord 里发 /b30，或直接在这里查看",
		showFull: "查看完整成绩图",
		openDesk: "查看成绩图",
	},
	notice: {
		body: "Image 生成和加载因 Vercel Pro 变得更快了。请考虑支持我一下😭",
		coffee: "请我喝杯咖啡",
		dismiss: "知道了",
	},
	nav: {
		cards: "成绩图",
		menu: "页面",
		tags: "标签",
		phira: "Phira",
		files: "资源",
		score: "控分",
		b30: "B30",
		hisb30: "历史",
		info: "信息",
		x30: "x30",
		fc30: "fc30",
	},
	score: {
		title: "控分计算",
		lede: "根据谱面物量和目标分数，算出恰好达成所需的 Perfect / Good / Bad·Miss 数量和最大连击。",
		chart: "谱面",
		clearChart: "清除谱面",
		searchPlaceholder: "搜索曲目，自动填入物量…",
		loadingCharts: "正在加载曲目列表…",
		chartsFailed: "曲目列表暂不可用，请手动输入物量。",
		notes: "物量",
		notesShort: "物量",
		notesHint: "谱面总物量。选择曲目后会自动填入。",
		target: "目标分数",
		mode: "模式",
		modeNormal: "普通",
		modeChallenge: "课题模式",
		challengeHint: "课题模式只计判定分，不看连击。",
		plan: "最接近的方案",
		allSplits: "全部方案（{n}）",
		perfect: "Perfect",
		good: "Good",
		badMiss: "Bad / Miss",
		maxCombo: "最大连击",
		acc: "准确率",
		exactScore: "精确分数",
		tip: "按与目标分数的差距排序，其次 Good 越少越优先，再看最大连击是否接近 Perfect 数。",
		roundingHint: "游戏显示的是整数，但并不总是对精确分数四舍五入",
		noteAccuracy:
			"准确率按完整精度显示。游戏内和成绩图只显示两位小数，存档中保留更多位数。",
		none: "该谱面没有与 {score} 分相差 1 分以内的方案。",
		nearest: "最接近的可达分数",
		useScore: "改为 {score}",
	},
	phira: {
		title: "Phira 谱面",
		lede: "搜索曲目，按难度下载 .pez 包。",
		searchPlaceholder: "搜索曲目…",
		download: "下载 .pez",
		empty: "选择一首曲目后会列出各难度。",
	},
	files: {
		title: "资源",
		lede: "搜索曲绘、谱面包和资料文件，在线查看或下载。",
		searchPlaceholder: "曲名或文件名…",
		kindLabel: "分类",
		empty: "输入名称，或选择分类浏览。",
		loading: "正在加载文件…",
		failed: "文件列表暂不可用。",
		none: "没有匹配的文件。",
		matches: "个结果",
		view: "查看",
		download: "下载",
		close: "关闭",
		tooBig: "文件太大，无法预览。",
		previewFailed: "无法预览这个文件。",
		kinds: {
			all: "全部",
			jacket: "曲绘",
			low: "低清",
			blur: "模糊",
			chart: "谱面",
			avatar: "头像",
			info: "资料",
			other: "其他",
		},
	},
	manual: {
		title: "手动录入成绩",
		lede: "逐谱面填写准确率：可以填游戏内显示的两位小数，也可以填已知的精确值。分数和 FC 可选；分数留空时按准确率估算。",
		notice:
			"按两位小数填写的准确率只是游戏显示值，并非存档中的精确值，因此据此算出的 RKS 可能与游戏内略有差异。",
		playerName: "玩家名",
		playerNamePlaceholder: "显示在成绩图上",
		addChart: "添加谱面",
		searchPlaceholder: "搜索曲目，再选择难度…",
		empty: "还没有谱面。在上方搜索添加。",
		acc: "ACC %",
		score: "分数",
		scoreEstimated: "估算",
		fc: "FC",
		rks: "RKS",
		remove: "删除",
		charts: "{n} 张谱面",
		save: "保存并出图",
		saving: "正在保存…",
		saveFailed: "保存失败。",
		edit: "编辑成绩",
		clear: "删除手动成绩",
		clearConfirm: "删除这个 Discord 登录下所有手动录入的成绩？",
		clearing: "正在删除…",
		clearFailed: "无法删除。",
		deskNote:
			"手动模式：成绩图由你填写的准确率生成。若填的是游戏显示的两位小数，RKS 为近似值。",
		badge: "手动",
		invalid: "请检查高亮的行：准确率范围 0–100，分数范围 0–1000000。",
	},
	tags: {
		title: "谱面标签",
		lede: "B30 标签画像用的分类。说明来自 phib19。",
		empty: "暂时无法加载标签列表。",
	},
	me: {
		title: "你的成绩",
		banned: "这个账号已被封禁，无法查看成绩图",
		rks: "RKS",
		lastSynced: "上次同步",
		cachedSave: "缓存存档",
	},
	bind: {
		title: "绑定 Phigros",
		lede: "用 Phigros 登录的那个 TapTap 扫码，或粘贴 25 位代码。不要发给别人。",
		server: "区服",
		cn: "国服",
		gb: "国际服",
		qr: "扫 TapTap",
		cancel: "取消",
		starting: "正在取码…",
		waitingTap: "正在等待 TapTap…",
		scan: "请用 TapTap 扫码。",
		scanned: "已扫码。请在手机上确认。",
		openPhone: "在这台手机上打开",
		expires: "{seconds} 秒后失效",
		qrAlt: "TapTap 登录二维码",
		tokenLabel: "sessionToken",
		tokenPlaceholder: "25 位",
		tokenHint: "只留在服务器。不要发到聊天里。",
		tokenSubmit: "用代码绑定",
		or: "或",
		failed: "绑定失败。",
		manualTitle: "无账号模式",
		manualLede:
			"不用 TapTap。按游戏内显示逐谱面填写准确率，就能生成同样的成绩图。",
		manualStart: "手动录入成绩",
		unbind: "解绑",
		unbindConfirm: "从这个 Discord 登录解除 Phigros 绑定？",
		unbindYes: "解绑",
		unbindNo: "取消",
		unbinding: "正在解绑…",
		unbindFailed: "无法解绑。",
	},
	public: {
		hint: "这是他们成绩图的公开副本。打开页面不会刷新存档。",
	},
	card: {
		charts: "谱面数",
		quality: "画质",
		qualityFast: "更快 · 普通",
		qualityHigh: "高画质 · 较慢",
		download: "下载 JPEG",
		tagProfile: "谱面标签",
		rendering: "正在出图…",
		renderFailed: "无法生成这张成绩图",
		unreachable: "无法连接到出图服务",
		alt: "{name} 成绩图",
		titles: {
			b30: "B30",
			x30: "x30（1 Good）",
			fc30: "fc30（Full Combo）",
			hisb30: "成绩历史",
			info: "玩家信息",
		},
		stats: "耗时",
		statsHit: "命中",
		statsMiss: "未命中",
		statsCache: "JPEG",
		statsStoreR2: "R2",
		statsStoreKv: "KV",
		statsRender: "渲染",
		statsHeight: "高度",
		statsLookup: "缓存查找",
		statsData: "数据",
		statsHtml: "HTML",
		statsAssets: "资源",
		statsMeasure: "测量",
		statsRaster: "栅格",
		statsEncode: "编码",
		statsPaint: "绘制",
		statsServer: "服务端",
		statsWait: "请求",
		statsHintCache:
			"成品 JPEG。命中直接返回已存图片；未命中则当场绘制。存档、语言、画质不变即可复用。",
		statsHintHeight:
			"这张图的像素高度。命中可跳过测量。存档、语言、画质不变即可复用。",
		statsHintLookup: "查找已存 JPEG 的耗时。",
		statsHintData: "加载存档、曲目目录和谱面标签。",
		statsHintHtml: "生成卡片 HTML。",
		statsHintAssets: "加载曲绘、字体和其他图片。",
		statsHintMeasure: "测量卡片高度。高度缓存命中时可跳过。",
		statsHintRaster: "把卡片画成像素。",
		statsHintEncode: "编码 JPEG。",
		statsHintPaint: "测量、栅格和编码合计。",
		statsHintServer: "本次请求的服务端耗时。",
		statsHintWait: "等到图片的总时间，含下载。",
		statsHintStoreR2: "从 R2 对象存储读取。",
		statsHintStoreKv: "从 KV 读取。",
		statsHintRender: "缓存未命中，这次当场绘制。",
	},
	refresh: {
		save: "刷新存档",
		pending: "正在刷新…",
		waitingTap: "正在等待 TapTap…",
		wait: "请等待 {seconds} 秒",
		failed: "刷新失败",
		bypass: "绕过缓存",
		bypassPending: "正在重绘…",
		bypassFailed: "无法绕过缓存",
	},
	share: {
		menu: "分享",
		creating: "正在生成…",
		link: "公开链接",
		copy: "复制",
		copied: "已复制",
		revoke: "停止分享",
	},
	notFound: {
		title: "未找到",
		body: "该页面或分享链接不存在",
	},
	errors: {
		unauthorized: "未登录",
		unknown_card: "未知成绩图",
		not_bound: "尚未绑定 Phigros。",
		banned: "这个账号已被封禁",
		no_save: "还没有缓存存档。请在本页刷新",
		refresh_cooldown: "刷新仍在冷却中 请稍后再试",
		cache_bypass_cooldown: "绕过缓存仍在冷却中 请稍后再试",
		refresh_failed: "刷新失败",
		rate_limit: "请求过于频繁，请稍等一分钟",
		share_not_found: "分享链接不存在",
		profile_unavailable: "无法显示该主页",
		render_failed: "无法生成这张成绩图",
		already_bound: "已经绑定过账号 请先解绑",
		invalid_token: "这不是 25 位 sessionToken",
		qr_busy: "已有扫码绑定正在进行",
		qr_expired: "二维码已过期，请重新扫码",
		qr_missing: "没有进行中的扫码，请重新扫码",
		bind_failed: "绑定失败",
		unbind_failed: "无法解绑",
		tapapi_unavailable:
			"TapTap 云端（TapAPI）超时了。这是 TapTap 的问题，不是本站故障。请稍后再试",
	},
};
