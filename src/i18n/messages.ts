import type { FigureMessages } from "./figure-messages";
import type { FilesMessages } from "./files-messages";
import { globalErrorMessages } from "./global-error-messages";
import { type ToolsMessages, toolsEn } from "./tools-messages";

export type ClientMessages = ToolsMessages & {
	meta: { title: string; description: string };
	og: { cardAlt: string; pageAlt: string };
	assetRefresh: { label: string; hint: string };
	brand: string;
	skip: string;
	backToTop: string;
	loading: string;
	signIn: string;
	signInTaptap: string;
	invite: string;
	inviteUser: string;
	inviteUserHint: string;
	signOut: string;
	signedIn: string;
	credit: { before: string; after: string; heart: string; name: string };
	locale: { en: string; zh: string; ja: string; label: string };
	theme: { label: string; light: string; dark: string; system: string };
	footer: { credit: string; revision: string; more: string; source: string };
	home: {
		eyebrow: string;
		title: string;
		lede: string;
		ledeSignedIn: string;
		lookupsTitle: string;
		lookupsSignedIn: string;
		lookupsSignedOut: string;
		lookups: Record<
			| "b30"
			| "hisb30"
			| "info"
			| "x30"
			| "fc30"
			| "song"
			| "tags"
			| "simulate"
			| "targets"
			| "profile"
			| "progress"
			| "trend",
			{ name: string; blurb: string }
		>;
		explore: {
			title: string;
			intro: string;
			hint: string;
			items: Record<
				"songs" | "phira" | "score" | "files" | "pv" | "collection" | "guess",
				{ name: string; blurb: string }
			>;
		};
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
	};
	legal: {
		nav: string;
		terms: string;
		privacy: string;
		updated: string;
		contents: string;
		tldr: string;
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
			"workers" | "kv" | "assets" | "phira",
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
		daysOne: string;
		usage: string;
		players: string;
		rooms: string;
		playing: string;
		serverProcess: string;
		playersRooms: string;
		showTable: string;
		time: string;
		utcNote: string;
	};
	mp: {
		title: string;
		lede: string;
		address: string;
		online: string;
		offline: string;
		unknown: string;
		updated: string;
		players: string;
		rooms: string;
		playing: string;
		roomList: string;
		noRooms: string;
		roomsFailed: string;
		states: Record<
			"select_chart" | "waiting_for_ready" | "playing" | "other",
			string
		>;
		locked: string;
		cycle: string;
		chart: string;
		noChart: string;
		host: string;
		members: string;
		noPlayers: string;
		statusLink: string;
		open: string;
	};
	notice: {
		title: string;
		coffee: string;
		dismiss: string;
		close: string;
		open: string;
		earlier: string;
	};
	toast: {
		signIn: string;
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
		simulate: string;
		targets: string;
		profile: string;
		progress: string;
		trend: string;
		review: string;
		account: string;
		accountOf: string;
		groups: Record<"tools" | "scores" | "files", string>;
		compare: string;
		guess: string;
		pv: string;
		collection: string;
		timeline: string;
		texts: string;
		versions: string;
		charts: string;
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
		loadingMore: string;
		downloading: string;
		downloadingPct: string;
		downloaded: string;
		missing: string;
		failed: string;
		chartsFailed: string;
		reload: string;
		goneSong: string;
		removedLevel: string;
		version: string;
		versionCurrent: string;
		versionNote: string;
		sameAsCurrent: string;
		mpTitle: string;
		mpBody: string;
		mpCopy: string;
		mpCopied: string;
		mpCopyFailed: string;
	};
	simulate: {
		listLabel: string;
		moreCharts: string;
		title: string;
		lede: string;
		notice: string;
		basedOn: string;
		stale: string;
		sync: string;
		syncing: string;
		syncConfirm: string;
		syncHint: string;
		synced: string;
		alreadyLatest: string;
		syncFailed: string;
		reset: string;
		resetConfirm: string;
		resetDone: string;
		addChart: string;
		searchPlaceholder: string;
		full: string;
		alreadyListed: string;
		noRecord: string;
		newAcc: string;
		currentAcc: string;
		chartRks: string;
		removeRow: string;
		clearRow: string;
		added: string;
		removed: string;
		cleared: string;
		noGain: string;
		unknown: string;
		rksBefore: string;
		rksAfter: string;
		p3Title: string;
		p3None: string;
		listTitle: string;
		listLede: string;
		scoreHint: string;
		slot: string;
		chart: string;
		acc: string;
		score: string;
		ap: string;
		after: string;
		out: string;
		isNew: string;
		movedUp: string;
		movedDown: string;
		storageOff: string;
		loading: string;
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
		importButton: string;
		importHint: string;
		importFrom: string;
		importAdded: string;
		importImproved: string;
		importKept: string;
		importSkipped: string;
		importUnknown: string;
		importInvalid: string;
		importRepeated: string;
		importFull: string;
		importSep: string;
		importNotSaved: string;
		importNothing: string;
		importApply: string;
		importCancel: string;
		importApplied: string;
		importErrors: {
			too_large: string;
			unreadable: string;
			empty: string;
			raw_save: string;
			unknown_format: string;
			newer_version: string;
			bad_json: string;
			bad_csv: string;
			too_many_rows: string;
		};
	};
	tags: {
		title: string;
		lede: string;
		empty: string;
		index: string;
		count: string;
		countOne: string;
		plainTitle: string;
		plain: string[];
		howTitle: string;
		how: { term: string; formula?: string; text: string }[];
		readTitle: string;
		read: string[];
		profileLink: string;
		guide: string;
		loading: string;
		clipIntro: string;
		clipFor: string;
		clipNote: string;
		clipVotes: string;
		clipSong: string;
		clipReplay: string;
		exampleTitle: string;
		exampleLede: string;
		exampleCaption: string;
		exampleChart: string;
		exampleAcc: string;
		exampleSteps: Record<
			| "pool"
			| "lost"
			| "gap"
			| "share"
			| "average"
			| "net"
			| "centre"
			| "shown"
			| "read"
			| "rks"
			| "listed",
			{ term: string; text: string }
		>;
	};
	songs: {
		title: string;
		lede: string;
		songPage: string;
		songPageFor: string;
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
		openLink: string;
		copyLink: string;
		copied: string;
		copyFailed: string;
		link: string;
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
		sessionToken: string;
		sessionTokenLede: string;
		sessionTokenNone: string;
		tokenShow: string;
		tokenHide: string;
		tokenLoading: string;
		tokenHidden: string;
		tokenFailed: string;
		migrateTitle: string;
		migrateLede: string;
		migrateOpen: string;
	};
	migrate: {
		title: string;
		lede: string;
		back: string;
		fromTitle: string;
		fromLede: string;
		toTitle: string;
		toLede: string;
		useBound: string;
		boundNote: string;
		otherFrom: string;
		tokenHint: string;
		tokenSubmit: string;
		connecting: string;
		failed: string;
		change: string;
		realName: string;
		previewTitle: string;
		previewLede: string;
		compare: string;
		field: string;
		source: string;
		target: string;
		player: string;
		rks: string;
		challenge: string;
		modified: string;
		none: string;
		noSave: string;
		challengeColors: string[];
		overwrite: string;
		fresh: string;
		newer: string;
		changed: string;
		wait: string;
		run: string;
		running: string;
		restart: string;
		doneTitle: string;
		doneLede: string;
		doneSteps: string[];
		doneBound: string;
		bindTitle: string;
		bindSwitch: string;
		bindNew: string;
		bindYes: string;
		bindNo: string;
		bindDone: string;
		bindFailed: string;
		bindTap: string;
		bindTapMoves: string;
		doneBind: string;
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
		stddev: string;
		stddevExcludeP3: string;
		stddevHint: string;
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
		tapapi_rate_limited: string;
		migrate_rejected: string;
		migrate_no_source_save: string;
		migrate_same_account: string;
		migrate_expired: string;
		migrate_busy: string;
		migrate_changed: string;
		migrate_unconfirmed: string;
		migrate_failed: string;
		migrate_unverified: string;
		migrate_bind_expired: string;
		bad_request: string;
		too_many: string;
		unknown_chart: string;
	};
};

