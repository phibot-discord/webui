export const PHI_LOCALES = ["en", "zh", "ja"] as const;
export type PhiLocale = (typeof PHI_LOCALES)[number];
const DEFAULT_PHI_LOCALE: PhiLocale = "en";

export function isPhiLocale(v: unknown): v is PhiLocale {
	return v === "en" || v === "zh" || v === "ja";
}

export function parsePhiLocale(v: unknown): PhiLocale | undefined {
	if (typeof v !== "string") return;
	const t = v.trim().toLowerCase();
	if (!t) return;
	if (
		t === "zh" ||
		t.startsWith("zh-") ||
		t === "cn" ||
		t === "chinese" ||
		t === "中文"
	)
		return "zh";
	if (t === "en" || t.startsWith("en-") || t === "english") return "en";
	if (
		t === "ja" ||
		t.startsWith("ja-") ||
		t === "jp" ||
		t === "japanese" ||
		t === "日本語"
	)
		return "ja";
}

export function resolvePhiLocale(...candidates: unknown[]): PhiLocale {
	for (const c of candidates) {
		const hit = isPhiLocale(c) ? c : parsePhiLocale(c);
		if (hit) return hit;
	}
	return DEFAULT_PHI_LOCALE;
}

const en = {
	lang: "en",
	noPush: "Can't push",
	accLimited: "ACC is limited to {n}%",
	apMode: "All Perfect Mode",
	fcMode: "FC30",
	x30Mode: "x30",
	analysisTitle: "B30 analysis",
	tagAbility: "Chart skills",
	validVotes: "Valid votes",
	tagRecords: "Scores",
	tagBallots: "Votes",
	tagConstants: "Constants",
	noData: "No data",
	tagPool: "Each number is your RKS if every chart played like that tag.",
	tagPoolAps: "All 99.9%+, so there is no gap to measure.",
	tagPoolHistory:
		"All 99.9%+ now: from your scores on {date}, as your RKS then ({rks}) if every chart played like that tag.",
	categorySummary: "Categories",
	strongTags: "Strengths",
	weakTags: "Weaknesses",
	tagInsufficient:
		"Not enough voted charts near your level yet. Vote on chart tags at https://kyou.net.cn/phigros.",
	tagUnavailable:
		"Chart tag votes could not be loaded. Reload the card to try again.",
	tagTip: "Vote on chart tags at https://kyou.net.cn/phigros.",
	histTitle: "Equivalent RKS histogram",
	avgRks: "Average RKS",
	histY: "Per-chart RKS",
	histSlotsUnit: " slots",
	emptyBio: "This player's bio was eaten by Hu Tao…",
	accFilterHint:
		"RKS after dropping every score whose ACC is below a given value (x-axis).",
	currentPrefix: "Now: ",
	selected: "Selected",
	signDaysBefore: "Signed in ",
	signDaysAfter: " days",
	todayLuck: "Today's luck",
	good: "Good",
	bad: "Avoid",
	dailyQuote: "Daily line",
	done: "Done",
	guest: "Guest",
	fortuneTitle: "— Today's fortune —",
	selectedRange: "Selected constant range",
	collectedOn: "Collected",
	keeper: "Keeper",
	grade: "Grade",
	song: "Song",
	duration: "Length",
	difficulty: "Difficulty",
	charter: "Charter",
	chartLength: "Chart length: ",
	shipped: "Release version & date",
	versionPrefix: "Version: v",
	datePrefix: "Date: ",
	constChart: "Constant history",
	taskList: "Phi task list",
	suggestTitle: "Push suggestions",
	rankingTitle: "Ranking Score",
	newSongs: "New songs",
	songName: "Title",
	constant: "Constant",
	combo: "Combo",
	chartEdits: "Constant & chart edits",
	field: "Field",
	status: "Change",
	updatedScores: "Updated {n} scores",
	noNewScores: "No new scores",
	invalidUser: "Invalid user",
	calendarTitle: "{y}-{m}",
	weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
	settingsTitle: "phi settings",
	settingsDesc: "These choices apply to your rendered cards.",
	themeTitle: "Theme",
	themeDesc: "Overall look of rendered pages.",
	avgKindTitle: "B30 stats bar",
	avgKindDesc: "What the B30 average bar shows.",
	avgColorTitle: "B30 bar color",
	avgColorDesc: "Main color of the B30 average bar.",
	apiTitle: "API lookups",
	apiDesc: "Turn off to skip online score lookups.",
	analysisSettingTitle: "B30 analysis",
	analysisSettingDesc: "Equivalent-RKS histogram at the end of the B30 card.",
	tagSettingTitle: "Chart skills",
	tagSettingDesc:
		"Five-axis radar and strong/weak tags on the B30 card. Needs API lookups.",
	langTitle: "Language",
	langDesc: "Web UI and every rendered card. Shared with the Discord bot.",
	theme: {
		default: {
			title: "[0] Default",
			description: "Base theme. Random jacket as background.",
		},
		snow: { title: "[1] Winter", description: "Default plus falling snow." },
		star: {
			title: "[2] One heart spared from sorrow",
			description: "Fireflies over a dreamless night.",
		},
		dss2: { title: "[3] Masters 2", description: "Season 2 Masters colors." },
	},
	avgKind: {
		all: { title: "[0] All", description: "Average of every score." },
		b30: { title: "[1] B30 only", description: "Average of B30 scores only." },
		top: { title: "[2] Top %", description: "Show rank percentile." },
		none: { title: "[3] Hide", description: "Hide B30 average info." },
	},
	avgColor: {
		red: { title: "[0] Red", description: "High-contrast warm." },
		gold: { title: "[1] Gold", description: "Bright gold." },
		blue: { title: "[2] Blue", description: "Cool palette." },
		green: { title: "[3] Green", description: "Neutral bright." },
	},
	onOff: {
		true: { title: "[0] On", description: "Enable this." },
		false: { title: "[1] Off", description: "Disable this." },
	},
	langOpt: {
		en: { title: "[0] English", description: "English UI and card copy." },
		zh: { title: "[1] 中文", description: "Chinese UI and card copy." },
		ja: { title: "[2] 日本語", description: "Japanese UI and card copy." },
	},
};

