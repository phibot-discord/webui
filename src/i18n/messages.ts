export type Messages = {
	meta: { title: string; description: string };
	brand: string;
	skip: string;
	signIn: string;
	signInTaptap: string;
	invite: string;
	signOut: string;
	signedIn: string;
	credit: { before: string; after: string; heart: string; name: string };
	locale: { en: string; zh: string; label: string };
	theme: { label: string; light: string; dark: string; system: string };
	home: {
		eyebrow: string;
		title: string;
		lede: string;
		ledeSignedIn: string;
		lookupsTitle: string;
		lookupsSignedIn: string;
		lookupsSignedOut: string;
		lookups: Record<
			"b30" | "hisb30" | "info" | "x30" | "fc30" | "song",
			{ name: string; blurb: string }
		>;
		nicknames: { name: string; blurb: string; hint: string };
		signInHint: string;
		signingIn: string;
		newLabel: string;
		boardTitle: string;
		layoutsTitle: string;
		boardLede: string;
		layouts: Record<
			"classic" | "table" | "phone",
			{ name: string; blurb: string; alt: string }
		>;
		layoutsLabel: string;
		showFull: string;
		newTab: string;
		closingTitle: string;
		closingCaption: string;
		openDesk: string;
		pauseMotion: string;
	};
	legal: {
		nav: string;
		terms: string;
		privacy: string;
		updated: string;
		contents: string;
		agree: {
			before: string;
			terms: string;
			and: string;
			privacy: string;
			after: string;
		};
	};
	status: {
		title: string;
		lede: string;
		overall: Record<"up" | "degraded" | "down" | "unavailable", string>;
		updated: string;
		range: string;
		range30d: string;
		range24h: string;
		targets: Record<
			"workers" | "rust" | "kv" | "assets",
			{ name: string; blurb: string }
		>;
		states: Record<"up" | "degraded" | "down" | "unknown", string>;
		uptime: string;
		latency: string;
		latencyNow: string;
		latencyAvg: string;
		p95: string;
		checks: string;
		noData: string;
		errors: Record<"timeout" | "network" | "not_configured" | "http", string>;
		cpu: string;
		memory: string;
		load: string;
		cores: string;
		upFor: string;
		days: string;
		usage: string;
		showTable: string;
		time: string;
		utcNote: string;
	};
	notice: {
		title: string;
		body: string;
		coffee: string;
		dismiss: string;
		close: string;
	};
	nav: {
		cards: string;
		menu: string;
		toggle: string;
		tags: string;
		songs: string;
		phira: string;
		files: string;
		score: string;
		account: string;
		b30: string;
		hisb30: string;
		info: string;
		x30: string;
		fc30: string;
		song: string;
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
		chartsFailedHint: string;
		notesRange: string;
		targetRange: string;
		announce: string;
		rankTitle: string;
		rankLoading: string;
		rankResult: string;
		rankTied: string;
		rankNoData: string;
		rankBusy: string;
		rankHint: string;
	};
	chartSearch: {
		label: string;
		viaAlias: string;
		resultsOne: string;
		results: string;
		noResults: string;
	};
	phira: {
		title: string;
		lede: string;
		searchLabel: string;
		searchPlaceholder: string;
		download: string;
		empty: string;
		change: string;
		notes: string;
		levels: string;
		downloading: string;
		downloadingPct: string;
		downloaded: string;
		missing: string;
		failed: string;
		chartsFailed: string;
		reload: string;
	};
	files: {
		title: string;
		lede: string;
		searchLabel: string;
		searchPlaceholder: string;
		kindLabel: string;
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
		kinds: {
			all: string;
			jacket: string;
			low: string;
			blur: string;
			chart: string;
			music: string;
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
		chartsOne: string;
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
		accRequired: string;
		accInvalid: string;
		scoreInvalid: string;
		removeRow: string;
		added: string;
		removed: string;
		loading: string;
		catalogFailed: string;
		catalogFailedEmpty: string;
		full: string;
		listLabel: string;
	};
	tags: {
		title: string;
		lede: string;
		empty: string;
		index: string;
		count: string;
	};
	songs: {
		title: string;
		lede: string;
		label: string;
		placeholder: string;
		search: string;
		clear: string;
		cleared: string;
		loading: string;
		failed: string;
		unavailable: string;
		countOne: string;
		count: string;
		countTop: string;
		refine: string;
		none: string;
		noneHint: string;
		shared: string;
		viaAlias: string;
		viaId: string;
		viaComposer: string;
		viaFuzzy: string;
		composer: string;
		levels: string;
		nicknames: string;
		noNicknames: string;
		matched: string;
		card: string;
		cardFor: string;
		exampleFinds: string;
		examplesTitle: string;
		examplesBody: string;
		aboutTitle: string;
		aboutBody: string;
		proposeBody: string;
		proposeLink: string;
	};
	me: {
		title: string;
		banned: string;
		rks: string;
		lastSynced: string;
		cachedSave: string;
		timeZone: string;
		more: string;
		moreLabel: string;
		bannedTitle: string;
		noSaveTitle: string;
		noSaveBody: string;
		loading: string;
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
		binding: string;
		tokenNeeds: string;
		tokenTooLong: string;
		tokenInvalid: string;
		tokenReady: string;
		qrTitle: string;
		tokenTitle: string;
		openPhoneHint: string;
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
	tapLogin: {
		title: string;
		lede: string;
		qrTitle: string;
		signingIn: string;
		failed: string;
		discordTitle: string;
		discordLede: string;
	};
	account: {
		title: string;
		lede: string;
		discord: string;
		taptap: string;
		thisLogin: string;
		linked: string;
		notLinked: string;
		linkDiscord: string;
		linkDiscordLede: string;
		tapLinked: string;
		tapHint: string;
		discordHere: string;
		tapHere: string;
		linkedOk: string;
		discord_taken: string;
		link_expired: string;
		link_failed: string;
	};
	public: {
		hint: string;
		cta: string;
		ctaLede: string;
		metaDescription: string;
	};
	card: {
		options: string;
		optionsSaving: string;
		saveFailed: string;
		charts: string;
		quality: string;
		qualityFast: string;
		qualityHigh: string;
		background: string;
		backgroundRandom: string;
		backgroundSearch: string;
		backgroundChange: string;
		backgroundNone: string;
		backgroundResults: string;
		backgroundCurrent: string;
		style: string;
		styleNames: Record<
			"classic" | "table" | "portrait" | "timeline" | "summary",
			string
		>;
		styleHints: Record<
			| "classic"
			| "table"
			| "portrait"
			| "timeline"
			| "summary"
			| "classicHistory"
			| "classicInfo",
			string
		>;
		styleFailed: string;
		show: string;
		peer: string;
		peerNames: Record<"none" | "all" | "top" | "rank", string>;
		peerHints: Record<"none" | "all" | "top" | "rank", string>;
		rankScope: string;
		rankScopeNames: Record<"all" | "band" | "both", string>;
		rankScopeHints: Record<"all" | "band" | "both", string>;
		rankBandShow: string;
		rankBandShowNames: Record<"place" | "percent", string>;
		rankBandShowHints: Record<"place" | "percent", string>;
		peerWaitLegend: string;
		peerWait: string;
		peerWaitHint: string;
		download: string;
		share: string;
		shareFailed: string;
		openFull: string;
		zoom: string;
		fullScreen: string;
		original: string;
		zoomTitle: string;
		zoomScreen: string;
		zoomFit: string;
		zoomActual: string;
		zoomHint: string;
		zoomHintMouse: string;
		zoomArea: string;
		close: string;
		size: string;
		tagProfile: string;
		recordStats: string;
		rendering: string;
		waitingPhib19: string;
		missingData: string;
		missingParts: Record<"peers" | "tags" | "song", string>;
		missingJoin: string;
		staleData: string;
		emptyData: string;
		elapsed: string;
		slow: string;
		renderFailed: string;
		unreachable: string;
		retry: string;
		ready: string;
		failed: string;
		alt: string;
		titles: Record<"b30" | "x30" | "fc30" | "hisb30" | "info" | "song", string>;
		songChart: string;
		songSearch: string;
		songLevel: string;
		songNoLevel: string;
		songUnknown: string;
		songEmptyTitle: string;
		songEmpty: string;
		songNotFoundTitle: string;
		songNotFound: string;
		songTitle: string;
		diagnostics: string;
		stats: string;
		statsHit: string;
		statsMiss: string;
		statsCache: string;
		statsStoreR2: string;
		statsStoreKv: string;
		statsStoreBrowser: string;
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
		statsExternal: string;
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
		statsHintExternal: string;
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
		bypassHint: string;
		dismiss: string;
	};
	share: {
		menu: string;
		creating: string;
		link: string;
		hint: string;
		open: string;
		copy: string;
		copied: string;
		copyFailed: string;
		failed: string;
		revoke: string;
		revokeFailed: string;
		on: string;
	};
	notFound: { title: string; body: string; home: string };
	error: {
		code: string;
		title: string;
		body: string;
		retry: string;
		home: string;
		digest: string;
	};
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
	signInTaptap: "Continue with TapTap",
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
	theme: {
		label: "Color theme",
		light: "Light",
		dark: "Dark",
		system: "System",
	},
	home: {
		eyebrow: "Phigros cards for Discord and the web",
		title: "After the last chart.\nYour *B30* is ready.",
		lede: "Sign in with *TapTap* and your save is bound on the way in. Or use *Discord* and bind TapTap once. Your B30, history and player card open here, or in Discord with */b30*.",
		ledeSignedIn:
			"Your *B30*, history and player card open here, or in Discord with */b30*.",
		lookupsTitle: "What you can open.",
		lookupsSignedIn: "Each one opens your own card.",
		lookupsSignedOut:
			"Pick one to sign in with Discord. You come back to that card afterwards.",
		lookups: {
			b30: { name: "B30", blurb: "Best 30, plus three phi slots." },
			hisb30: {
				name: "History",
				blurb: "Recent score updates and your RKS trend.",
			},
			info: { name: "Info", blurb: "Name, RKS, player card." },
			x30: { name: "x30", blurb: "Best if a 1-Good still counts." },
			fc30: { name: "fc30", blurb: "Best Full Combo charts." },
			song: {
				name: "Song rank",
				blurb:
					"Where your accuracy on one chart places among the records on phib19.top.",
			},
		},
		nicknames: {
			name: "Nicknames",
			blurb: "Search songs by the names players use, like 无限光 or ASA.",
			hint: "No sign-in",
		},
		signInHint: "Sign in",
		signingIn: "Opening Discord…",
		newLabel: "New",
		boardTitle: "Your B30, drawn for you.",
		layoutsTitle: "Three layouts.",
		boardLede:
			"Player card, best 30 with overflow, and an RKS breakdown in one image. Run /b30 in Discord or open it here.",
		layouts: {
			classic: {
				name: "Classic",
				blurb: "Chart tiles with jacket art, score and accuracy.",
				alt: "Sample B30 card in the Classic layout: a player header with RKS 16.7073, then rows of chart tiles, each with jacket art, score and accuracy.",
			},
			table: {
				name: "Table",
				blurb: "One row per chart, with the accuracy you need to push.",
				alt: "Sample B30 card in the Table layout: a player header with RKS 16.7073, then one row per chart with its level, score, accuracy, RKS and push accuracy.",
			},
			phone: {
				name: "Phone",
				blurb: "A narrow card you can read on a phone without zooming.",
				alt: "Sample B30 card in the Phone layout: a narrow player header with RKS 16.7073, then one chart per row in a single column.",
			},
		},
		layoutsLabel: "Card layouts",
		showFull: "See the full render",
		newTab: "opens in a new tab",
		closingTitle: "Open your B30",
		closingCaption: "one more chart, then sleep.",
		openDesk: "Open your cards",
		pauseMotion: "Pause animation",
	},
	legal: {
		nav: "Legal",
		terms: "Terms of use",
		privacy: "Privacy policy",
		updated: "Last updated",
		contents: "On this page",
		agree: {
			before: "By signing in, you agree to the ",
			terms: "terms of use",
			and: " and the ",
			privacy: "privacy policy",
			after: ".",
		},
	},
	status: {
		title: "Status",
		lede: "Live health of the services behind PhiBot, checked every minute.",
		overall: {
			up: "All systems are working.",
			degraded: "Some systems are slow.",
			down: "Some systems are down.",
			unavailable:
				"Status data is unavailable right now. Try again in a minute.",
		},
		updated: "Updated",
		range: "Range",
		range30d: "30 days",
		range24h: "24 hours",
		targets: {
			workers: {
				name: "Workers",
				blurb:
					"The Cloudflare Worker that syncs song art and relays TapTap requests.",
			},
			rust: {
				name: "Rust workers",
				blurb: "Unpacks the game files when Phigros updates.",
			},
			kv: {
				name: "KV storage",
				blurb: "Cloudflare KV, where bindings, saves and settings are kept.",
			},
			assets: {
				name: "Assets worker",
				blurb: "The machine that runs the asset pipeline.",
			},
		},
		states: {
			up: "Operational",
			degraded: "Degraded",
			down: "Down",
			unknown: "No data",
		},
		uptime: "Uptime",
		latency: "Latency",
		latencyNow: "Now",
		latencyAvg: "Average",
		p95: "p95",
		checks: "checks",
		noData: "No data",
		errors: {
			timeout: "Timed out",
			network: "Unreachable",
			not_configured: "Not configured",
			http: "HTTP {code}",
		},
		cpu: "CPU",
		memory: "Memory",
		load: "Load",
		cores: "Cores",
		upFor: "Up for",
		days: "{n} days",
		usage: "CPU and memory",
		showTable: "Show as table",
		time: "Time",
		utcNote: "Times are in UTC. Checks run every minute.",
	},
	notice: {
		title: "Cards load faster now",
		body: "Image generation and loading is sped up by the Vercel Pro plan, as we can select multiple function regions. Consider buying me a cup of coffee.",
		coffee: "Buy me a coffee",
		dismiss: "Got it",
		close: "Dismiss",
	},
	nav: {
		cards: "Cards",
		menu: "Pages",
		toggle: "Menu",
		tags: "Tags",
		songs: "Nicknames",
		phira: "Phira",
		files: "Files",
		score: "Score control",
		account: "Account",
		b30: "B30",
		hisb30: "History",
		info: "Info",
		x30: "x30",
		fc30: "fc30",
		song: "Song rank",
	},
	score: {
		title: "Score control",
		lede: "Find the Perfect / Good / Bad / Miss split and the max combo that land exactly on a target score.",
		chart: "Chart",
		clearChart: "Clear chart",
		searchPlaceholder: "Title, nickname or composer",
		loadingCharts: "Loading chart list…",
		chartsFailed: "Chart list unavailable.",
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
		none: "No split of {notes} notes lands within 1 point of {score}.",
		nearest: "Closest reachable",
		useScore: "Use {score}",
		chartsFailedHint:
			"The chart list didn't load, so songs can't be searched. Type the note count instead.",
		notesRange: "Enter a note count from 1 to 5000.",
		targetRange: "Enter a score from 0 to 1000000.",
		announce:
			"Closest split: {perfect} Perfect, {good} Good, {badMiss} Bad or Miss. Exact score {exact}.",
		rankTitle: "Rank at this accuracy",
		rankLoading: "Looking up phib19 records…",
		rankResult: "#{rank} of {of} · top {percent}%",
		rankTied: "tied with {n} others",
		rankNoData: "phib19 has no records for this chart yet.",
		rankBusy: "The rank lookup didn't answer.",
		rankHint:
			"Where this accuracy would place among the anonymous records on phib19.top, with you added.",
	},
	chartSearch: {
		label: "Search songs",
		viaAlias: "Nickname",
		resultsOne: "1 song found",
		results: "{n} songs found",
		noResults: "No matching songs",
	},
	phira: {
		title: "Phira chart",
		lede: "Search a song and download one difficulty as a .pez pack.",
		searchLabel: "Song",
		searchPlaceholder: "Title, nickname or composer",
		download: "Download .pez",
		empty: "Pick a song to see its difficulties.",
		change: "Change song",
		notes: "{n} notes",
		levels: "Difficulties",
		downloading: "Downloading…",
		downloadingPct: "Downloading {pct}%",
		downloaded: "Saved {file}",
		missing: "There is no .pez pack for this difficulty yet.",
		failed: "Download failed. Check your connection and try again.",
		chartsFailed: "The chart list didn't load, so songs can't be searched.",
		reload: "Reload page",
	},
	files: {
		title: "Files",
		lede: "Search illustrations, chart packs, music and info files, then view, play or download them.",
		searchLabel: "Search files",
		searchPlaceholder: "Title, nickname or file name",
		kindLabel: "Kind",
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
		kinds: {
			all: "All",
			jacket: "Jacket",
			low: "Low",
			blur: "Blur",
			chart: "Chart",
			music: "Music",
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
		searchPlaceholder: "Title, nickname or composer",
		empty: "No charts yet. Search above to add one.",
		acc: "ACC %",
		score: "Score",
		scoreEstimated: "estimated",
		fc: "FC",
		rks: "RKS",
		remove: "Remove",
		charts: "{n} charts",
		chartsOne: "1 chart",
		save: "Save and draw cards",
		saving: "Saving…",
		saveFailed: "Could not save.",
		edit: "Edit scores",
		clear: "Delete manual scores",
		clearConfirm: "Delete every manually entered score for this login?",
		clearing: "Deleting…",
		clearFailed: "Could not delete.",
		deskNote:
			"Manual mode: cards are drawn from the accuracy you typed. If it was the two-decimal in-game figure, RKS here is approximate.",
		badge: "Manual",
		invalid:
			"Check the highlighted rows: accuracy is 0–100 and score is 0–1000000.",
		accRequired: "Enter the accuracy.",
		accInvalid: "Accuracy is 0–100, up to 6 decimals.",
		scoreInvalid: "Score is 0–1000000, or leave it blank.",
		removeRow: "Remove {chart}",
		added: "Added {chart}.",
		removed: "Removed {chart}.",
		loading: "Loading your charts…",
		catalogFailed:
			"The chart list didn't load. Your saved scores are below and can still be saved, but song names and RKS may be missing.",
		catalogFailedEmpty:
			"The chart list didn't load, so charts can't be added right now.",
		full: "That's the limit of {n} charts.",
		listLabel: "Your charts",
	},
	tags: {
		title: "Chart tags",
		lede: "Labels on the B30 tag profile. Descriptions come from phib19.",
		empty: "The tag list is not available right now.",
		index: "Categories",
		count: "{n} tags",
	},
	songs: {
		title: "Song nicknames",
		lede: "Look a song up by its title, a nickname players use for it, or its composer.",
		label: "Title, nickname or composer",
		placeholder: "无限光, ASA, Ad…",
		search: "Search",
		clear: "Clear search",
		cleared: "Search cleared",
		loading: "Loading the song list…",
		failed:
			"The song list didn't load. Press Search to look it up on the server instead.",
		unavailable: "Song search is unavailable right now. Try again in a moment.",
		countOne: "1 song matches “{q}”",
		count: "{n} songs match “{q}”",
		countTop: "Best {shown} of {n} matches for “{q}”",
		refine: "Type more of the title or nickname to narrow the list.",
		none: "No songs match “{q}”",
		noneHint:
			"Check the spelling, or try part of the title or the composer's name. If players call the song by a nickname that isn't listed yet, you can propose it.",
		shared:
			"“{q}” is a nickname for {n} songs. Check the composer and levels to find the one you mean.",
		viaAlias: "Nickname “{text}”",
		viaId: "Song ID",
		viaComposer: "Composer match",
		viaFuzzy: "Close to “{text}”",
		composer: "Composer:",
		levels: "Levels and chart constants",
		nicknames: "Nicknames",
		noNicknames: "No nicknames yet.",
		matched: "(matches your search)",
		card: "Open song card",
		cardFor: "Open song card: {song}",
		exampleFinds: "finds",
		examplesTitle: "Try a nickname",
		examplesBody: "Nicknames find songs just like titles do. Pick one:",
		aboutTitle: "Where nicknames come from",
		aboutBody:
			"The list combines phi-plugin's bundled nicknames with the ones the phib19.top community has voted in.",
		proposeBody:
			"Missing one? Propose it on phib19.top. Proposals and votes need a phib19 account, so this site can't send them for you.",
		proposeLink: "Propose a nickname on phib19.top",
	},
	me: {
		title: "Your cards",
		banned: "This account is banned. Cards are not available.",
		rks: "RKS",
		lastSynced: "Last synced",
		cachedSave: "cached save",
		timeZone: "Your time zone: {zone}",
		more: "More",
		moreLabel: "More actions",
		bannedTitle: "Cards unavailable",
		noSaveTitle: "No save yet",
		noSaveBody:
			"PhiBot has not downloaded your Phigros save yet. Refresh pulls it from TapTap, which usually takes a few seconds.",
		loading: "Loading your cards…",
	},
	bind: {
		title: "Bind Phigros",
		lede: "Scan TapTap with the account Phigros uses, or paste your sessionToken. Do not share it.",
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
		tokenSubmit: "Bind token",
		binding: "Binding…",
		tokenNeeds: "Needs 25 letters or digits · {n}/25",
		tokenTooLong: "Too long: a sessionToken has 25 letters or digits · {n}/25",
		tokenInvalid: "Letters and digits only · {n}/25",
		tokenReady: "25/25 · ready to bind",
		qrTitle: "Sign in with TapTap",
		tokenTitle: "Paste a sessionToken",
		openPhoneHint: "Or scan this code from another device:",
		or: "or",
		failed: "Bind failed.",
		manualTitle: "No account mode",
		manualLede:
			"Skip TapTap. Type the accuracy you see in game for each chart and the same cards are drawn from that.",
		manualStart: "Enter scores by hand",
		unbind: "Unbind",
		unbindConfirm: "Remove the Phigros bind from this login?",
		unbindYes: "Unbind",
		unbindNo: "Keep",
		unbinding: "Unbinding…",
		unbindFailed: "Could not unbind.",
	},
	tapLogin: {
		title: "Sign in with TapTap",
		lede: "Scan with the TapTap account Phigros uses. That signs you in and binds your save in one step, no Discord needed.",
		qrTitle: "TapTap QR code",
		signingIn: "Signing in…",
		failed: "Sign-in failed. Scan again.",
		discordTitle: "Use Discord instead",
		discordLede:
			"Already use the Discord bot? Sign in with Discord. A TapTap login can link Discord later from Account.",
	},
	account: {
		title: "Account",
		lede: "How you sign in to PhiBot.",
		discord: "Discord",
		taptap: "TapTap",
		thisLogin: "Signed in",
		linked: "Linked",
		notLinked: "Not linked",
		linkDiscord: "Link Discord",
		linkDiscordLede:
			"Your Phigros bind, card settings, B30 history and share link move to that Discord account. After that both TapTap and Discord sign in to it, and /b30 works in the Discord bot.",
		tapLinked: "Signing in with TapTap opens this account.",
		tapHint:
			"Bind your Phigros save, here or in the Discord bot, and signing in with TapTap opens this account too.",
		discordHere: "You signed in with Discord.",
		tapHere: "You signed in with TapTap. Your save is bound to this login.",
		linkedOk:
			"Discord linked. TapTap and Discord both sign in to this account now.",
		discord_taken:
			"That Discord account has a different Phigros save bound. Unbind it there first, then link again.",
		link_expired: "The link request expired. Try again.",
		link_failed: "Could not link Discord. Try again.",
	},
	public: {
		hint: "This is a public copy of their cards. Opening the page does not refresh their save.",
		cta: "Get your own cards",
		ctaLede:
			"Sign in with TapTap, or with Discord and bind Phigros, to draw yours.",
		metaDescription: "{player}'s Phigros {card}. RKS {rks}.",
	},
	card: {
		options: "Card options",
		optionsSaving: "Saving…",
		saveFailed: "Couldn't save this setting. Try again.",
		charts: "Charts",
		quality: "Quality",
		qualityFast: "Faster · normal",
		qualityHigh: "High quality · slower",
		background: "Background",
		backgroundRandom: "Random",
		backgroundSearch: "Search songs",
		backgroundChange: "Change",
		backgroundNone: "No matching songs",
		backgroundResults: "Matching songs: {n}",
		backgroundCurrent: "current",
		style: "Layout",
		styleNames: {
			classic: "Classic",
			table: "Table",
			portrait: "Phone",
			timeline: "Timeline",
			summary: "Summary",
		},
		styleHints: {
			classic: "Jackets in a grid, like the Discord bot",
			table: "Dense rows with every number",
			portrait: "One tall column sized for phones",
			timeline: "Changes grouped by save date",
			summary: "Totals and highlights of the latest update",
			classicHistory: "Recent updates and RKS trend, like the Discord bot",
			classicInfo: "Profile, progress per difficulty and trends",
		},
		styleFailed: "Couldn't save the layout. Try again.",
		show: "Show on card",
		peer: "Peer comparison",
		peerNames: {
			none: "Off",
			all: "Average",
			top: "Top %",
			rank: "Rank",
		},
		peerHints: {
			none: "No comparison badge on the chart rows.",
			all: "Average accuracy of players near your RKS.",
			top: "Your top percentage among players near your RKS.",
			rank: "Your estimated place among phib19.top records.",
		},
		rankScope: "Ranked among",
		rankScopeNames: {
			all: "All records",
			band: "±0.05 RKS",
			both: "Both",
		},
		rankScopeHints: {
			all: "Your place among every phib19.top record of the chart.",
			band: "Your place among players whose RKS is within about 0.05 of yours.",
			both: "Two lines per chart: all records, then players within about 0.05 RKS.",
		},
		rankBandShow: "±0.05 badge shows",
		rankBandShowNames: {
			place: "#Place / players",
			percent: "Top %",
		},
		rankBandShowHints: {
			place: "Your place among players near your RKS, e.g. #12 / 400.",
			percent:
				"Your top percentage among players near your RKS, e.g. Top 3.0%.",
		},
		peerWaitLegend: "Slow lookups",
		peerWait: "Wait for every badge",
		peerWaitHint:
			"When phib19.top is slow, wait up to about a minute instead of drawing the card after 2.5 s with some badges missing.",
		download: "Download",
		share: "Share image",
		shareFailed: "Couldn't share the image.",
		openFull: "Open full size",
		zoom: "View full screen",
		fullScreen: "Full screen",
		original: "Original",
		zoomTitle: "Card viewer",
		zoomScreen: "Fit screen",
		zoomFit: "Fit width",
		zoomActual: "100%",
		zoomHint: "Pinch or drag to look around. Double-tap to zoom in or out.",
		zoomHintMouse: "Scroll to look around. Double-click to zoom in or out.",
		zoomArea: "Card image, scroll to pan",
		close: "Close",
		size: "{w} × {h} px",
		tagProfile: "Tag profile",
		recordStats: "Clear / FC / AP counts",
		rendering: "Rendering card…",
		waitingPhib19: "Waiting for phib19.top…",
		missingData:
			"phib19.top didn't answer in time, so this card is missing {list}. Try again in a minute to fill them in.",
		missingParts: {
			peers: "some comparison badges",
			tags: "the chart tag analysis",
			song: "some leaderboard numbers",
		},
		missingJoin: " and ",
		staleData:
			"phib19.top didn't answer in time, so some ranks come from an earlier lookup and may be out of date. Try again in a minute to refresh them.",
		emptyData:
			"phib19.top has no figures for this peer comparison right now, so the card has no comparison badges. Pick another one in Card options, or check again later.",
		elapsed: "{seconds}s",
		slow: "Still drawing. Large cards can take up to a minute.",
		renderFailed: "Could not render this card.",
		unreachable: "Could not reach the render server.",
		retry: "Try again",
		ready: "{name} card ready.",
		failed: "{name} card failed: {error}",
		alt: "{name} card for {player}, RKS {rks}",
		titles: {
			b30: "B30",
			x30: "x30 (1-Good)",
			fc30: "fc30 (Full Combo)",
			hisb30: "Score history",
			info: "Player info",
			song: "Song rank",
		},
		songChart: "Chart",
		songSearch: "Search by title, nickname or composer",
		songLevel: "Level",
		songNoLevel: "No {level} chart",
		songUnknown: "Unknown chart",
		songEmptyTitle: "Pick a chart",
		songEmpty:
			"See your estimated position among phib19.top records for one chart, by accuracy.",
		songNotFoundTitle: "Chart not found",
		songNotFound:
			"The chart in this link isn't in the song list. Search for another one above.",
		songTitle: "{title}: {song}",
		diagnostics: "Render details",
		stats: "Timing",
		statsHit: "Hit",
		statsMiss: "Miss",
		statsCache: "JPEG",
		statsStoreR2: "R2",
		statsStoreKv: "KV",
		statsStoreBrowser: "Browser copy",
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
		statsExternal: "phib19.top",
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
		statsHintExternal:
			"Time the card waited for phib19.top: comparison badges, ranks and chart tags.",
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
		bypassHint:
			"Redraws every card from scratch. Use it if a card looks out of date.",
		dismiss: "Dismiss",
	},
	share: {
		menu: "Share link",
		creating: "Creating…",
		link: "Public link",
		hint: "Anyone with this link can see your B30, history and player info.",
		open: "Open",
		copy: "Copy",
		copied: "Copied",
		copyFailed: "Couldn't copy. Select the link and copy it.",
		failed: "Couldn't create the link. Try again.",
		revoke: "Stop sharing",
		revokeFailed: "Couldn't stop sharing. Try again.",
		on: "on",
	},
	notFound: {
		title: "Not found",
		body: "This page or share link does not exist.",
		home: "Go to the home page",
	},
	error: {
		code: "Error",
		title: "This page failed to load",
		body: "Something went wrong on our side. Try again, or go back to the home page.",
		retry: "Try again",
		home: "Home page",
		digest: "Reference",
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
	signInTaptap: "使用 TapTap 继续",
	invite: "邀请到 Discord",
	signOut: "退出",
	signedIn: "已登录",
	credit: { before: "用", after: "打造 ·", heart: "心", name: "MiyukiYue" },
	locale: { en: "EN", zh: "中文", label: "语言" },
	theme: {
		label: "颜色主题",
		light: "浅色",
		dark: "深色",
		system: "跟随系统",
	},
	home: {
		eyebrow: "Discord 和网页都能用的 Phigros 查分器",
		title: "打完一首\n快速\n查询你的 *B30*",
		lede: "用 *TapTap* 登录，存档随登录一起绑定。也可以用 *Discord* 登录，再绑定一次 TapTap。B30、成绩历史和玩家信息都能在这里打开，也可以在 Discord 里发 */b30*",
		ledeSignedIn:
			"*B30*、成绩历史和玩家信息都能在这里打开，也可以在 Discord 里发 */b30*",
		lookupsTitle: "能查什么",
		lookupsSignedIn: "点一项，直接打开你的成绩图",
		lookupsSignedOut: "点一项会先用 Discord 登录，登录后回到这张图",
		lookups: {
			b30: { name: "B30", blurb: "最好的 30 首，外加三个 AP" },
			hisb30: { name: "历史", blurb: "最近更新的成绩和 RKS 走势" },
			info: { name: "信息", blurb: "名字、RKS、玩家信息" },
			x30: { name: "x30", blurb: "算上 1 Good 时最好的谱" },
			fc30: { name: "fc30", blurb: "Full Combo 最好的谱" },
			song: {
				name: "单曲排名",
				blurb: "你在一张谱面上的准确率，在 phib19.top 的记录里排第几",
			},
		},
		nicknames: {
			name: "曲目别名",
			blurb: "用玩家常用的叫法找歌，比如“无限光”“ASA”",
			hint: "无需登录",
		},
		signInHint: "登录",
		signingIn: "正在前往 Discord…",
		newLabel: "新",
		boardTitle: "一张图看完你的 B30",
		layoutsTitle: "三种版式",
		boardLede:
			"玩家信息、Best 30 与溢出曲目、RKS 分析全在一张图里。在 Discord 里发 /b30，或直接在这里查看",
		layouts: {
			classic: {
				name: "经典",
				blurb: "每格一张谱面，显示曲绘、分数和准确率",
				alt: "经典版式的 B30 成绩图示例：顶部是玩家信息和 RKS 16.7073，下面每格一张谱面，显示曲绘、分数和准确率",
			},
			table: {
				name: "表格",
				blurb: "每行一首，附带推分需要的准确率",
				alt: "表格版式的 B30 成绩图示例：顶部是玩家信息和 RKS 16.7073，下面每行一张谱面，显示定数、分数、准确率、RKS 和推分准确率",
			},
			phone: {
				name: "手机",
				blurb: "窄版成绩图，手机上不用放大也能看清",
				alt: "手机版式的 B30 成绩图示例：窄版玩家信息和 RKS 16.7073，下面单列排列每张谱面",
			},
		},
		layoutsLabel: "成绩图版式",
		showFull: "查看完整成绩图",
		newTab: "在新标签页打开",
		closingTitle: "查看你的 B30",
		closingCaption: "再打一首就睡",
		openDesk: "查看成绩图",
		pauseMotion: "暂停动画",
	},
	legal: {
		nav: "条款与隐私",
		terms: "使用条款",
		privacy: "隐私政策",
		updated: "最后更新",
		contents: "本页目录",
		agree: {
			before: "登录即表示你同意",
			terms: "使用条款",
			and: "和",
			privacy: "隐私政策",
			after: "",
		},
	},
	status: {
		title: "运行状态",
		lede: "PhiBot 背后各项服务的实时状态，每分钟检查一次",
		overall: {
			up: "所有服务运行正常",
			degraded: "部分服务响应较慢",
			down: "部分服务不可用",
			unavailable: "暂时无法获取状态数据，请稍后再试",
		},
		updated: "更新于",
		range: "范围",
		range30d: "30 天",
		range24h: "24 小时",
		targets: {
			workers: {
				name: "Workers",
				blurb: "同步曲绘、转发 TapTap 请求的 Cloudflare Worker",
			},
			rust: { name: "Rust Workers", blurb: "Phigros 更新时解包游戏文件" },
			kv: { name: "KV 存储", blurb: "保存绑定、存档和设置的 Cloudflare KV" },
			assets: { name: "资源 Worker", blurb: "运行资源处理流程的机器" },
		},
		states: {
			up: "正常",
			degraded: "缓慢",
			down: "不可用",
			unknown: "无数据",
		},
		uptime: "可用率",
		latency: "延迟",
		latencyNow: "当前",
		latencyAvg: "平均",
		p95: "p95",
		checks: "次检查",
		noData: "无数据",
		errors: {
			timeout: "超时",
			network: "无法连接",
			not_configured: "未配置",
			http: "HTTP {code}",
		},
		cpu: "CPU",
		memory: "内存",
		load: "负载",
		cores: "核心",
		upFor: "已运行",
		days: "{n} 天",
		usage: "CPU 和内存",
		showTable: "以表格显示",
		time: "时间",
		utcNote: "时间均为 UTC，每分钟检查一次",
	},
	notice: {
		title: "成绩图加载更快了",
		body: "Image 生成和加载因 Vercel Pro 变得更快了。请考虑支持我一下😭",
		coffee: "请我喝杯咖啡",
		dismiss: "知道了",
		close: "关闭",
	},
	nav: {
		cards: "成绩图",
		menu: "页面",
		toggle: "菜单",
		tags: "标签",
		songs: "别名",
		phira: "Phira",
		files: "资源",
		score: "控分",
		account: "账号",
		b30: "B30",
		hisb30: "历史",
		info: "信息",
		x30: "x30",
		fc30: "fc30",
		song: "单曲排名",
	},
	score: {
		title: "控分计算",
		lede: "根据谱面物量和目标分数，算出恰好达成所需的 Perfect / Good / Bad / Miss 数量和最大连击。",
		chart: "谱面",
		clearChart: "清除谱面",
		searchPlaceholder: "按曲名、别名或曲师搜索",
		loadingCharts: "正在加载曲目列表…",
		chartsFailed: "曲目列表暂不可用。",
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
		roundingHint:
			"游戏显示整数分，但并不总是把精确分数四舍五入（1671 物量、FC 且 5 个 Good 为 999057.45，显示为 999058）。与目标相差 1 分以内的方案都会列出精确分数和偏差。",
		noteAccuracy:
			"准确率按完整精度显示。游戏内和成绩图只显示两位小数，存档中保留更多位数。",
		none: "{notes} 物量下没有与 {score} 分相差 1 分以内的方案。",
		nearest: "最接近的可达分数",
		useScore: "改为 {score}",
		chartsFailedHint: "曲目列表加载失败，暂时无法搜索曲目。请手动输入物量。",
		notesRange: "物量需在 1 到 5000 之间。",
		targetRange: "目标分数需在 0 到 1000000 之间。",
		announce:
			"最接近的方案：Perfect {perfect}，Good {good}，Bad/Miss {badMiss}。精确分数 {exact}。",
		rankTitle: "该准确率的排名",
		rankLoading: "正在查询 phib19 记录…",
		rankResult: "第 {rank} 名，共 {of} 条 · 前 {percent}%",
		rankTied: "与 {n} 条记录并列",
		rankNoData: "phib19 暂无该谱面的记录。",
		rankBusy: "排名查询没有响应。",
		rankHint: "按 phib19.top 的匿名记录估算，并计入你自己。",
	},
	chartSearch: {
		label: "搜索曲目",
		viaAlias: "别名",
		resultsOne: "找到 1 首曲目",
		results: "找到 {n} 首曲目",
		noResults: "没有匹配的曲目",
	},
	phira: {
		title: "Phira 谱面",
		lede: "搜索曲目，按难度下载 .pez 包。",
		searchLabel: "曲目",
		searchPlaceholder: "按曲名、别名或曲师搜索",
		download: "下载 .pez",
		empty: "选择一首曲目后会列出各难度。",
		change: "换一首",
		notes: "{n} 物量",
		levels: "难度",
		downloading: "正在下载…",
		downloadingPct: "正在下载 {pct}%",
		downloaded: "已保存 {file}",
		missing: "这个难度暂时没有 .pez 包。",
		failed: "下载失败，请检查网络后重试。",
		chartsFailed: "曲目列表加载失败，暂时无法搜索曲目。",
		reload: "重新加载页面",
	},
	files: {
		title: "资源",
		lede: "搜索曲绘、谱面包、音乐和资料文件，在线查看、试听或下载。",
		searchLabel: "搜索文件",
		searchPlaceholder: "曲名、别名或文件名",
		kindLabel: "分类",
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
		kinds: {
			all: "全部",
			jacket: "曲绘",
			low: "低清",
			blur: "模糊",
			chart: "谱面",
			music: "音乐",
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
		searchPlaceholder: "按曲名、别名或曲师搜索",
		empty: "还没有谱面。在上方搜索添加。",
		acc: "ACC %",
		score: "分数",
		scoreEstimated: "估算",
		fc: "FC",
		rks: "RKS",
		remove: "删除",
		charts: "{n} 张谱面",
		chartsOne: "1 张谱面",
		save: "保存并出图",
		saving: "正在保存…",
		saveFailed: "保存失败。",
		edit: "编辑成绩",
		clear: "删除手动成绩",
		clearConfirm: "删除当前登录下所有手动录入的成绩？",
		clearing: "正在删除…",
		clearFailed: "无法删除。",
		deskNote:
			"手动模式：成绩图由你填写的准确率生成。若填的是游戏显示的两位小数，RKS 为近似值。",
		badge: "手动",
		invalid: "请检查高亮的行：准确率范围 0–100，分数范围 0–1000000。",
		accRequired: "请填写准确率。",
		accInvalid: "准确率范围 0–100，最多 6 位小数。",
		scoreInvalid: "分数范围 0–1000000，也可以留空。",
		removeRow: "删除 {chart}",
		added: "已添加 {chart}。",
		removed: "已删除 {chart}。",
		loading: "正在加载谱面…",
		catalogFailed:
			"曲目列表加载失败。已保存的成绩仍在下方，也可以继续保存，但曲名和 RKS 可能无法显示。",
		catalogFailedEmpty: "曲目列表加载失败，暂时无法添加谱面。",
		full: "最多 {n} 张谱面。",
		listLabel: "你的谱面",
	},
	tags: {
		title: "谱面标签",
		lede: "B30 标签画像用的分类。说明来自 phib19。",
		empty: "暂时无法加载标签列表。",
		index: "分类",
		count: "{n} 个标签",
	},
	songs: {
		title: "曲目别名",
		lede: "用曲名、玩家常用的别名或曲师查找曲目。",
		label: "曲名、别名或曲师",
		placeholder: "无限光、ASA、Ad…",
		search: "搜索",
		clear: "清空搜索",
		cleared: "已清空搜索",
		loading: "正在加载曲目列表…",
		failed: "曲目列表加载失败。按“搜索”改由服务器查找。",
		unavailable: "暂时无法搜索曲目，请稍后再试。",
		countOne: "“{q}”匹配到 1 首曲目",
		count: "“{q}”匹配到 {n} 首曲目",
		countTop: "“{q}”共匹配 {n} 首，显示最接近的 {shown} 首",
		refine: "多输入一些曲名或别名可以缩小范围。",
		none: "没有与“{q}”匹配的曲目",
		noneHint:
			"检查一下拼写，或试试曲名的一部分、曲师名。如果这是还没收录的叫法，可以提交为别名。",
		shared: "“{q}”是 {n} 首曲目共用的别名，请根据曲师和难度确认是哪一首。",
		viaAlias: "别名“{text}”",
		viaId: "曲目 ID",
		viaComposer: "曲师匹配",
		viaFuzzy: "与“{text}”相近",
		composer: "曲师：",
		levels: "难度与定数",
		nicknames: "别名",
		noNicknames: "暂无别名。",
		matched: "（与搜索匹配）",
		card: "查看单曲成绩图",
		cardFor: "查看单曲成绩图：{song}",
		exampleFinds: "对应",
		examplesTitle: "试试这些别名",
		examplesBody: "别名和正式曲名一样能搜到曲目。点一个看看：",
		aboutTitle: "别名来源",
		aboutBody:
			"别名表由 phi-plugin 自带的别名和 phib19.top 社区投票通过的别名合并而成。",
		proposeBody:
			"缺少别名？到 phib19.top 提交。提交和投票需要 phib19 账号，本站无法代为提交。",
		proposeLink: "前往 phib19.top 提交别名",
	},
	me: {
		title: "你的成绩",
		banned: "这个账号已被封禁，无法查看成绩图",
		rks: "RKS",
		lastSynced: "上次同步",
		cachedSave: "缓存存档",
		timeZone: "你的时区：{zone}",
		more: "更多",
		moreLabel: "更多操作",
		bannedTitle: "无法查看成绩图",
		noSaveTitle: "还没有存档",
		noSaveBody:
			"PhiBot 还没有下载你的 Phigros 存档。点「刷新存档」从 TapTap 拉取，通常只需几秒。",
		loading: "正在加载你的成绩图…",
	},
	bind: {
		title: "绑定 Phigros",
		lede: "用 Phigros 登录的那个 TapTap 扫码，或粘贴你的 sessionToken。不要发给别人。",
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
		tokenSubmit: "用 sessionToken 绑定",
		binding: "绑定中…",
		tokenNeeds: "需要 25 位字母或数字 · {n}/25",
		tokenTooLong: "太长了：sessionToken 是 25 位字母或数字 · {n}/25",
		tokenInvalid: "只能包含字母和数字 · {n}/25",
		tokenReady: "25/25 · 可以绑定",
		qrTitle: "用 TapTap 登录",
		tokenTitle: "粘贴 sessionToken",
		openPhoneHint: "也可以用另一台设备扫描这个二维码：",
		or: "或",
		failed: "绑定失败。",
		manualTitle: "无账号模式",
		manualLede:
			"不用 TapTap。按游戏内显示逐谱面填写准确率，就能生成同样的成绩图。",
		manualStart: "手动录入成绩",
		unbind: "解绑",
		unbindConfirm: "从当前登录解除 Phigros 绑定？",
		unbindYes: "解绑",
		unbindNo: "取消",
		unbinding: "正在解绑…",
		unbindFailed: "无法解绑。",
	},
	tapLogin: {
		title: "用 TapTap 登录",
		lede: "用 Phigros 登录的那个 TapTap 扫码。登录和绑定存档一步完成，不需要 Discord。",
		qrTitle: "TapTap 二维码",
		signingIn: "正在登录…",
		failed: "登录失败，请重新扫码。",
		discordTitle: "改用 Discord",
		discordLede:
			"已经在用 Discord 机器人？用 Discord 登录即可。TapTap 登录之后也可以在「账号」里关联 Discord。",
	},
	account: {
		title: "账号",
		lede: "你登录 PhiBot 的方式。",
		discord: "Discord",
		taptap: "TapTap",
		thisLogin: "当前登录",
		linked: "已关联",
		notLinked: "未关联",
		linkDiscord: "关联 Discord",
		linkDiscordLede:
			"Phigros 绑定、成绩图设置、B30 历史和分享链接会转到那个 Discord 账号。之后用 TapTap 或 Discord 都会登录到它，Discord 机器人里的 /b30 也能用。",
		tapLinked: "用 TapTap 登录会打开这个账号。",
		tapHint:
			"在这里或 Discord 机器人里绑定 Phigros 存档后，用 TapTap 登录也会打开这个账号。",
		discordHere: "你是用 Discord 登录的。",
		tapHere: "你是用 TapTap 登录的，存档已绑定到这个登录。",
		linkedOk: "已关联 Discord。现在用 TapTap 或 Discord 都会登录到这个账号。",
		discord_taken:
			"那个 Discord 账号绑定了另一个 Phigros 存档。请先在那边解绑，再来关联。",
		link_expired: "关联请求已过期，请重试。",
		link_failed: "无法关联 Discord，请重试。",
	},
	public: {
		hint: "这是他们成绩图的公开副本。打开页面不会刷新存档。",
		cta: "生成你自己的成绩图",
		ctaLede:
			"用 TapTap 登录，或用 Discord 登录并绑定 Phigros，即可生成你的成绩图。",
		metaDescription: "{player} 的 Phigros {card}。RKS {rks}。",
	},
	card: {
		options: "成绩图选项",
		optionsSaving: "正在保存…",
		saveFailed: "设置保存失败，请重试。",
		charts: "谱面数",
		quality: "画质",
		qualityFast: "更快 · 普通",
		qualityHigh: "高画质 · 较慢",
		background: "背景",
		backgroundRandom: "随机",
		backgroundSearch: "搜索曲目",
		backgroundChange: "更换",
		backgroundNone: "没有匹配的曲目",
		backgroundResults: "匹配的曲目：{n} 首",
		backgroundCurrent: "当前",
		style: "版式",
		styleNames: {
			classic: "经典",
			table: "表格",
			portrait: "手机竖版",
			timeline: "时间线",
			summary: "摘要",
		},
		styleHints: {
			classic: "曲绘网格，与 Discord 机器人相同",
			table: "紧凑表格，数字一目了然",
			portrait: "适合手机的竖向单列",
			timeline: "按存档日期分组的变化",
			summary: "最近一次更新的总计与亮点",
			classicHistory: "最近更新与 RKS 走势，与 Discord 机器人相同",
			classicInfo: "个人资料、各难度进度与走势",
		},
		styleFailed: "版式保存失败，请重试。",
		show: "图上显示",
		peer: "与其他玩家对比",
		peerNames: {
			none: "关闭",
			all: "平均",
			top: "前百分比",
			rank: "排名",
		},
		peerHints: {
			none: "谱面行上不显示对比标记。",
			all: "与你 RKS 相近玩家的平均准确率。",
			top: "你在 RKS 相近玩家中的前百分比。",
			rank: "你在 phib19.top 记录中的估计名次。",
		},
		rankScope: "排名范围",
		rankScopeNames: {
			all: "全部记录",
			band: "±0.05 RKS",
			both: "两者",
		},
		rankScopeHints: {
			all: "你在该谱面所有 phib19.top 记录中的名次。",
			band: "只与 RKS 和你相差约 0.05 以内的玩家比较。",
			both: "每个谱面两行：全部记录，以及 RKS 相近（约 ±0.05）的玩家。",
		},
		rankBandShow: "±0.05 标记显示",
		rankBandShowNames: {
			place: "#名次 / 人数",
			percent: "前百分比",
		},
		rankBandShowHints: {
			place: "你在 RKS 相近玩家中的名次，如 #12 / 400。",
			percent: "你在 RKS 相近玩家中的前百分比，如 Top 3.0%。",
		},
		peerWaitLegend: "查询较慢时",
		peerWait: "等待全部标记",
		peerWaitHint:
			"phib19.top 较慢时最多等待约一分钟，而不是 2.5 秒后先画出缺少部分标记的图片。",
		download: "下载",
		share: "分享图片",
		shareFailed: "无法分享图片。",
		openFull: "打开原图",
		zoom: "全屏查看",
		fullScreen: "全屏",
		original: "原图",
		zoomTitle: "成绩图查看器",
		zoomScreen: "适应屏幕",
		zoomFit: "适应宽度",
		zoomActual: "100%",
		zoomHint: "双指缩放或拖动查看。轻点两下放大或还原。",
		zoomHintMouse: "滚动查看。双击放大或还原。",
		zoomArea: "成绩图图像，可滚动查看",
		close: "关闭",
		size: "{w} × {h} 像素",
		tagProfile: "谱面标签",
		recordStats: "完成 / FC / AP 数量",
		rendering: "正在出图…",
		waitingPhib19: "正在等待 phib19.top…",
		missingData: "phib19.top 未及时响应，这张图缺少{list}。请稍后重试以补全。",
		missingParts: {
			peers: "部分对比标记",
			tags: "谱面标签分析",
			song: "部分排行数据",
		},
		missingJoin: "和",
		staleData:
			"phib19.top 未及时响应，部分排名来自较早的查询，可能已过时。请稍后重试以更新。",
		emptyData:
			"phib19.top 暂时没有这种对比方式的数据，所以图上没有对比标记。可在出图选项中换一种，或稍后再看。",
		elapsed: "{seconds} 秒",
		slow: "仍在出图。大图可能需要一分钟。",
		renderFailed: "无法生成这张成绩图",
		unreachable: "无法连接到出图服务",
		retry: "重试",
		ready: "{name} 成绩图已加载。",
		failed: "{name} 成绩图加载失败：{error}",
		alt: "{player} 的 {name} 成绩图，RKS {rks}",
		titles: {
			b30: "B30",
			x30: "x30（1 Good）",
			fc30: "fc30（Full Combo）",
			hisb30: "成绩历史",
			info: "玩家信息",
			song: "单曲排名",
		},
		songChart: "谱面",
		songSearch: "按曲名、别名或曲师搜索",
		songLevel: "难度",
		songNoLevel: "没有 {level} 谱面",
		songUnknown: "未知谱面",
		songEmptyTitle: "选择一张谱面",
		songEmpty: "按准确率估算你在这张谱面的 phib19.top 记录中的位置。",
		songNotFoundTitle: "找不到这个谱面",
		songNotFound: "链接里的谱面不在曲目列表中，请在上方重新搜索。",
		songTitle: "{title}：{song}",
		diagnostics: "出图详情",
		stats: "耗时",
		statsHit: "命中",
		statsMiss: "未命中",
		statsCache: "JPEG",
		statsStoreR2: "R2",
		statsStoreKv: "KV",
		statsStoreBrowser: "浏览器缓存",
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
		statsExternal: "phib19.top",
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
		statsHintExternal:
			"出图时等待 phib19.top 的时间：对比标记、排名与谱面标签。",
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
		bypassHint: "从头重绘所有成绩图。成绩图看起来没更新时使用。",
		dismiss: "关闭",
	},
	share: {
		menu: "分享链接",
		creating: "正在生成…",
		link: "公开链接",
		hint: "任何拿到链接的人都能看到你的 B30、历史和玩家信息。",
		open: "打开",
		copy: "复制",
		copied: "已复制",
		copyFailed: "复制失败。请选中链接手动复制。",
		failed: "无法创建链接，请重试。",
		revoke: "停止分享",
		revokeFailed: "无法停止分享，请重试。",
		on: "已开启",
	},
	notFound: {
		title: "未找到",
		body: "该页面或分享链接不存在",
		home: "返回首页",
	},
	error: {
		code: "错误",
		title: "页面加载失败",
		body: "服务端出了点问题。请重试，或返回首页",
		retry: "重试",
		home: "返回首页",
		digest: "错误编号",
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
