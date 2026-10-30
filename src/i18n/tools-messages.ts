export type ToolsMessages = {
	exportRecords: {
		csv: string;
		json: string;
		hint: string;
	};
	badge: {
		title: string;
		hint: string;
		alt: string;
		copy: string;
		copyHtml: string;
		copied: string;
		styleLabel: string;
		styles: Record<
			"flat" | "flat-square" | "for-the-badge" | "rks" | "card" | "card-dark",
			string
		>;
	};
	targets: {
		title: string;
		lede: string;
		now: string;
		next: string;
		goalNote: string;
		levels: string;
		unplayed: string;
		sortLabel: string;
		sort: Record<"gap" | "need" | "constant" | "ap", string>;
		song: string;
		level: string;
		constant: string;
		acc: string;
		target: string;
		gap: string;
		apGain: string;
		apOnly: string;
		notPlayed: string;
		more: string;
		count: string;
		none: string;
		stuck: string;
		empty: string;
	};
	progress: {
		title: string;
		lede: string;
		showLabel: string;
		show: Record<"clear" | "fc" | "ap", string>;
		constant: string;
		total: string;
		cell: string;
		status: Record<"ap" | "fc" | "clear" | "played" | "none", string>;
		statusCol: string;
		listTitle: string;
		listTitleAll: string;
		pick: string;
		song: string;
		acc: string;
		score: string;
		legend: string;
		empty: string;
	};
	trend: {
		title: string;
		lede: string;
		range: string;
		ranges: Record<"m1" | "m3" | "y1" | "all", string>;
		chartLabel: string;
		change: string;
		tableTitle: string;
		date: string;
		rks: string;
		improvedTitle: string;
		improvedLede: string;
		firstPlay: string;
		song: string;
		level: string;
		before: string;
		after: string;
		more: string;
		empty: string;
		one: string;
		noImproved: string;
	};
	songPage: {
		back: string;
		composer: string;
		illustrator: string;
		chapter: string;
		bpm: string;
		length: string;
		nicknames: string;
		levelsTitle: string;
		level: string;
		constant: string;
		notes: string;
		charter: string;
		kinds: string;
		toolsTitle: string;
		phira: string;
		score: string;
		songCard: string;
		yoursTitle: string;
		yoursSignedOut: string;
		signIn: string;
		yoursNotBound: string;
		yoursNone: string;
		acc: string;
		scoreCol: string;
		rks: string;
		rank: string;
		rankOf: string;
		rankLoading: string;
		rankFailed: string;
		notPlayed: string;
		jacketAlt: string;
		levelJacket: string;
		description: string;
	};
	chartVersions: {
		title: string;
		lede: string;
		none: string;
		versions: string;
		current: string;
		compareTitle: string;
		level: string;
		from: string;
		to: string;
		loading: string;
		failed: string;
		notes: string;
		duration: string;
		peak: string;
		lines: string;
		bpm: string;
		change: string;
		kind: Record<"tap" | "drag" | "hold" | "flick", string>;
		densityTitle: string;
		densityLabel: string;
		diffTitle: string;
		diffLabel: string;
		more: string;
		fewer: string;
		same: string;
		changed: string;
		readout: string;
		readoutHint: string;
	};
	compare: {
		title: string;
		lede: string;
		a: string;
		b: string;
		placeholder: string;
		useMine: string;
		submit: string;
		hint: string;
		unavailable: string;
		bad: string;
		signin: string;
		rks: string;
		challenge: string;
		levelsTitle: string;
		played: string;
		clear: string;
		fc: string;
		ap: string;
		h2hTitle: string;
		h2hSummary: string;
		ties: string;
		only: string;
		filter: string;
		filters: Record<"all" | "a" | "b", string>;
		song: string;
		level: string;
		constant: string;
		gap: string;
		more: string;
		none: string;
		bestTitle: string;
		optIn: string;
		optInHint: string;
		optInFailed: string;
		openCompare: string;
		compareWith: string;
	};
	guess: {
		title: string;
		lede: string;
		daily: string;
		practice: string;
		modeLabel: string;
		dailyOf: string;
		practiceLabel: string;
		clue: string;
		imageAlt: string;
		inputLabel: string;
		placeholder: string;
		submit: string;
		giveUp: string;
		wrong: string;
		won: string;
		lost: string;
		openSong: string;
		share: string;
		copied: string;
		newPractice: string;
		tomorrow: string;
		already: string;
		noMatch: string;
		results: string;
		failed: string;
		guesses: string;
		howTitle: string;
		how: string[];
		shareLabel: string;
		start: string;
		startHint: string;
		time: string;
		rankMe: string;
		rankHint: string;
		signInToRank: string;
		signIn: string;
		boardTitle: string;
		boardTitleDay: string;
		boardLede: string;
		boardEmpty: string;
		boardFailed: string;
		boardPlayer: string;
		boardTries: string;
		boardTime: string;
		boardYou: string;
		boardMine: string;
		boardMore: string;
		wonIn: string;
	};
};