const zh: typeof en = {
	lang: "zh",
	noPush: "无法推分",
	accLimited: "ACC 限制为 {n}%",
	apMode: "All Perfect 模式",
	fcMode: "FC30",
	x30Mode: "性30",
	analysisTitle: "B30 数据分析",
	tagAbility: "谱面实力分析",
	validVotes: "有效票",
	tagRecords: "成绩",
	tagBallots: "选票",
	tagConstants: "定数",
	noData: "暂无数据",
	tagPool: "数字为所有谱面都像该词条时你的 RKS",
	tagPoolAps: "所有谱面均在 99.9% 以上，没有差距可比",
	tagPoolHistory:
		"现在所有谱面均在 99.9% 以上：以下来自 {date} 的成绩，数字为所有谱面都像该词条时你当时的 RKS（当时 {rks}）",
	categorySummary: "分类汇总",
	strongTags: "擅长词条",
	weakTags: "薄弱词条",
	tagInsufficient:
		"你所在难度附近的谱面标签票数不足，请前往 https://kyou.net.cn/phigros 进行谱面标签投票",
	tagUnavailable: "谱面标签数据暂时无法读取，请稍后重新生成",
	tagTip: "谱面投票可前往 https://kyou.net.cn/phigros 提交",
	histTitle: "等效 RKS 直方图",
	avgRks: "平均 RKS",
	histY: "等效单曲 RKS",
	histSlotsUnit: " 个有效槽位",
	emptyBio: "介个人的简介被胡桃吃掉惹……",
	accFilterHint:
		"将您的成绩中所有 ACC【小于某一值(横坐标)】的成绩筛去后计算得到的 RKS 值",
	currentPrefix: "当前：",
	selected: "已选中",
	signDaysBefore: "累计签到 ",
	signDaysAfter: " 天",
	todayLuck: "今日人品",
	good: "宜",
	bad: "忌",
	dailyQuote: "每日一言",
	done: "已完成",
	guest: "游客玩家",
	fortuneTitle: "——·今日运势·——",
	selectedRange: "已选定数区间",
	collectedOn: "收集日期",
	keeper: "保管单位",
	grade: "等级",
	song: "曲目",
	duration: "时长",
	difficulty: "难度",
	charter: "谱师",
	chartLength: "谱面时长：",
	shipped: "上线版本&日期",
	versionPrefix: "版本: v",
	datePrefix: "日期: ",
	constChart: "定数变化折线图",
	taskList: "Phi-Plugin任务列表",
	suggestTitle: "推分建议",
	rankingTitle: "RankingScore排行榜",
	newSongs: "新曲速递",
	songName: "曲名",
	constant: "定数",
	combo: "物量",
	chartEdits: "定数&谱面修改",
	field: "条目",
	status: "情况",
	updatedScores: "更新了{n}份成绩",
	noNewScores: "未收集到新成绩",
	invalidUser: "无效用户",
	calendarTitle: "{y} 年 {m} 月",
	weekdays: ["一", "二", "三", "四", "五", "六", "日"],
	settingsTitle: "phi 用户设置",
	settingsDesc: "以下选项为你的个人偏好展示，选择结果将用于对应图片渲染。",
	themeTitle: "主题风格",
	themeDesc: "控制图片页面的整体视觉风格。",
	avgKindTitle: "B30统计数据展示",
	avgKindDesc: "控制 B30 均值条展示的数据。",
	avgColorTitle: "B30均值条配色",
	avgColorDesc: "控制 B30 均值条的主色。",
	apiTitle: "API功能开关",
	apiDesc: "关闭后不再使用在线查分相关功能。",
	analysisSettingTitle: "B30统计分析",
	analysisSettingDesc: "控制 B30 图片末尾的等效 RKS 直方图。",
	tagSettingTitle: "谱面实力分析",
	tagSettingDesc: "B30 图上的五维雷达和擅长/薄弱词条。",
	langTitle: "语言",
	langDesc: "网页和所有成绩图。和 Discord 机器人共用。",
	theme: {
		default: {
			title: "[0]默认",
			description: "基础主题，使用随机曲绘作为背景。",
		},
		snow: { title: "[1]寒冬", description: "在默认的基础上加入飘落雪花元素。" },
		star: {
			title: "[2]使一颗心免于哀伤",
			description: "飞萤之火自无梦的长夜亮起。",
		},
		dss2: { title: "[3]大师赛2", description: "大师赛第二赛季主题配色" },
	},
	avgKind: {
		all: { title: "[0]全部统计", description: "展示全部成绩的平均值统计。" },
		b30: { title: "[1]仅 B30", description: "只按 B30 成绩平均值统计。" },
		top: { title: "[2]仅 Top", description: "展示排名百分比。" },
		none: { title: "[3]隐藏", description: "不展示 B30 均值相关信息。" },
	},
	avgColor: {
		red: { title: "[0]红", description: "高对比暖色。" },
		gold: { title: "[1]金", description: "偏亮金色。" },
		blue: { title: "[2]蓝", description: "冷色调方案。" },
		green: { title: "[3]绿", description: "中性偏亮配色。" },
	},
	onOff: {
		true: { title: "[0]启用", description: "开启该功能。" },
		false: { title: "[1]禁用", description: "关闭该功能。" },
	},
	langOpt: {
		en: { title: "[0] English", description: "英文界面和成绩图。" },
		zh: { title: "[1] 中文", description: "中文界面和成绩图。" },
		ja: { title: "[2] 日本語", description: "日文界面和成绩图。" },
	},
};

