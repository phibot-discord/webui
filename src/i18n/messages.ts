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
		scoreboard: string;
		openDesk: string;
	};
	notice: {
		body: string;
		coffee: string;
		dismiss: string;
	};
	nav: {
		cards: string;
		b30: string;
		hisb30: string;
		info: string;
		x30: string;
		fc30: string;
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
		download: string;
		rendering: string;
		renderFailed: string;
		unreachable: string;
		alt: string;
		titles: Record<"b30" | "x30" | "fc30" | "hisb30" | "info", string>;
	};
	refresh: {
		save: string;
		pending: string;
		wait: string;
		failed: string;
	};
	share: {
		menu: string;
		create: string;
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
		hisb30_empty: string;
		refresh_cooldown: string;
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
			{ name: "hisB30", blurb: "Charts that entered or left B30." },
			{ name: "Info", blurb: "Name, RKS, player card." },
			{ name: "x30", blurb: "Best if a 1-Good still counts." },
			{ name: "fc30", blurb: "Best Full Combo charts." },
		],
		footer:
			"PhiBot draws Phigros cards from a save bound to your Discord login.",
		scoreboard: "B30",
		openDesk: "Open your cards",
	},
	notice: {
		body: "Image generation and loading is sped up by the Vercel Pro plan, as we can select multiple function regions. Consider buying me a cup of coffee.",
		coffee: "Buy me a coffee",
		dismiss: "Got it",
	},
	nav: {
		cards: "Cards",
		b30: "B30",
		hisb30: "hisB30",
		info: "Info",
		x30: "x30",
		fc30: "fc30",
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
		download: "Download PNG",
		rendering: "Rendering card…",
		renderFailed: "Could not render this card.",
		unreachable: "Could not reach the render server.",
		alt: "{name} card",
		titles: {
			b30: "B30",
			x30: "x30 (1-Good)",
			fc30: "fc30 (Full Combo)",
			hisb30: "Historical B30",
			info: "Player info",
		},
	},
	refresh: {
		save: "Refresh save",
		pending: "Refreshing…",
		wait: "Wait {seconds}s",
		failed: "Refresh failed.",
	},
	share: {
		menu: "Share",
		create: "Create public link",
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
		not_bound: "No Phigros account is bound. Bind TapTap on this page.",
		banned: "This account is banned.",
		no_save: "No cached save yet. Use Refresh on this site.",
		hisb30_empty:
			"Need score history or at least two save updates to show B30 changes.",
		refresh_cooldown:
			"Refresh is on cooldown. Try again in a couple of minutes.",
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
			"查询你的 Phigros B30、历史成绩和玩家信息。和 Discord 机器人同一套成绩图。",
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
		title: "打完最后一首。",
		lede: "用手机看 B30。登录后在本页绑定 TapTap。",
		lookupsTitle: "能查什么",
		lookups: [
			{ name: "B30", blurb: "最好的 30 首，外加三个 phi。" },
			{ name: "hisB30", blurb: "进出过 B30 的谱。" },
			{ name: "Info", blurb: "名字、RKS、玩家信息。" },
			{ name: "x30", blurb: "算上 1 Good 时最好的谱。" },
			{ name: "fc30", blurb: "Full Combo 最好的谱。" },
		],
		footer: "PhiBot 用绑定到你 Discord 登录的存档出 Phigros 成绩图。",
		scoreboard: "B30",
		openDesk: "查看成绩图",
	},
	notice: {
		body: "Image 生成和加载因 Vercel Pro 变得更快了。请考虑支持我一下😭",
		coffee: "请我喝杯咖啡",
		dismiss: "知道了",
	},
	nav: {
		cards: "成绩图",
		b30: "B30",
		hisb30: "历史B30",
		info: "信息",
		x30: "x30",
		fc30: "fc30",
	},
	me: {
		title: "你的成绩",
		banned: "这个账号已被封禁，无法查看成绩图。",
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
		unbind: "解绑",
		unbindConfirm: "从这个 Discord 登录解除 Phigros 绑定？",
		unbindYes: "解绑",
		unbindNo: "留下",
		unbinding: "正在解绑…",
		unbindFailed: "无法解绑。",
	},
	public: {
		hint: "这是他们成绩图的公开副本。打开页面不会刷新存档。",
	},
	card: {
		charts: "谱面数",
		download: "下载 PNG",
		rendering: "正在出图…",
		renderFailed: "无法生成这张成绩图。",
		unreachable: "无法连接到出图服务。",
		alt: "{name} 成绩图",
		titles: {
			b30: "B30",
			x30: "x30（1 Good）",
			fc30: "fc30（Full Combo）",
			hisb30: "历史 B30",
			info: "玩家信息",
		},
	},
	refresh: {
		save: "刷新存档",
		pending: "正在刷新…",
		wait: "请等待 {seconds} 秒",
		failed: "刷新失败。",
	},
	share: {
		menu: "分享",
		create: "生成公开链接",
		creating: "正在生成…",
		link: "公开链接",
		copy: "复制",
		copied: "已复制",
		revoke: "停止分享",
	},
	notFound: {
		title: "未找到",
		body: "该页面或分享链接不存在。",
	},
	errors: {
		unauthorized: "未登录",
		unknown_card: "未知成绩图",
		not_bound: "尚未绑定 Phigros。请在本页绑定 TapTap。",
		banned: "这个账号已被封禁。",
		no_save: "还没有缓存存档。请在本页刷新。",
		hisb30_empty: "需要成绩历史，或至少两次存档更新，才能显示 B30 变化。",
		refresh_cooldown: "刷新仍在冷却中，请稍后再试。",
		refresh_failed: "刷新失败。",
		rate_limit: "请求过于频繁，请稍等一分钟。",
		share_not_found: "分享链接不存在",
		profile_unavailable: "无法显示该主页",
		render_failed: "无法生成这张成绩图。",
		already_bound: "已经绑定过账号。请先解绑。",
		invalid_token: "这不是 25 位 sessionToken。",
		qr_busy: "已有扫码绑定在进行。",
		qr_expired: "二维码已过期，请重新扫。",
		qr_missing: "没有进行中的扫码，请重新扫。",
		bind_failed: "绑定失败。",
		unbind_failed: "无法解绑。",
		tapapi_unavailable:
			"TapTap 云端（TapAPI）超时了。这是 TapTap 的问题，不是本站故障。请稍后再试。",
	},
};