export const toolsEn: ToolsMessages = {
	exportRecords: {
		csv: "Download as CSV",
		json: "Download as JSON",
		hint: "Every chart you have played, from the save PhiBot holds now. CSV opens in Excel, Numbers or Google Sheets.",
	},
	badge: {
		title: "RKS badge",
		hint: "A small image with your name and RKS for a GitHub profile or a forum signature. It links to this share page and stops working when you turn sharing off.",
		alt: "Your RKS badge",
		copy: "Copy Markdown",
		copyHtml: "Copy HTML",
		copied: "Copied",
		styleLabel: "Style",
		styles: {
			flat: "Flat",
			"flat-square": "Flat square",
			"for-the-badge": "Large",
			rks: "RKS only",
			card: "Card, light",
			"card-dark": "Card, dark",
		},
	},
	targets: {
		title: "Next targets",
		lede: "The accuracy each chart needs to raise your RKS by one step, worked out from the save PhiBot holds.",
		now: "Now",
		next: "Next step",
		goalNote:
			"Phigros shows RKS to two decimals. Yours has to reach {goal} to show {shown}; each target below gets it there on its own.",
		levels: "Levels",
		unplayed: "Include charts you have not played",
		sortLabel: "Sort by",
		sort: {
			gap: "Smallest gap",
			need: "Lowest target",
			constant: "Highest constant",
			ap: "Biggest gain from an AP",
		},
		song: "Song",
		level: "Level",
		constant: "Constant",
		acc: "Your accuracy",
		target: "Target",
		gap: "Gap",
		apGain: "Gain if AP",
		apOnly: "AP only",
		notPlayed: "Not played",
		more: "Show {n} more",
		count: "{shown} of {total} charts",
		none: "No chart matches these filters.",
		stuck:
			"{n} other charts cannot raise your RKS to the next step, not even with an AP.",
		empty: "Play a few charts first: there is nothing to work from yet.",
	},
	progress: {
		title: "Progress",
		lede: "How much of each difficulty you have cleared, full combo'd and All Perfect'd, by chart constant.",
		showLabel: "Count",
		show: { clear: "Cleared", fc: "Full combo", ap: "All Perfect" },
		constant: "Constant",
		total: "All",
		cell: "{level}, constant {constant}: {n} of {total} {what}",
		status: {
			ap: "AP",
			fc: "FC",
			clear: "Cleared",
			played: "Played",
			none: "Not played",
		},
		statusCol: "Status",
		listTitle: "{level}, constant {constant}",
		listTitleAll: "{level}, all constants",
		pick: "Pick a cell to list its charts.",
		song: "Song",
		acc: "Accuracy",
		score: "Score",
		legend: "The fuller the cell, the closer that group is to done.",
		empty: "No charts are loaded yet. Try again in a minute.",
	},
	trend: {
		title: "RKS trend",
		lede: "Your RKS each time PhiBot read your save, and the scores that went up.",
		range: "Range",
		ranges: { m1: "1 month", m3: "3 months", y1: "1 year", all: "All" },
		chartLabel: "RKS from {from} to {to}",
		change: "{delta} in this range",
		tableTitle: "Show the readings as a table",
		date: "Date",
		rks: "RKS",
		improvedTitle: "Recent improvements",
		improvedLede: "Scores that went up, newest first.",
		firstPlay: "First play",
		song: "Song",
		level: "Level",
		before: "Before",
		after: "After",
		more: "Show {n} more",
		empty:
			"No history yet. PhiBot records your RKS each time it reads your save, so press Refresh after you play.",
		one: "Only one reading so far. Refresh after your next session to start the line.",
		noImproved: "No improved scores recorded yet.",
	},
	songPage: {
		back: "Search songs",
		composer: "Composer",
		illustrator: "Illustrator",
		chapter: "Chapter",
		bpm: "BPM",
		length: "Length",
		nicknames: "Nicknames",
		levelsTitle: "Charts",
		level: "Level",
		constant: "Constant",
		notes: "Notes",
		charter: "Charter",
		kinds: "Tap · Drag · Hold · Flick",
		toolsTitle: "Tools",
		phira: "Download for Phira",
		score: "Plan a score",
		songCard: "Song rank card",
		yoursTitle: "Your scores",
		yoursSignedOut: "Sign in to see your scores and ranks on these charts.",
		signIn: "Sign in",
		yoursNotBound: "Bind your Phigros save to see your scores here.",
		yoursNone: "You have not played this song yet.",
		acc: "Accuracy",
		scoreCol: "Score",
		rks: "RKS",
		rank: "Rank",
		rankOf: "#{rank} of {of}",
		rankLoading: "Looking up…",
		rankFailed: "Unavailable",
		notPlayed: "Not played",
		jacketAlt: "Illustration for {title}",
		levelJacket: "{level} illustration",
		description:
			"{title} by {composer}: chart constants {levels}, note counts, charters and every older version of its charts.",
	},
	chartVersions: {
		title: "Chart versions",
		lede: "How these charts looked in older Phigros versions, from the APKs PhiBot keeps.",
		none: "These charts have not changed since they were added, as far as PhiBot's APKs go back.",
		versions: "Versions",
		current: "Current",
		compareTitle: "Compare two versions",
		level: "Level",
		from: "From",
		to: "To",
		loading: "Loading charts…",
		failed: "Could not load these charts. Try again in a moment.",
		notes: "Notes",
		duration: "Length",
		peak: "Most notes in a second",
		lines: "Judge lines",
		bpm: "BPM",
		change: "Change",
		kind: { tap: "Tap", drag: "Drag", hold: "Hold", flick: "Flick" },
		densityTitle: "Notes per second",
		densityLabel: "{version}: notes per second over {duration}",
		diffTitle: "What changed",
		diffLabel: "Change in notes per second from {from} to {to}",
		more: "More notes",
		fewer: "Fewer notes",
		same: "Every second has the same number of notes.",
		changed: "{n} seconds have a different number of notes.",
		readout: "{time}: {from} → {to} notes",
		readoutHint:
			"Point at or focus a chart and use the arrow keys to read each second.",
	},
	compare: {
		title: "Compare players",
		lede: "Two players' scores side by side: RKS, clears by difficulty, their best 30, and every chart they have both played.",
		a: "Player A",
		b: "Player B",
		placeholder: "Share link or code",
		useMine: "Use my save",
		submit: "Compare",
		hint: "A player can be compared only after they turn on Allow compare in their Share link menu.",
		unavailable:
			"{label}: this player can't be compared. The link may be wrong, or they have not turned on Allow compare.",
		bad: "{label}: paste a share link such as phibot.dev/p/abc123…",
		signin: "{label}: sign in to compare with your own save.",
		rks: "RKS",
		challenge: "Challenge",
		levelsTitle: "By difficulty",
		played: "Played",
		clear: "Cleared",
		fc: "FC",
		ap: "AP",
		h2hTitle: "Head to head",
		h2hSummary:
			"On {n} charts both have played, {a} is ahead on {wa} and {b} on {wb}.",
		ties: "{n} tied.",
		only: "{name} has {n} charts the other has not played.",
		filter: "Show",
		filters: { all: "All", a: "{name} ahead", b: "{name} ahead" },
		song: "Song",
		level: "Level",
		constant: "Constant",
		gap: "Gap",
		more: "Show {n} more",
		none: "No charts to show.",
		bestTitle: "Best 30",
		optIn: "Allow compare",
		optInHint:
			"Lets anyone with your share link compare all your scores with theirs, chart by chart. Off unless you turn it on; turning off sharing turns it off too.",
		optInFailed: "Could not change this. Try again.",
		openCompare: "Compare with someone",
		compareWith: "Compare with me",
	},
	guess: {
		title: "Guess the song",
		lede: "A close-up of a Phigros illustration, blurred, recoloured and inverted. Each wrong guess zooms out and clears it up. Six tries.",
		daily: "Daily",
		practice: "Practice",
		modeLabel: "Puzzle",
		dailyOf: "Daily puzzle, {date}",
		practiceLabel: "Practice puzzle",
		clue: "Clue {n} of {total}",
		imageAlt:
			"Clue {n} of {total}: a close-up of an illustration, blurred and recoloured",
		inputLabel: "Your guess",
		placeholder: "Song title or nickname",
		submit: "Guess",
		giveUp: "Show the answer",
		wrong: "Not {song}.",
		won: "Got it in {n}!",
		lost: "The answer was:",
		openSong: "Open the song page",
		share: "Copy result",
		copied: "Copied",
		newPractice: "New practice puzzle",
		tomorrow: "A new daily puzzle starts at midnight, UTC+8.",
		already: "Already guessed",
		noMatch: "No song matches.",
		results: "{n} songs",
		failed: "Could not check that guess. Try again.",
		guesses: "Your guesses",
		howTitle: "How it works",
		how: [
			"Everyone gets the same daily puzzle; practice puzzles are random and never run out.",
			"The first clue is a small close-up of the illustration: blurred, pixelated, recoloured and inverted, and sometimes mirrored.",
			"Each wrong guess zooms out and eases the effects off. The sixth clue is the whole illustration as it is.",
			"Signed in, your daily run is kept on PhiBot from the moment you press Start, so the clock can't be restarted. Practice puzzles, and daily puzzles played signed out, are kept in this browser only.",
			"The leaderboard ranks fewer tries first, then the faster time.",
		],
		shareLabel: "PhiBot Guess",
		start: "Start",
		startHint: "The clock starts when you press Start.",
		time: "Time",
		rankMe: "Show me on the leaderboard",
		rankHint:
			"Shows your display name, tries and time to everyone. Untick it any time to take them off.",
		signInToRank: "Sign in to be ranked on the daily leaderboard.",
		signIn: "Sign in",
		boardTitle: "Today's leaderboard",
		boardTitleDay: "Leaderboard, {date}",
		boardLede:
			"Fewest tries first; players with the same number of tries are ranked by time.",
		boardEmpty: "No one is on this puzzle's leaderboard yet.",
		boardFailed: "Could not load the leaderboard.",
		boardPlayer: "Player",
		boardTries: "Tries",
		boardTime: "Time",
		boardYou: "You",
		boardMine: "You are #{rank} of {total}.",
		boardMore: "{n} players solved it.",
		wonIn: "Got it in {n} tries, {time}.",
	},
};