const ja: typeof en = {
	lang: "ja",
	noPush: "アップ不可",
	accLimited: "精度の上限は {n}%",
	apMode: "All Perfect モード",
	fcMode: "FC30",
	x30Mode: "x30",
	analysisTitle: "B30 分析",
	tagAbility: "譜面スキル",
	validVotes: "有効票",
	tagRecords: "スコア",
	tagBallots: "投票",
	tagConstants: "定数",
	noData: "データなし",
	tagPool: "数値は全譜面がそのタグのようだった場合の RKS。",
	tagPoolAps: "すべて 99.9% 以上のため、差を測れません。",
	tagPoolHistory:
		"現在はすべて 99.9% 以上のため、{date} 時点のスコアから。数値は全譜面がそのタグのようだった場合の当時の RKS（当時 {rks}）。",
	categorySummary: "カテゴリ別",
	strongTags: "得意",
	weakTags: "苦手",
	tagInsufficient:
		"あなたのレベル付近で投票された譜面がまだ足りません。譜面タグの投票は https://kyou.net.cn/phigros から。",
	tagUnavailable:
		"譜面タグの投票を読み込めませんでした。カードを再読み込みしてやり直してください。",
	tagTip: "譜面タグの投票は https://kyou.net.cn/phigros から。",
	histTitle: "等価 RKS ヒストグラム",
	avgRks: "平均 RKS",
	histY: "譜面ごとの RKS",
	histSlotsUnit: " 枠",
	emptyBio: "このプレイヤーの自己紹介はフータオに食べられました…",
	accFilterHint: "ACC が指定値（横軸）未満のスコアをすべて除いた場合の RKS。",
	currentPrefix: "現在: ",
	selected: "選択中",
	signDaysBefore: "サインイン ",
	signDaysAfter: " 日",
	todayLuck: "今日の運",
	good: "おすすめ",
	bad: "避けたい",
	dailyQuote: "今日の一言",
	done: "完了",
	guest: "ゲスト",
	fortuneTitle: "— 今日の運勢 —",
	selectedRange: "選択した定数範囲",
	collectedOn: "収集日",
	keeper: "保管者",
	grade: "ランク",
	song: "曲",
	duration: "長さ",
	difficulty: "難易度",
	charter: "譜面作者",
	chartLength: "譜面の長さ: ",
	shipped: "実装バージョンと日付",
	versionPrefix: "バージョン: v",
	datePrefix: "日付: ",
	constChart: "定数の推移",
	taskList: "Phi タスク一覧",
	suggestTitle: "RKS アップ提案",
	rankingTitle: "Ranking Score",
	newSongs: "新曲",
	songName: "曲名",
	constant: "定数",
	combo: "コンボ",
	chartEdits: "定数・譜面の変更",
	field: "項目",
	status: "変更",
	updatedScores: "{n} 件のスコアを更新",
	noNewScores: "新しいスコアなし",
	invalidUser: "無効なユーザー",
	calendarTitle: "{y}年{m}月",
	weekdays: ["月", "火", "水", "木", "金", "土", "日"],
	settingsTitle: "phi 設定",
	settingsDesc: "ここでの選択は、生成されるカードに反映されます。",
	themeTitle: "テーマ",
	themeDesc: "カードページ全体の見た目。",
	avgKindTitle: "B30 統計バー",
	avgKindDesc: "B30 平均バーに表示する内容。",
	avgColorTitle: "B30 バーの色",
	avgColorDesc: "B30 平均バーのメインカラー。",
	apiTitle: "API 照会",
	apiDesc: "オフにするとオンラインのスコア照会を行いません。",
	analysisSettingTitle: "B30 分析",
	analysisSettingDesc: "B30 カード末尾の等価 RKS ヒストグラム。",
	tagSettingTitle: "譜面スキル",
	tagSettingDesc:
		"B30 カードの 5 軸レーダーと得意・苦手タグ。API 照会が必要です。",
	langTitle: "言語",
	langDesc: "Web UI とすべてのカード。Discord ボットと共通です。",
	theme: {
		default: {
			title: "[0] デフォルト",
			description: "基本テーマ。背景はランダムなジャケット。",
		},
		snow: { title: "[1] 冬", description: "デフォルトに降る雪を加えたもの。" },
		star: {
			title: "[2] One heart spared from sorrow",
			description: "夢のない夜に灯る蛍の火。",
		},
		dss2: {
			title: "[3] マスターズ 2",
			description: "マスターズ第 2 シーズンの配色。",
		},
	},
	avgKind: {
		all: { title: "[0] すべて", description: "全スコアの平均。" },
		b30: { title: "[1] B30 のみ", description: "B30 のスコアのみの平均。" },
		top: { title: "[2] 上位 %", description: "順位のパーセンタイルを表示。" },
		none: { title: "[3] 非表示", description: "B30 平均の情報を隠す。" },
	},
	avgColor: {
		red: { title: "[0] 赤", description: "高コントラストの暖色。" },
		gold: { title: "[1] 金", description: "明るい金色。" },
		blue: { title: "[2] 青", description: "寒色系の配色。" },
		green: { title: "[3] 緑", description: "ニュートラルで明るい配色。" },
	},
	onOff: {
		true: { title: "[0] オン", description: "有効にします。" },
		false: { title: "[1] オフ", description: "無効にします。" },
	},
	langOpt: {
		en: { title: "[0] English", description: "英語の UI とカード。" },
		zh: { title: "[1] 中文", description: "中国語の UI とカード。" },
		ja: { title: "[2] 日本語", description: "日本語の UI とカード。" },
	},
};