/** Everything the server renders with; pages pass the files sections to client parts as props */
export type Messages = ClientMessages & FilesMessages & FigureMessages;

export const en: ClientMessages = {
	...toolsEn,
	meta: {
		title: "PhiBot · Phigros B30 cards, RKS and game files",
		description:
			"Look up your Phigros B30, history, and player info. The same cards as the Discord bot.",
	},
	og: {
		cardAlt:
			"A PhiBot B30 card: player header, then the best charts with score and accuracy",
		pageAlt: "{title}, on PhiBot",
	},
	assetRefresh: {
		label: "Refresh files",
		hint: "Load illustrations, music, videos and packs again instead of using the copies this browser keeps",
	},
	brand: globalErrorMessages.en.brand,
	skip: "Skip to content",
	backToTop: "Back to top",
	loading: "Loading…",
	signIn: "Continue with Discord",
	signInTaptap: "Continue with TapTap",
	invite: "Add to Discord",
	inviteUser: "Add to my apps",
	inviteUserHint:
		"Use PhiBot's commands in any server or DM, even where the bot is not a member",
	signOut: "Sign out",
	signedIn: "signed in",
	credit: {
		before: "Made with",
		after: "by",
		heart: "love",
		name: "MiyukiYue",
	},
	locale: { en: "EN", zh: "中文", ja: "日本語", label: "Language" },
	theme: {
		label: "Color theme",
		light: "Light",
		dark: "Dark",
		system: "System",
	},
	footer: {
		credit: "Credit",
		revision: "Revision",
		more: "More",
		source: "Source code",
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
			tags: {
				name: "Chart tags",
				blurb: "What each label on your B30 tag profile means.",
			},
			simulate: {
				name: "Simulation",
				blurb:
					"Try better scores on some charts and see what your RKS becomes.",
			},
			targets: {
				name: "Next targets",
				blurb: "The accuracy each chart needs to push your RKS up a step.",
			},
			profile: {
				name: "Player profile",
				blurb:
					"Your B30 card as text, with every chart tag and the charts behind it.",
			},
			progress: {
				name: "Progress",
				blurb: "Clears, full combos and APs by difficulty and constant.",
			},
			trend: {
				name: "RKS trend",
				blurb: "Your RKS over time and the scores that went up.",
			},
		},
		explore: {
			title: "Open to everyone.",
			intro:
				"No sign-in. Charts, videos and the game's story, from today's version and older ones.",
			hint: "No sign-in",
			items: {
				songs: {
					name: "Nicknames",
					blurb: "Search songs by the names players use, like 无限光 or ASA.",
				},
				phira: {
					name: "Phira packs",
					blurb:
						"Any chart as a .pez pack: older versions back to 1.2.0, April Fools, removed songs and Legacy.",
				},
				score: {
					name: "Score control",
					blurb:
						"The Perfect, Good, Bad and Miss split that lands exactly on a target score.",
				},
				files: {
					name: "Files",
					blurb:
						"Illustrations, music, chart packs and chart JSON, to view or download.",
				},
				pv: {
					name: "PV",
					blurb:
						"The chapter and event videos, with the in-game overlay. Play Deduction tap by tap.",
				},
				collection: {
					name: "Collection",
					blurb:
						"Every entry and its clues, by chapter, in any of the game's five languages. Searchable.",
				},
				guess: {
					name: "Guess the song",
					blurb:
						"A daily puzzle: name the song from a blurred, recoloured close-up of its illustration.",
				},
			},
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
	},
	legal: {
		nav: "Legal",
		terms: "Terms of use",
		privacy: "Privacy policy",
		updated: "Last updated",
		contents: "On this page",
		tldr: "TL;DR",
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
			kv: {
				name: "KV storage",
				blurb: "Cloudflare KV, where bindings, saves and settings are kept.",
			},
			assets: {
				name: "Assets worker",
				blurb: "The machine that runs the asset pipeline.",
			},
			phira: {
				name: "Multiplayer server",
				blurb: "PhiBot's own Phira multiplayer server.",
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
		daysOne: "1 day",
		usage: "CPU and memory",
		players: "Players",
		rooms: "Rooms",
		playing: "{n} playing",
		serverProcess: "Server process {v}",
		playersRooms: "Players and rooms",
		showTable: "Show as table",
		time: "Time",
		utcNote: "Times are in UTC. Checks run every minute.",
	},
	mp: {
		title: "Multiplayer server",
		lede: "Who's playing on PhiBot's Phira multiplayer server right now. The page updates every 15 seconds.",
		address: "Server address",
		online: "The server is online.",
		offline: "Can't reach the server right now. Try again in a minute.",
		unknown: "Can't check the server right now.",
		updated: "Updated",
		players: "Players online",
		rooms: "Rooms",
		playing: "{n} playing",
		roomList: "Rooms",
		noRooms: "No rooms are open right now.",
		roomsFailed: "The room list is unavailable right now.",
		states: {
			select_chart: "Choosing a chart",
			waiting_for_ready: "Getting ready",
			playing: "Playing",
			other: "Unknown",
		},
		locked: "Locked",
		cycle: "Host rotates",
		chart: "Chart",
		noChart: "No chart chosen yet",
		host: "Host",
		members: "Players ({n})",
		noPlayers: "Nobody here yet",
		statusLink: "Uptime history is on the Status page.",
		open: "See rooms and players",
	},
	notice: {
		title: "What's new",
		coffee: "Buy me a coffee",
		dismiss: "Got it",
		close: "Close",
		open: "What's new",
		earlier: "Earlier updates",
	},
	toast: {
		signIn: "Sign in to open that page.",
	},
	nav: {
		cards: "Cards",
		menu: "Pages",
		toggle: "Menu",
		tags: "Tags",
		songs: "Songs",
		phira: "Phira",
		files: "Files",
		score: "Score control",
		simulate: "Simulation",
		targets: "Targets",
		profile: "Profile",
		progress: "Progress",
		trend: "Trend",
		review: "{year} Recap",
		account: "Account",
		accountOf: "Account: {name}",
		groups: { tools: "Tools", scores: "Scores", files: "Files" },
		compare: "Compare players",
		guess: "Guess the song",
		pv: "PV",
		collection: "Collection",
		timeline: "Story timeline",
		texts: "Other resources",
		versions: "Version changes",
		charts: "Chart browser",
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
		loadingMore: "Looking for Legacy, SP and older versions of these charts…",
		downloading: "Downloading…",
		downloadingPct: "Downloading {pct}%",
		downloaded: "Saved {file}",
		missing: "There is no .pez pack for this difficulty yet.",
		failed: "Download failed. Check your connection and try again.",
		chartsFailed: "The chart list didn't load, so songs can't be searched.",
		reload: "Reload page",
		goneSong:
			"The game no longer has this song. These charts come from version {v}.",
		removedLevel: "Removed · from {v}",
		version: "Game version",
		versionCurrent: "Current ({v})",
		versionNote:
			"Charts as they were in that version. Legacy charts show whichever version you pick.",
		sameAsCurrent: "Same as current",
		mpTitle: "Multiplayer server",
		mpBody:
			"PhiBot now runs its own Phira multiplayer server. In Phira's settings, turn on multiplayer and set the server address to this one.",
		mpCopy: "Copy",
		mpCopied: "Copied",
		mpCopyFailed: "Couldn't copy. Select the address and copy it.",
	},
	simulate: {
		listLabel: "Charts to edit",
		moreCharts: "Show {n} more played charts ({shown} of {total} shown)",
		title: "Song simulation",
		lede: "Type a better accuracy or score for some charts to see what your RKS and your P3 + B27 would become.",
		notice:
			"Nothing here changes your real save. The simulation is kept in this browser only.",
		basedOn: "Based on the save from",
		stale:
			"Your save was updated after you started this simulation. Sync to load it; that resets your simulated changes.",
		sync: "Sync to latest save",
		syncing: "Syncing…",
		syncHint:
			"Loads the save PhiBot holds now and resets every simulated change. To pull a newer save from TapTap, use Refresh on Cards first.",
		syncConfirm: "Reset your {n} simulated changes and load the latest save?",
		synced: "Synced to the latest save. All simulated changes were reset.",
		alreadyLatest: "Already on the latest save.",
		syncFailed: "Could not load the latest save. Try again.",
		reset: "Reset simulation",
		resetConfirm: "Remove every simulated accuracy?",
		resetDone: "Simulation reset.",
		addChart: "Add a chart that is not listed below",
		searchPlaceholder: "Search a song to simulate",
		full: "A simulation holds up to {n} charts.",
		alreadyListed: "{chart} is in the list below. Edit it there.",
		noRecord: "No record yet",
		newAcc: "New accuracy",
		currentAcc: "Now",
		chartRks: "Chart RKS",
		removeRow: "Remove {chart}",
		clearRow: "Clear the edit of {chart}",
		added: "Added {chart}.",
		removed: "Removed {chart}.",
		cleared: "Cleared {chart}.",
		noGain: "Not above your best, so nothing changes.",
		unknown: "No difficulty known for this chart.",
		rksBefore: "RKS now",
		rksAfter: "RKS simulated",
		p3Title: "P3 after the simulation",
		p3None: "No AP chart.",
		listTitle: "Your P3 + B27",
		listLede:
			"Every row starts from your current accuracy and score. Edit either one and the other follows, or tick AP. Rows keep their place while you edit; the After column shows where each chart lands. Enter and the arrow keys move down and up a column.",
		scoreHint:
			"A score is read as a full combo, the lowest accuracy it can mean, so your RKS is never overstated.",
		slot: "Now",
		chart: "Chart",
		acc: "Accuracy",
		score: "Score",
		ap: "AP",
		after: "After",
		out: "Out",
		isNew: "New",
		movedUp: "Up from {from}",
		movedDown: "Down from {from}",
		storageOff:
			"This browser would not store the simulation, so it is lost when you close the page.",
		loading: "Loading your save…",
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
		importButton: "Import a records file",
		importHint:
			"The CSV or JSON file from PhiBot's records download. A score replaces yours only when its accuracy is higher, and nothing is removed.",
		importFrom: "From {file}",
		importAdded: "New charts: {n}",
		importImproved: "Better scores: {n}",
		importKept: "Unchanged, yours is as good or better: {n}",
		importSkipped: "Skipped: {n} ({reasons})",
		importUnknown: "not in the chart list: {n}",
		importInvalid: "rows that could not be read: {n}",
		importRepeated: "repeated rows: {n}",
		importFull: "over the {max}-chart limit: {n}",
		importSep: "; ",
		importNotSaved: 'Nothing is saved until you press "Save and draw cards".',
		importNothing: "Nothing in this file is better than what you have.",
		importApply: "Add to my list",
		importCancel: "Cancel",
		importApplied:
			'Added to the list. New charts: {added}, better scores: {improved}. Press "Save and draw cards" to keep them.',
		importErrors: {
			too_large: "The file is larger than {mb} MB, so it was not read.",
			unreadable: "The file could not be read.",
			empty: "The file has no scores in it.",
			raw_save:
				"This is a raw cloud save, which contains your TapTap login token. It was discarded and nothing was imported. Use the CSV or JSON from PhiBot's records download, and do not share the raw save with anyone.",
			unknown_format: "This is not a PhiBot records file.",
			newer_version:
				"This file was made by a newer version of the site. Reload the page and try again.",
			bad_json: "The JSON in this file is damaged.",
			bad_csv: "The CSV in this file is damaged.",
			too_many_rows: "The file has more than {max} rows.",
		},
	},
	tags: {
		title: "Chart tags",
		lede: "Labels on the B30 tag profile. The labels, their descriptions and the votes come from kyou.net.cn.",
		empty: "The tag list is not available right now.",
		index: "Categories",
		count: "{n} tags",
		countOne: "1 tag",
		plainTitle: "In plain words",
		plain: [
			"The chart profile looks for the kinds of charts you play better or worse than your usual. It only compares you with yourself, never with other players.",
			"The kinds come from tags that players vote onto each chart at kyou.net.cn, such as stairs, long jacks or several judgment lines at once.",
			"PhiBot first works out how much accuracy you usually keep at each constant. A chart where you did better than that counts in favour of its tags; one where you did worse counts against them. Many charts together make a pattern.",
			"Each tag then gets an RKS. Say you are at RKS 15.20: a tag at 15.35 suits you.",
			"A tag is only listed when it is on at least four of your charts and keeps pointing the same way when your scores are reshuffled. Read a listing as a hint about what to practise, not a verdict.",
		],
		howTitle: "How the profile is worked out",

		how: [
			{
				term: "Votes",
				text: "Players vote on what makes each chart hard at kyou.net.cn/phigros. PhiBot copies the votes once a day.",
			},
			{
				term: "Pool",
				formula: "C ≥ F − 0.25",
				text: "Every chart you have played whose constant C is at most 0.25 under F, your 27th-best chart RKS, with no upper limit. Accuracy over 90% counts fully, 85% half, 80% or less not at all.",
			},
			{
				term: "Lost accuracy",
				formula: "y = −log10(1 − acc)",
				text: "Accuracy becomes how much of it you lost, to goods and bads alike, on a log scale: 90% is 1.0, 99% is 2.0, 99.9% is 3.0. Each step of 1 is ten times less lost accuracy, so 99% to 99.9% counts as much as 90% to 99%. 99.9% or more is read as at least 3.0: it only counts where the fit expects less, so an easy 100% never counts against you.",
			},
			{
				term: "Expected",
				formula: "ŷ = g(C) + Σ β × share",
				text: "One smooth curve g over constant, with a point every 0.1 and kept close to a straight line, fitted together with the tag effects β on all your pooled charts. There is no window and no minimum number of neighbours, so your hardest charts count too. A chart's own expected value comes from the fit without that chart.",
			},
			{
				term: "Gap",
				formula: "d = y − g(C)",
				text: "Measured against the curve from the fit without that chart, so 0 is your baseline at that constant and + is better. A 99.9%+ chart only counts as far as that curve expects less than 99.9%.",
			},
			{
				term: "Share",
				formula: "w = tag votes ÷ chart votes × chart weight",
				text: "A chart needs at least 3 votes, and a tag at least 5% of them.",
			},
			{
				term: "Average",
				formula: "A = Σ(w × d) ÷ (Σw + 2)",
				text: "The + 2 pulls a tag with few charts toward 0. Categories use this number, with each category's share of the votes.",
			},
			{
				term: "Net",
				formula: "β, ridge 0.5",
				text: "The tag effects from the same fit as the curve, with a ridge penalty standing in for the prior. A tag only earns what the constant and its co-tags do not already explain. β times the tag's mean share is the net: the tag's effect on a typical chart carrying it.",
			},
			{
				term: "RKS",
				formula: "acc′ = 100 − (100 − acc) × 10^(−net)",
				text: "To show a net as an RKS, every chart you have played keeps 10^(−net) of the accuracy it lost: less for a strength, more for a weakness, and an AP stays an AP. RKS is then worked out as usual, the best 27 plus the 3 best APs over 30. A net of 0 gives exactly your RKS. Averages and categories are shown the same way.",
			},
			{
				term: "Holds",
				text: "Your charts are resampled 400 times and the whole fit repeated, 99.9%+ charts included. Holds is how often the net keeps its sign.",
			},
			{
				term: "Strength",
				formula: "net ≥ +0.03 and holds ≥ 90%",
				text: "A weakness is the same with net ≤ −0.03. Tags on fewer than 4 of your charts are never listed. A net under ±0.03 that still holds is listed after the others as faint and dimmed on the card; under ±0.05 its number is dimmed. An entry that holds in under 99% of resamples still shows in full on the card, but the player profile page labels it leaning.",
			},
			{
				term: "All 99.9%+",
				text: "With fewer than 3 pooled charts under 99.9% there is no gap to measure. If PhiBot has your score history, the profile comes from the last day some charts were still under 99.9%, and the date is shown. Otherwise tags are ranked by how hard the 99.9%+ charts carrying them are, dimmed and without numbers: that shows which charts you have cleared at the top, not a skill difference.",
			},
		],
		readTitle: "How to read the numbers",
		read: [
			"15.35 next to a tag when your RKS is 15.20: if every chart played the way charts with that tag do for you, your RKS would be 15.35, so that kind of chart suits you. 14.95 would mean it costs you a quarter of a point.",
			"The steps are uneven: near 99.9% there is little accuracy left to win, so a strength adds less RKS than an equally strong weakness takes away. The higher your accuracy, the closer every tag sits to your RKS.",
			"Dimmed entries on the card are faint (the tag changes your lost accuracy by under about 7%, listed last) or slight (under about 12%, number dimmed). The player profile page also labels an entry leaning when its net holds in under 99% of resamples. Ordinary score swings alone can produce any of these, so read them as hints.",
			"The baseline is you, never other players, and only charts at or above your level count. A chart that is hard for everyone does not count against you on its own, because it is compared with what your own curve expects at its constant.",
			"Tags that always sit on the same charts cannot be told apart, so the net splits the credit between them. Where a tag also appears without its usual companions, those charts decide. Open a tag on the player profile to see which charts it comes from.",
			"An entry that holds at 99% can still be luck about one time in twenty, a leaning one about one in five. Treat a single listing as a hint, and a tag that stays listed across saves as a pattern.",
		],
		profileLink:
			"See every tag and the charts behind it on your player profile",
		guide: "Guide",
		loading: "Loading chart tags…",
		clipIntro:
			"Under each tag is a short clip from a chart players voted the tag onto, drawn by the chart preview.",
		clipFor: "Watch {tag} in {title} {level}",
		clipNote:
			"The clip loops {n} seconds of this chart where the pattern shows.",
		clipVotes: "{votes} of {total} kyou votes on this chart name this tag.",
		clipSong: "Whole chart",
		clipReplay: "Replay",
		exampleTitle: "Worked example",
		exampleLede:
			"Three IN charts and two tags, one step at a time. The accuracies are made up; the constants and kyou votes are real (votes of {date}).",
		exampleCaption:
			"Three charts with accuracy, lost accuracy y, curve g(C), gap d and tag shares",
		exampleChart: "Chart",
		exampleAcc: "Acc",
		exampleSteps: {
			pool: {
				term: "Pool",
				text: "Say F, your 27th-best chart RKS, is {floor}. All three constants are {min} or more and every accuracy is over 90%, so each chart counts fully.",
			},
			lost: {
				term: "Lost accuracy",
				text: "Each accuracy becomes the accuracy lost, on the log scale. The y column has all three.",
			},
			gap: {
				term: "Gap",
				text: "g(C) is your curve at that constant, from the fit over all your charts. {a} beats it, {b} is about level with it, {c} falls short.",
			},
			share: {
				term: "Share",
				text: "A tag's share is its votes over the chart's votes. {b} carries both tags. On {c}, {tag} has {v} of {n} votes, under 5%, so it does not count there.",
			},
			average: {
				term: "Average",
				text: "The plain average per tag. The + 2 keeps three charts from saying much. Categories use this number.",
			},
			net: {
				term: "Net",
				text: "The card uses the fit instead: how far each tag moves y off the curve, with the ridge of 0.5 pulling both toward 0. {b} has both tags and a small gap, so the loss on {c} lands on {y} and the gain on {a} on {x}.",
			},
			centre: {
				term: "Re-centred",
				text: "Both move by the same amount, so that the average chart sits at 0.",
			},
			shown: {
				term: "Shown",
				text: "β times the tag's mean share on your charts: the net, the tag's effect on a typical chart carrying it.",
			},
			read: {
				term: "Reading",
				text: "{y} {ny}: about {more}% more accuracy lost on its charts than your curve predicts. {x} {nx}: about {less}% less.",
			},
			rks: {
				term: "As RKS",
				text: "The card shows each net as an RKS. Every chart keeps 10^(−net) of the accuracy it lost: {a} at {accA} with {x}'s net would be {accA2}, RKS {ra} → {ra2}, and {c} at {accC} with {y}'s net {accC2}, RKS {rc} → {rc2}. Doing this to every chart you have played and working out RKS again (the best 27 plus the 3 best APs, over 30) gives the number next to the tag.",
			},
			listed: {
				term: "Listed?",
				text: "Not yet: a tag needs at least 4 of your charts, and its net has to keep its sign in 90% of 400 resamples. A real profile has dozens of charts.",
			},
		},
	},
	songs: {
		title: "Songs",
		lede: "Look a song up by its title, a nickname players use for it, or its composer, then open its song page for every chart, its older versions and your scores.",
		songPage: "Song page",
		songPageFor: "Song page: {song}",
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
		lede: "Sign in to TapTap with the account Phigros uses, by QR code or login link, or paste your sessionToken.",
		server: "Server",
		cn: "CN",
		gb: "Global",
		qr: "Get QR code & link",
		cancel: "Cancel",
		starting: "Getting QR…",
		waitingTap: "Waiting for TapTap…",
		scan: "Scan with the TapTap app. Can't scan? Open the login link in any browser and sign in to TapTap there.",
		scanned: "Opened in TapTap. Confirm the sign-in there.",
		openLink: "Open login link",
		copyLink: "Copy link",
		copied: "Copied",
		copyFailed: "Couldn't copy. Select the link and copy it.",
		link: "TapTap login link",
		expires: "Expires in {seconds}s",
		qrAlt: "TapTap login QR code",
		tokenLabel: "sessionToken",
		tokenPlaceholder: "25 characters",
		tokenHint: "Stays on the server. Never pasted into any chat.",
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
		lede: "Use the TapTap account Phigros uses: scan the QR code with the TapTap app, or open the login link in a browser. That signs you in and binds your save in one step, no Discord needed.",
		qrTitle: "TapTap QR code or link",
		signingIn: "Signing in…",
		failed: "Sign-in failed. Try again.",
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
		sessionToken: "Session token",
		sessionTokenLede:
			"The Phigros sessionToken your save is bound with. Anyone who has it can read and change your save, so keep it private.",
		sessionTokenNone: "No Phigros save is bound, so there is no token yet.",
		tokenShow: "Show",
		tokenHide: "Hide",
		tokenLoading: "Loading…",
		tokenHidden: "Hidden",
		tokenFailed: "Could not load the token. Try again.",
		migrateTitle: "Move save",
		migrateLede:
			"Copy a Phigros cloud save to another TapTap account, on the CN or Global server.",
		migrateOpen: "Move save",
	},
	migrate: {
		title: "Move save",
		lede: "Copy a Phigros cloud save from one TapTap account to another, on the CN or Global server. The From save is only read. The To account's cloud save is replaced.",
		back: "Back to account",
		fromTitle: "1. From",
		fromLede: "The account whose save is copied.",
		toTitle: "2. To",
		toLede:
			"Sign in to the account that gets the save. If it already has a cloud save, that save is replaced.",
		useBound: "Use bound account",
		boundNote: "The account bound on PhiBot",
		otherFrom: "Or sign in to another account",
		tokenHint:
			"The 25-character token of that account on the server picked above. It is only used for this copy.",
		tokenSubmit: "Use token",
		connecting: "Reading the save…",
		failed: "Could not read that account. Try again.",
		change: "Change",
		realName:
			"A CN TapTap account has to finish real-name verification in the TapTap app before Phigros CN lets it sign in and download the save.",
		previewTitle: "3. Check both saves",
		previewLede:
			"The To account's cloud save is replaced with the From save. The From save stays as it is.",
		compare: "From save and To save",
		field: "Save",
		source: "From",
		target: "To (replaced)",
		player: "Player",
		rks: "RKS",
		challenge: "Challenge Mode",
		modified: "Last upload",
		none: "None",
		noSave: "No cloud save",
		challengeColors: ["", "Green", "Blue", "Red", "Gold", "Rainbow"],
		overwrite:
			"The To account already has a cloud save. Continuing replaces it, and the game cannot bring it back.",
		fresh: "The To account has no cloud save yet. Continuing creates one.",
		newer:
			"The From save comes from a newer game version than the To save. Update Phigros on the To side before you download it.",
		changed:
			"A save changed since you checked. Look at both again before you continue.",
		wait: "Continue ({seconds})",
		run: "Continue",
		running: "Copying save…",
		restart: "Start over",
		doneTitle: "Save copied",
		doneLede: "The To account's cloud save now holds the From save.",
		doneSteps: [
			"Open the {server} version of Phigros and sign in with the To TapTap account.",
			"Sync the cloud save and choose to download it to the device.",
			"Do not upload from that device before downloading, or its old local save replaces the copy.",
		],
		doneBound:
			"The To account is the one bound on PhiBot. Refresh on the cards page to load the new save.",
		bindTitle: "Bind the To account on PhiBot?",
		bindSwitch:
			"PhiBot follows your bound account now. Binding the To account replaces that bind, so your cards and /b30 in Discord use the copied save. Card settings and B30 history stay.",
		bindNew: "Bind it and your cards and /b30 in Discord use the copied save.",
		bindYes: "Bind To account",
		bindNo: "Not now",
		bindDone: "The To account is bound. Your cards load the copied save.",
		bindFailed: "Could not bind the To account. Try again.",
		bindTap:
			"You signed in with TapTap, so PhiBot follows that TapTap account. To use the To account here, sign in with it instead.",
		bindTapMoves:
			"TapTap sign-in opens this PhiBot account through the account you have bound now. After you bind the To account, sign in with TapTap as the To account instead.",
		doneBind:
			"PhiBot keeps following the account you have bound. To track the To account here, unbind and bind it.",
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
		stddev: "Std dev",
		stddevExcludeP3: "Leave out P1–P3",
		stddevHint:
			"The ± figure on the B30 analysis then spreads only B1–B27 around their own average. The bars and the average still include P1–P3.",
		rendering: "Rendering card…",
		waitingPhib19: "Waiting for phib19.top…",
		missingData:
			"Some lookups didn't finish in time, so this card is missing {list}. Try again in a minute to fill them in.",
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
			"Time the card waited for phib19.top: comparison badges and ranks.",
		statsHintWait: "Your wait, including download.",
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
	error: globalErrorMessages.en.error,
	errors: {
		unauthorized: "You are not signed in.",
		unknown_card: "This card is not available.",
		not_bound: "No Phigros account is bound.",
		banned: "This account is banned.",
		no_save: "No cached save yet. Use Refresh on this site.",
		refresh_cooldown:
			"Refresh is on cooldown. Try again in a couple of minutes.",
		cache_bypass_cooldown:
			"Cache bypass is on cooldown. Try again in a few minutes.",
		refresh_failed: "Refresh failed.",
		rate_limit: "Too many requests. Wait a minute.",
		share_not_found: "This share link does not exist.",
		profile_unavailable: "This profile cannot be shown.",
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
		tapapi_rate_limited:
			"TapTap answered 429 Too Many Requests: PhiBot is being rate limited by TapTap. If it keeps happening, wait a few minutes and try again.",
		migrate_rejected:
			"The server you picked did not accept this account. Check that CN or Global matches it.",
		migrate_no_source_save:
			"The From account has no cloud save. Upload one from Phigros first.",
		migrate_same_account:
			"From and To are the same account. Sign in to a different To account.",
		migrate_expired: "The sign-in expired. Start again.",
		migrate_busy: "A save copy is already running.",
		migrate_changed: "A save changed since you checked. Look again.",
		migrate_unconfirmed: "Confirm the copy first.",
		migrate_failed: "Could not copy the save.",
		migrate_unverified:
			"The To save was written, but PhiBot could not confirm the copy. Check it in Phigros before trying again.",
		migrate_bind_expired:
			"The bind offer is closed. It stays open only a short time after the copy, and starting over closes it. If the To account is not bound yet, unbind on Account if another account is bound, then bind it on Cards.",
		bad_request: "The request was not valid.",
		too_many: "Too many scores. Remove some and save again.",
		unknown_chart: "A chart is not in the song list.",
	},
};