export const toolsZh: ToolsMessages = {
	exportRecords: {
		csv: "下载 CSV",
		json: "下载 JSON",
		hint: "包含你玩过的所有谱面，取自 PhiBot 当前保存的存档。CSV 可用 Excel、Numbers 或 Google 表格打开。",
	},
	badge: {
		title: "RKS 徽章",
		hint: "一张显示你的名字和 RKS 的小图，可放在 GitHub 主页或论坛签名里。它会链接到此分享页，关闭分享后即失效。",
		alt: "你的 RKS 徽章",
		copy: "复制 Markdown",
		copyHtml: "复制 HTML",
		copied: "已复制",
		styleLabel: "样式",
		styles: {
			flat: "扁平",
			"flat-square": "扁平直角",
			"for-the-badge": "大号",
			rks: "仅 RKS",
			card: "卡片（浅色）",
			"card-dark": "卡片（深色）",
		},
	},
	targets: {
		title: "推分目标",
		lede: "根据 PhiBot 保存的存档，算出每张谱面要把 RKS 推高一档所需的准确率。",
		now: "当前",
		next: "下一档",
		goalNote:
			"Phigros 显示两位小数的 RKS。你的 RKS 需达到 {goal} 才会显示 {shown}；下表中任意一个目标单独达成即可。",
		levels: "难度",
		unplayed: "包括未玩过的谱面",
		sortLabel: "排序",
		sort: {
			gap: "差距最小",
			need: "目标最低",
			constant: "定数最高",
			ap: "AP 收益最大",
		},
		song: "曲目",
		level: "难度",
		constant: "定数",
		acc: "你的准确率",
		target: "目标",
		gap: "差距",
		apGain: "AP 增益",
		apOnly: "仅 AP",
		notPlayed: "未玩",
		more: "再显示 {n} 张",
		count: "显示 {shown} / {total} 张谱面",
		none: "没有符合筛选条件的谱面。",
		stuck: "另有 {n} 张谱面即使 AP 也无法把 RKS 推到下一档。",
		empty: "请先玩几张谱面，目前还没有可计算的数据。",
	},
	progress: {
		title: "完成度",
		lede: "按定数查看每个难度的通关、Full Combo 与 All Perfect 进度。",
		showLabel: "统计",
		show: { clear: "通关", fc: "Full Combo", ap: "All Perfect" },
		constant: "定数",
		total: "全部",
		cell: "{level} 定数 {constant}：{total} 张中 {n} 张{what}",
		status: {
			ap: "AP",
			fc: "FC",
			clear: "已通关",
			played: "已玩",
			none: "未玩",
		},
		statusCol: "状态",
		listTitle: "{level} · 定数 {constant}",
		listTitleAll: "{level} · 全部定数",
		pick: "选择一个格子以列出其中的谱面。",
		song: "曲目",
		acc: "准确率",
		score: "分数",
		legend: "格子越满，该组越接近完成。",
		empty: "谱面数据尚未加载，请稍后再试。",
	},
	trend: {
		title: "RKS 走势",
		lede: "PhiBot 每次读取存档时记录的 RKS，以及提升过的成绩。",
		range: "范围",
		ranges: { m1: "1 个月", m3: "3 个月", y1: "1 年", all: "全部" },
		chartLabel: "{from} 至 {to} 的 RKS",
		change: "此范围内 {delta}",
		tableTitle: "以表格显示读数",
		date: "日期",
		rks: "RKS",
		improvedTitle: "最近的提升",
		improvedLede: "提升过的成绩，按时间从新到旧排列。",
		firstPlay: "首次游玩",
		song: "曲目",
		level: "难度",
		before: "之前",
		after: "之后",
		more: "再显示 {n} 条",
		empty:
			"还没有历史记录。PhiBot 每次读取存档都会记录 RKS，玩完后点一下「刷新」即可。",
		one: "目前只有一次读数。下次游玩后刷新，即可开始绘制走势。",
		noImproved: "还没有记录到提升的成绩。",
	},
	songPage: {
		back: "搜索曲目",
		composer: "曲师",
		illustrator: "画师",
		chapter: "章节",
		bpm: "BPM",
		length: "时长",
		nicknames: "别名",
		levelsTitle: "谱面",
		level: "难度",
		constant: "定数",
		notes: "物量",
		charter: "谱师",
		kinds: "Tap · Drag · Hold · Flick",
		toolsTitle: "工具",
		phira: "下载 Phira 谱面",
		score: "规划分数",
		songCard: "单曲排名图",
		yoursTitle: "你的成绩",
		yoursSignedOut: "登录后可查看你在这些谱面上的成绩与排名。",
		signIn: "登录",
		yoursNotBound: "绑定 Phigros 存档后即可在此查看成绩。",
		yoursNone: "你还没有玩过这首歌。",
		acc: "准确率",
		scoreCol: "分数",
		rks: "RKS",
		rank: "排名",
		rankOf: "{of} 人中第 {rank}",
		rankLoading: "查询中…",
		rankFailed: "暂不可用",
		notPlayed: "未玩",
		jacketAlt: "{title} 的曲绘",
		levelJacket: "{level} 曲绘",
		description:
			"{title}（{composer}）：谱面定数 {levels}、物量、谱师，以及各谱面的所有旧版本。",
	},
	chartVersions: {
		title: "谱面版本",
		lede: "这些谱面在旧版 Phigros 中的样子，取自 PhiBot 保存的安装包。",
		none: "就 PhiBot 现有的安装包而言，这些谱面自加入以来没有改动过。",
		versions: "版本",
		current: "当前",
		compareTitle: "对比两个版本",
		level: "难度",
		from: "从",
		to: "到",
		loading: "正在加载谱面…",
		failed: "无法加载这些谱面，请稍后再试。",
		notes: "物量",
		duration: "时长",
		peak: "单秒最多音符",
		lines: "判定线",
		bpm: "BPM",
		change: "变化",
		kind: { tap: "Tap", drag: "Drag", hold: "Hold", flick: "Flick" },
		densityTitle: "每秒音符数",
		densityLabel: "{version}：{duration} 内每秒的音符数",
		diffTitle: "改动",
		diffLabel: "从 {from} 到 {to} 每秒音符数的变化",
		more: "音符增加",
		fewer: "音符减少",
		same: "每一秒的音符数都相同。",
		changed: "有 {n} 秒的音符数不同。",
		readout: "{time}：{from} → {to} 个音符",
		readoutHint: "指向或聚焦图表，再用方向键逐秒查看。",
	},
	compare: {
		title: "玩家对比",
		lede: "并排查看两位玩家的成绩：RKS、各难度的通关情况、各自的 Best 30，以及两人都玩过的每一张谱面。",
		a: "玩家 A",
		b: "玩家 B",
		placeholder: "分享链接或代码",
		useMine: "使用我的存档",
		submit: "对比",
		hint: "玩家需在「分享链接」菜单中打开「允许对比」后才能被对比。",
		unavailable:
			"{label}：无法对比此玩家。链接可能有误，或对方没有打开「允许对比」。",
		bad: "{label}：请粘贴分享链接，例如 phibot.dev/p/abc123…",
		signin: "{label}：登录后才能用自己的存档对比。",
		rks: "RKS",
		challenge: "课题模式",
		levelsTitle: "按难度",
		played: "已玩",
		clear: "通关",
		fc: "FC",
		ap: "AP",
		h2hTitle: "逐谱对比",
		h2hSummary:
			"在两人都玩过的 {n} 张谱面中，{a} 领先 {wa} 张，{b} 领先 {wb} 张。",
		ties: "{n} 张持平。",
		only: "{name} 有 {n} 张谱面是对方没玩过的。",
		filter: "显示",
		filters: { all: "全部", a: "{name} 领先", b: "{name} 领先" },
		song: "曲目",
		level: "难度",
		constant: "定数",
		gap: "差距",
		more: "再显示 {n} 张",
		none: "没有可显示的谱面。",
		bestTitle: "Best 30",
		optIn: "允许对比",
		optInHint:
			"打开后，任何拥有你分享链接的人都能把你的全部成绩与他们的逐谱对比。默认关闭；关闭分享时也会一并关闭。",
		optInFailed: "无法更改，请重试。",
		openCompare: "与他人对比",
		compareWith: "与我对比",
	},
	guess: {
		title: "猜曲绘",
		lede: "一张 Phigros 曲绘的放大特写，经过模糊、变色和反色处理。每猜错一次，画面就会拉远并变得更清晰。共六次机会。",
		daily: "每日",
		practice: "练习",
		modeLabel: "题目",
		dailyOf: "{date} 每日题",
		practiceLabel: "练习题",
		clue: "线索 {n} / {total}",
		imageAlt: "线索 {n} / {total}：曲绘的放大特写，经过模糊和变色处理",
		inputLabel: "你的答案",
		placeholder: "曲名或别名",
		submit: "提交",
		giveUp: "查看答案",
		wrong: "不是 {song}。",
		won: "第 {n} 次就猜中了！",
		lost: "答案是：",
		openSong: "打开曲目页面",
		share: "复制结果",
		copied: "已复制",
		newPractice: "新的练习题",
		tomorrow: "新的每日题会在北京时间零点出现。",
		already: "已经猜过",
		noMatch: "没有匹配的曲目。",
		results: "{n} 首曲目",
		failed: "无法检查答案，请重试。",
		guesses: "你的答案",
		howTitle: "玩法",
		how: [
			"每日题对所有人都一样；练习题随机生成，可无限游玩。",
			"第一条线索是曲绘的一小块放大特写：经过模糊、像素化、变色和反色处理，有时还会左右翻转。",
			"每猜错一次，画面就会拉远，处理效果也随之减弱。第六条线索就是完整的原图。",
			"登录后，每日题从你点击「开始」起就保存在 PhiBot 上，计时无法重来。练习题，以及未登录时玩的每日题，只保存在此浏览器中。",
			"排行榜先比尝试次数，次数相同再比用时。",
		],
		shareLabel: "PhiBot 猜曲绘",
		start: "开始",
		startHint: "点击「开始」后计时。",
		time: "用时",
		rankMe: "在排行榜上显示我",
		rankHint:
			"所有人都能看到你的显示名称、尝试次数和用时。随时取消勾选即可移除。",
		signInToRank: "登录后即可参与每日排行榜。",
		signIn: "登录",
		boardTitle: "今日排行榜",
		boardTitleDay: "{date} 排行榜",
		boardLede: "尝试次数少者优先；次数相同时按用时排名。",
		boardEmpty: "这道题的排行榜上还没有人。",
		boardFailed: "无法加载排行榜。",
		boardPlayer: "玩家",
		boardTries: "次数",
		boardTime: "用时",
		boardYou: "你",
		boardMine: "你在 {total} 人中排第 {rank}。",
		boardMore: "共有 {n} 人猜中。",
		wonIn: "用 {n} 次、{time} 猜中。",
	},
};