type CardCopy = typeof en;

const CARD_COPY: Record<PhiLocale, CardCopy> = { en, zh, ja };

export function cardCopy(locale: PhiLocale): CardCopy {
	return CARD_COPY[locale] ?? en;
}

const CHART_TAG_EN: Record<string, string> = {
	读谱: "Reading",
	硬抗: "Stamina",
	拆谱: "Pattern",
	定位: "Aim",
	多指: "Multi-Finger",
	差速: "Mixed speed",
	脑裂: "Split-brain",
	多面下落: "Multi-side",
	"变速/闪现": "Flash / BPM Change",
	面海: "Note flood",
	扫线: "Sweep",
	长条藏键: "Hold hide",
	慢流速: "Slow notes",
	非线性下落: "Nonlinear",
	判定线干扰: "Line noise",
	复杂节奏: "Polyrhythm",
	长纵连: "Long jacks",
	"长连点/交互": "Long interaction",
	快交互: "Fast interaction",
	双押海: "Double-tap flood",
	宽排键: "Wide span",
	连点爆发: "Burst",
	全换: "Full switch",
	反手: "Cross-hand",
	锁手: "Locked finger",
	锚键: "Anchor",
	刹车: "Brake",
	频繁切轨: "Lane hop",
	倒打: "Reverse",
	蓝夹黄: "BY sandwich",
	蓝夹红: "BR sandwich",
	浮现式: "Emerge",
	叠: "Stack",
	乱: "Scramble",
	切: "Cut",
	楼梯: "Stairs",
	拍砖: "Bricks",
	对拍: "Alternating",
	对切: "Split cut",
	"噪域/红区": "Noise zone",
	"3k": "3K",
	"4k": "4K",
	"5k": "5K",
	"6k": "6K",
};

const CHART_TAG_DESC_EN: Record<string, string> = {
	读谱: "Reading-related difficulty",
	差速: "Notes at the same time drop at different speeds (e.g. Temporal Shifting)",
	脑裂: "Multiple judgment lines, or patterns that split attention (e.g. FULI AUTO SHOOTER)",
	"变速/闪现": "Notes change speed while falling, or flash in",
	面海: "All or almost all holds (e.g. ぱぴぷぴぷぴぱ)",
	扫线: "Cytus-like scan-line patterns",
	长条藏键: "Notes sit inside holds, hiding them or forcing a large move",
	非线性下落:
		"Notes do not fall in a straight constant-speed line (e.g. 樱树街道)",
	判定线干扰:
		"Judgment-line shake or move that interferes with sight-reading (e.g. IL-Artifact ending)",
	复杂节奏: "BPM changes or odd meters (e.g. Aleph-0, Opia)",
	硬抗: "Stamina-related difficulty",
	快交互: "Interaction difficulty",
	双押海: "Continuous double-tap streams",
	宽排键: "Notes spread across most of the screen",
	连点爆发: "Burst streams",
	拆谱: "Pattern-reading difficulty",
	全换: "A section that can be fully split into interactions",
	反手: "Hitting across the other hand",
	锁手: "One hand locked by a hold or stream and cannot handle the rest",
	锚键: "Notes fall continuously on a fixed lane (e.g. G.V.N)",
	刹车: "Must stop tapping in time or you will overhit (e.g. jacks into a hold)",
	频繁切轨: "Not fixed-lane; frequent moves or 4-5-6k lane switches",
	浮现式:
		"Patterns that appear on screen and judge when they merge (e.g. delayed stars)",
	多指: "Multi-finger difficulty",
	叠: "Overlapping multi-taps in a short window",
	乱: "Dense stacked stairs that keep changing direction",
	切: "One hand switches fingers; stairs plus multi-taps",
	楼梯: "Taps arranged like stairs",
	拍砖: "Repeated multi-taps on a fixed beat",
	对拍: "Hands alternate fast multi-taps",
	对切: "Both hands mirror or sync finger rolls",
	"3k": "Three-lane patterns",
	"4k": "Four-lane patterns",
	"5k": "Five-lane patterns",
	"噪域/红区": "A Chapter 9 mechanic: touching the zone cuts your input",
};

const CHART_TAG_JA: Record<string, string> = {
	读谱: "譜面読み",
	硬抗: "体力",
	拆谱: "配置",
	定位: "位置取り",
	多指: "多指",
	差速: "速度差",
	脑裂: "脳分裂",
	多面下落: "多方向",
	"变速/闪现": "変速/フラッシュ",
	面海: "ノーツの海",
	扫线: "スイープ",
	长条藏键: "ホールド隠し",
	慢流速: "低速",
	非线性下落: "非線形",
	判定线干扰: "判定線干渉",
	复杂节奏: "ポリリズム",
	长纵连: "長い縦連",
	"长连点/交互": "長い交互",
	快交互: "高速交互",
	双押海: "同時押しの海",
	宽排键: "広範囲",
	连点爆发: "バースト",
	全换: "全切替",
	反手: "逆手",
	锁手: "片手拘束",
	锚键: "アンカー",
	刹车: "ブレーキ",
	频繁切轨: "レーン移動",
	倒打: "逆打ち",
	蓝夹黄: "青黄サンド",
	蓝夹红: "青赤サンド",
	浮现式: "出現型",
	叠: "重ね",
	乱: "乱打",
	切: "カット",
	楼梯: "階段",
	拍砖: "レンガ",
	对拍: "交互",
	对切: "対切り",
	"噪域/红区": "ノイズ領域",
	"3k": "3K",
	"4k": "4K",
	"5k": "5K",
	"6k": "6K",
};

const CHART_TAG_DESC_JA: Record<string, string> = {
	读谱: "譜面読みに関する難しさ",
	差速: "同時刻のノーツが異なる速度で落下する（例: Temporal Shifting）",
	脑裂: "判定線が複数ある、または注意が分散する配置（例: FULI AUTO SHOOTER）",
	"变速/闪现": "ノーツが落下中に速度を変える、または突然現れる",
	面海: "ほぼすべてがホールド（例: ぱぴぷぴぷぴぱ）",
	扫线: "Cytus のようなスキャンライン型の配置",
	长条藏键: "ホールドの中にノーツが隠れる、または大きな移動を強いられる",
	非线性下落: "ノーツが直線の等速で落下しない（例: 樱树街道）",
	判定线干扰:
		"判定線の揺れや移動が初見読みの妨げになる（例: IL-Artifact の終盤）",
	复杂节奏: "BPM の変化や変拍子（例: Aleph-0, Opia）",
	硬抗: "体力に関する難しさ",
	快交互: "左右の交互打ちの難しさ",
	双押海: "同時押しが連続する配置",
	宽排键: "ノーツが画面の大部分に広がる",
	连点爆发: "バースト的な連打",
	拆谱: "配置の読み取りの難しさ",
	全换: "全体を交互打ちに分けられる区間",
	反手: "反対の手を越えて打つ",
	锁手: "片手がホールドや連打に縛られ、残りを処理できない",
	锚键: "固定レーンにノーツが連続して落ちる（例: G.V.N）",
	刹车: "タイミングよく叩くのをやめないと余計に打ってしまう（例: 縦連からホールド）",
	频繁切轨: "固定レーンではなく、頻繁な移動や 4-5-6K のレーン切り替え",
	浮现式: "画面に現れ、重なった時点で判定される配置（例: 遅延する星）",
	多指: "多指処理の難しさ",
	叠: "短い時間に重なる同時押し",
	乱: "密集した階段が重なり、向きが変わり続ける",
	切: "片手で指を切り替える。階段と同時押しの組み合わせ",
	楼梯: "階段状に並んだタップ",
	拍砖: "固定の拍で繰り返される同時押し",
	对拍: "両手が交互に素早い同時押しを行う",
	对切: "両手で指の入れ替えを対称または同期して行う",
	"3k": "3 レーンの配置",
	"4k": "4 レーンの配置",
	"5k": "5 レーンの配置",
	"噪域/红区": "第9章のギミック: 領域に触れると入力が遮断される",
};

export function localizeChartTagName(name: string, locale: PhiLocale): string {
	if (locale === "zh" || !name) return name;
	if (locale === "ja") return CHART_TAG_JA[name] ?? CHART_TAG_EN[name] ?? name;
	return CHART_TAG_EN[name] ?? name;
}

export function localizeChartTagDescription(
	name: string,
	description: string | undefined,
	locale: PhiLocale,
): string {
	const src = description?.trim() ?? "";
	if (!src) return "";
	if (locale === "zh") return src;
	if (locale === "ja")
		return CHART_TAG_DESC_JA[name] ?? CHART_TAG_DESC_EN[name] ?? src;
	return CHART_TAG_DESC_EN[name] ?? src;
}

function withLocalizedName<T extends { name: string }>(
	row: T,
	locale: PhiLocale,
): T {
	return { ...row, name: localizeChartTagName(row.name, locale) };
}

export function localizeChartTagLabels<
	T extends {
		categories: { name: string }[];
		radar: { categories: { name: string }[] };
		strong: { name: string }[];
		weak: { name: string }[];
		tags?: { name: string }[];
	},
>(analysis: T, locale: PhiLocale): T {
	if (locale === "zh") return analysis;
	return {
		...analysis,
		...(analysis.tags
			? { tags: analysis.tags.map((row) => withLocalizedName(row, locale)) }
			: {}),
		categories: analysis.categories.map((row) =>
			withLocalizedName(row, locale),
		),
		radar: {
			...analysis.radar,
			categories: analysis.radar.categories.map((row) =>
				withLocalizedName(row, locale),
			),
		},
		strong: analysis.strong.map((row) => withLocalizedName(row, locale)),
		weak: analysis.weak.map((row) => withLocalizedName(row, locale)),
	};
}

export function signed(n: number): string {
	const v = Math.abs(n) < 0.005 ? 0 : n;
	return `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
}

export function fill(
	template: string,
	vars: Record<string, string | number>,
): string {
	let out = template;
	for (const [k, v] of Object.entries(vars))
		out = out.replaceAll(`{${k}}`, String(v));
	return out;
}

type TagPoolInfo = {
	range?: { min: number; max: number };
	recordCount?: number;
	totalVotes: number;
	rks?: number;
	basis?: "scores" | "history" | "aps";
	asOf?: string;
};

function shanghaiDate(iso: string): string {
	const t = Date.parse(iso);
	return Number.isFinite(t)
		? new Date(t + 8 * 3_600_000).toISOString().slice(0, 10)
		: "";
}

function poolRange(analysis: TagPoolInfo | null | undefined) {
	const r = analysis?.range;
	return r && Number.isFinite(r.min) && Number.isFinite(r.max)
		? { min: r.min.toFixed(1), max: r.max.toFixed(1) }
		: undefined;
}

/** Tag panel meta line, as upstream b19.art (f908bb31) */
export function tagAnalysisMeta(
	analysis: TagPoolInfo | null | undefined,
	t: CardCopy,
): string {
	if (!analysis) return t.noData;
	const range = poolRange(analysis);
	if (!range) return `${t.validVotes} ${analysis.totalVotes}`;
	return `${t.tagConstants} ${range.min}–${range.max} · ${t.tagRecords} ${analysis.recordCount ?? 0} · ${t.tagBallots} ${analysis.totalVotes}`;
}

export function tagPoolNote(
	analysis: TagPoolInfo | null | undefined,
	t: CardCopy,
): string {
	const range = poolRange(analysis);
	if (!range) return "";
	if (analysis?.basis === "aps") return fill(t.tagPoolAps, range);
	const rks = (analysis?.rks ?? 0).toFixed(2);
	const date = analysis?.asOf ? shanghaiDate(analysis.asOf) : "";
	if (analysis?.basis === "history" && date)
		return fill(t.tagPoolHistory, { ...range, date, rks });
	return fill(t.tagPool, { ...range, rks });
}

function isNoPushSuggest(s: string | undefined): boolean {
	if (!s) return true;
	return s === "无法推分" || /^can't push$/i.test(s);
}

export function displaySuggest(
	s: string | number | undefined,
	t: CardCopy,
): string {
	if (s == null || s === -1) return t.noPush;
	const str = String(s);
	return isNoPushSuggest(str) ? t.noPush : str;
}

export function localizeSuggestFields(
	rows: Array<{ suggest?: string } | null | undefined> | undefined,
	t: CardCopy,
) {
	for (const row of rows || []) {
		if (row && typeof row.suggest === "string" && isNoPushSuggest(row.suggest))
			row.suggest = t.noPush;
	}
}
