import type { Pgti, PgtiFamily, PgtiStyle } from "@/lib/pgti";

export type PgtiAxis = "aim" | "range" | "grip" | "pace" | "drive";

export type PgtiLetter = NonNullable<Pgti[PgtiAxis]>["letter"];

type PgtiGroup = { name: string; line: string };

export type PgtiCode =
	`${Pgti["aim"]["letter"]}${Pgti["range"]["letter"]}${Pgti["grip"]["letter"]}${Pgti["pace"]["letter"]}`;

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
	profile: {
		title: string;
		lede: string;
		bestTitle: string;
		extraTitle: string;
		slot: string;
		song: string;
		level: string;
		constant: string;
		score: string;
		acc: string;
		rks: string;
		push: string;
		noPush: string;
		fc: string;
		ap: string;
		analysisTitle: string;
		average: string;
		stddev: string;
		tagsTitle: string;
		meta: string;
		baseline: string;
		howLink: string;
		source: string;
		categoriesTitle: string;
		allTagsTitle: string;
		allTagsHint: string;
		tag: string;
		category: string;
		curve: string;
		charts: string;
		mean: string;
		net: string;
		hold: string;
		verdict: string;
		sides: Record<"strong" | "weak" | "even", string>;
		slight: Record<"strong" | "weak", string>;
		leaning: Record<"strong" | "weak", string>;
		faint: Record<"strong" | "weak", string>;
		aps: Record<"strong" | "weak", string>;
		apsNote: string;
		historyNote: string;
		slightHint: string;
		few: string;
		chartsFor: string;
		expected: string;
		share: string;
		third: string;
		groups: Record<"best" | "middle" | "worst", string>;
		insufficient: string;
		votesMissing: string;
		empty: string;
		timeline: {
			title: string;
			lede: string;
			loading: string;
			none: string;
			date: string;
			now: string;
			rks: string;
			pool: string;
			few: string;
			partial: string;
			noTags: string;
			leaningHint: string;
		};
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
		milestones: {
			title: string;
			lede: string;
			start: string;
			startNoRks: string;
			none: string;
			rks: string;
			ap: string;
			fc: string;
			apCount: string;
			fcCount: string;
			bestDay: string;
			more: string;
		};
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
		gone: string;
		levelJacket: string;
		description: string;
		history: string;
		historyOne: string;
		historySummary: string;
		filesTitle: string;
		filesCollection: string;
		filesPv: string;
		filesPvHint: string;
		chartTags: {
			title: string;
			hint: string;
			caption: string;
			tag: string;
			category: string;
			share: string;
			votes: string;
			total: string;
			source: string;
			how: string;
		};
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
		challengeColors: string[];
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
		pastName: string;
		pastLabel: string;
		pastSubmit: string;
		pastHint: string;
		pastNote: string;
		noHistory: string;
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
		signInToPlay: string;
		pastUnranked: string;
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
	rankCurve: {
		title: string;
		lede: string;
		signedOut: string;
		level: string;
		load: string;
		loading: string;
		gathering: string;
		failed: string;
		retry: string;
		none: string;
		summary: string;
		chartLabel: string;
		topTick: string;
		acc: string;
		rank: string;
		top: string;
		gain: string;
		ap: string;
		you: string;
		tied: string;
		about: string;
		places: string;
		source: string;
	};
	songFiles: {
		music: string;
		art: string;
		charts: string;
		chartsHint: string;
		download: string;
		saving: string;
		saveLabel: string;
		listen: string;
		full: string;
		small: string;
		blur: string;
		sp: string;
		json: string;
		pack: string;
	};
	chartPlayer: {
		title: string;
		lede: string;
		level: string;
		start: string;
		startLabel: string;
		loadingChart: string;
		loadingAudio: string;
		failed: string;
		retry: string;
		noAudio: string;
		noGl: string;
		play: string;
		pause: string;
		seek: string;
		hardest: string;
		hardestHint: string;
		hardestNoise: string;
		back: string;
		forward: string;
		hitSounds: string;
		hitVolume: string;
		hitKinds: Record<"tap" | "drag" | "flick", string>;
		hitTest: string;
		settings: string;
		settingsTitle: string;
		soundSection: string;
		lookSection: string;
		noteSize: string;
		reset: string;
		close: string;
		chordColors: string;
		chordColorsHint: string;
		speed: string;
		video: string;
		videoHint: string;
		videoProgress: string;
		videoCancel: string;
		videoFailed: string;
		videoDone: string;
		version: string;
		current: string;
		removed: string;
		removedFrom: string;
		fools: string;
		noise: string;
		noiseHint: string;
		fullscreen: string;
		exitFullscreen: string;
		canvas: string;
		keys: string;
	};
	similar: {
		title: string;
		lede: string;
		level: string;
		song: string;
		levelCol: string;
		constant: string;
		yours: string;
	};
	suggest: {
		title: string;
		basis: Record<"ap" | "fc" | "best", string>;
		song: string;
		level: string;
		constant: string;
		like: string;
		likeOf: string;
	};
	charts: {
		title: string;
		lede: string;
		search: string;
		searchHint: string;
		levels: string;
		constant: string;
		from: string;
		to: string;
		tag: string;
		anyTag: string;
		otherTags: string;
		chapter: string;
		anyChapter: string;
		status: string;
		statuses: Record<"all" | "none" | "notFc" | "notAp" | "played", string>;
		signInHint: string;
		count: string;
		song: string;
		level: string;
		notes: string;
		nps: string;
		bpm: string;
		length: string;
		tags: string;
		yours: string;
		more: string;
		none: string;
		tagsNote: string;
	};
	formTargets: {
		title: string;
		lede: string;
		song: string;
		level: string;
		constant: string;
		acc: string;
		expected: string;
		gain: string;
		weak: string;
		none: string;
		profileLink: string;
	};
	snapshot: {
		open: string;
		download: string;
		progress: string;
		targets: string;
		progressLegend: string;
		goal: string;
	};
	wrapped: {
		title: string;
		range: string;
		baseline: string;
		note: string;
		rks: string;
		improved: string;
		newCharts: string;
		activeDays: string;
		ap: string;
		fc: string;
		jump: string;
		jumpSub: string;
		mostImproved: string;
		hardest: string;
		thin: string;
		none: string;
		manual: string;
		page: string;
		heading: string;
		lede: string;
		soon: string;
		soonHint: string;
		countdown: {
			label: string;
			day: string;
			days: string;
			hour: string;
			hours: string;
			minute: string;
			minutes: string;
			second: string;
			seconds: string;
			opening: string;
			open: string;
		};
		soFar: string;
		years: string;
		alt: string;
		facts: string;
		loading: string;
		deck: {
			label: string;
			next: string;
			prev: string;
			again: string;
			skip: string;
			hint: string;
			count: string;
			cover: string;
			day: string;
			dayOne: string;
			ap: string;
			fc: string;
			daysNote: string;
			rksNote: string;
			chartsNote: string;
			hardest: string;
			jumpNote: string;
			stepNote: string;
			typeLead: string;
			why: string;
			done: string;
			bye: string;
			show: string;
			busiest: string;
			name: string;
			flick: string;
			keep: string;
			motion: string;
		};
		pgti: {
			title: string;
			sub: string;
			none: string;
			axes: Record<PgtiAxis, string>;
			poles: Record<PgtiLetter, string>;
			traits: Record<PgtiLetter, string>;
			facts: Record<PgtiAxis, string>;
			names: Record<PgtiCode, string>;
			family: string;
			style: string;
			families: Record<PgtiFamily, PgtiGroup>;
			styles: Record<PgtiStyle, PgtiGroup>;
		};
		prompt: {
			ready: string;
			open: string;
			later: string;
		};
	};
	search: {
		open: string;
		label: string;
		placeholder: string;
		close: string;
		songs: string;
		pages: string;
		viaAlias: string;
		results: string;
		resultsOne: string;
		none: string;
		loading: string;
		keys: string;
	};
	versions: {
		title: string;
		lede: string;
		loading: string;
		from: string;
		to: string;
		submit: string;
		currentLabel: string;
		coverage: string;
		unavailable: string;
		summaryTitle: string;
		added: string;
		removed: string;
		changed: string;
		newCharts: string;
		dates: string;
		yoursTitle: string;
		yoursSignedOut: string;
		yoursNotBound: string;
		yoursNone: string;
		yoursHint: string;
		delta: string;
		yourRks: string;
		notesTitle: string;
		changedTitle: string;
		addedTitle: string;
		removedTitle: string;
		chartsTitle: string;
		song: string;
		level: string;
		what: string;
		constant: string;
		chartAdded: string;
		chartRemoved: string;
		acc: string;
		chartRks: string;
		b30: string;
		move: Record<"in" | "out" | "stay", string>;
		enteredTitle: string;
		leftTitle: string;
		movesNone: string;
		yoursCharts: string;
		yoursChartsHint: string;
		seriesTitle: string;
		seriesLede: string;
		seriesLoading: string;
		seriesVersion: string;
		seriesReleased: string;
		seriesCharts: string;
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
	profile: {
		title: "Player profile",
		lede: "Your B30 card as text: every slot, the B30 analysis, and the full chart profile with the charts behind each tag.",
		bestTitle: "Best 30",
		extraTitle: "Next in line (B28–B33)",
		slot: "#",
		song: "Song",
		level: "Level",
		constant: "Constant",
		score: "Score",
		acc: "Acc",
		rks: "RKS",
		push: "Push to",
		noPush: "Can't push",
		fc: "FC",
		ap: "AP",
		analysisTitle: "B30 analysis",
		average: "Average RKS (P1–P3 + B1–B27)",
		stddev: "Standard deviation",
		tagsTitle: "Chart profile",
		meta: "Constants {min}–{max} · {scores} scores · {charts} voted charts · {votes} votes",
		baseline:
			"Every number here is an RKS: the RKS you would have if every chart played the way charts with that tag play for you. Each chart keeps more or less of the accuracy it lost, goods and bads alike, by the tag's effect, and RKS is worked out again; APs stay APs. Your RKS is {rks}: a tag above it suits you, one below it costs you. The effect is measured against what the rest of your charts predict: one curve over constant plus the other tags on the chart, worked out without the chart itself.",
		howLink: "How the numbers are worked out",
		source: "Votes from kyou.net.cn, copied {date}.",
		categoriesTitle: "Categories",
		allTagsTitle: "All tags",
		allTagsHint:
			"Open a tag to see the charts counted for it. Average turns your plain gap on those charts into an RKS. Net does the same with what the tag adds once the other tags on the same charts are accounted for; the verdict uses it. Holds is how often the net keeps its direction when your charts are resampled: a listing needs {hold}% and at least {n} charts, and counts as established from {firm}%.",
		tag: "Tag",
		category: "Category",
		curve: "Curve RKS",
		charts: "Charts",
		mean: "Average",
		net: "Net",
		hold: "Holds",
		verdict: "Verdict",
		sides: { strong: "Strength", weak: "Weakness", even: "–" },
		slight: { strong: "Slight strength", weak: "Slight weakness" },
		leaning: { strong: "Leaning strength", weak: "Leaning weakness" },
		faint: { strong: "Faint strength", weak: "Faint weakness" },
		aps: { strong: "Harder APs", weak: "Easier APs" },
		apsNote:
			"Every chart here is 99.9%+, so your scores show no gap to measure. Tags are ranked by how hard the 99.9%+ charts carrying them are instead, with no numbers. This says which charts you have cleared at the top, not what you are better or worse at.",
		historyNote:
			"Every chart here is 99.9%+ now, so this profile uses your scores from {date}, the last time some of them were still under 99.9%.",
		slightHint:
			"Leaning: the net holds in under 99% of resamples; shown in full on the card. Slight: the tag changes your lost accuracy by under about 12%; its number is dimmed on the card. Faint: under about 7%; listed after the others and dimmed on the card. Ordinary score swings alone can produce any of these, so treat them as hints.",
		few: "On fewer than {n} of your charts: not listed on the card.",
		chartsFor: "Charts counted for {name}",
		expected: "Expected acc",
		share: "Share",
		third: "Third",
		groups: { best: "Best", middle: "Middle", worst: "Worst" },
		insufficient:
			"Only {n} voted charts at or above your level so far; the card needs {min}. Vote on chart tags at kyou.net.cn/phigros.",
		votesMissing: "Chart tag votes could not be loaded. Try again in a minute.",
		empty: "No scored charts yet.",
		timeline: {
			title: "Over time",
			lede: "The same profile worked out from your scores on earlier days, using today's constants and votes. Each number is an RKS from that day's scores, so it also rises as your RKS does: compare it with the RKS row. Only tags that were a strength or weakness at some point are shown.",
			loading: "Working out your profile on earlier days…",
			none: "Not enough save history yet. PhiBot needs scores from at least two different days.",
			date: "Date",
			now: "Now",
			rks: "RKS",
			pool: "Charts counted",
			few: "too few",
			partial:
				"Your save history holds {pct}% of the charts you have played, so earlier days miss some charts.",
			noTags: "No tag was a strength or weakness on any of these days.",
			leaningHint:
				"Bold numbers are listed as a strength or weakness that day; faded ones are not.",
		},
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
		milestones: {
			title: "Milestones",
			lede: "Firsts and records since PhiBot started keeping your save history, newest first. Levels use today's constants.",
			start:
				"PhiBot started keeping your history on {date}. That day you had RKS {rks}, {ap} APs and {fc} FCs over {played} charts.",
			startNoRks:
				"PhiBot started keeping your history on {date}. That day you had {ap} APs and {fc} FCs over {played} charts.",
			none: "No milestones since then yet.",
			rks: "RKS reached {at}",
			ap: "First AP on a {level}+ chart",
			fc: "First FC on a {level}+ chart",
			apCount: "{n} APs",
			fcCount: "{n} FCs",
			bestDay: "Best day so far: RKS {gain}",
			more: "Show {n} more",
		},
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
		gone: "This song is no longer in the game. The charts here come from version {v}.",
		levelJacket: "{level} illustration",
		description:
			"{title} by {composer}: chart constants {levels}, note counts, charters and every older version of its charts.",
		history: "History",
		historyOne: "One entry, {date}",
		historySummary: "{n} saved scores since {date}, from {from} to {to}",
		filesTitle: "In Files",
		filesCollection: "Collection",
		filesPv: "PV",
		filesPvHint:
			"Clips that name this song come first, then the rest of its chapter's.",
		chartTags: {
			title: "Chart tags",
			hint: "A tag's share is its part of all the votes on this chart. The chart profile weighs this chart's tags by their share.",
			caption: "Tags voted onto the {level} chart",
			tag: "Tag",
			category: "Category",
			share: "Share",
			votes: "Votes",
			total: "{n} votes on the {level} chart.",
			source: "Votes from kyou.net.cn, copied {date}.",
			how: "What the tags mean",
		},
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
		challengeColors: ["", "Green", "Blue", "Red", "Gold", "Rainbow"],
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
		pastName: "{name} on {date}",
		pastLabel: "Or compare with your past self",
		pastSubmit: "Compare with this day",
		pastHint:
			"Your scores at the end of that day (China time), from your save history.",
		pastNote:
			"Past scores use today's chart constants, so their per-chart RKS can differ from what the game showed then. The RKS at the top is the one the game recorded.",
		noHistory:
			"{label}: there is no save history for that day. Save history starts when the site first reads your save, and accounts added without a TapTap login have none.",
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
			"Today's puzzle needs a sign-in. Your run is kept on PhiBot from the moment you press Start, so the clock can't be restarted. Practice puzzles and past dailies are open to everyone and kept in this browser only.",
			"Only today's puzzle is ranked: fewer tries first, then the faster time.",
		],
		shareLabel: "PhiBot Guess",
		start: "Start",
		startHint: "The clock starts when you press Start.",
		time: "Time",
		rankMe: "Show me on the leaderboard",
		rankHint:
			"Shows your display name, tries and time to everyone. Untick it any time to take them off.",
		signInToPlay:
			"Sign in to play today's puzzle and join its leaderboard. Practice puzzles and past dailies need no account.",
		pastUnranked: "Past daily puzzles are not ranked.",
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
	rankCurve: {
		title: "Accuracy and rank",
		signedOut: "Sign in to see where each accuracy places on this chart.",
		lede: "Where each accuracy places on this chart among every player phib19.top has a record for, and what your next steps would buy.",
		level: "Difficulty",
		load: "Show the curve",
		loading: "Loading…",
		gathering:
			"Collecting every record for this chart. The first time can take a minute.",
		failed: "The rank data is unavailable right now.",
		retry: "Try again",
		none: "No records for this chart yet.",
		summary: "{n} records · {ap} AP · {fc} FC",
		chartLabel: "Rank against accuracy for {n} records, from {lo}% to 100%",
		topTick: "top {p}%",
		acc: "Accuracy",
		rank: "Rank",
		top: "Top",
		gain: "Places gained",
		ap: "AP",
		you: "You",
		tied: "Tied first with {n}",
		about: "About {rank}",
		places: "+{n}",
		source: "Ranks are estimated from phib19.top's records as of {date}.",
	},
	songFiles: {
		music: "Music",
		art: "Illustration",
		charts: "Charts",
		chartsHint:
			"Every chart PhiBot keeps for this song: the game's chart JSON and a Phira pack, for the current game and every older or removed version.",
		download: "Download",
		saving: "Saving…",
		saveLabel: "Download {name}, {size}",
		listen: "Listen to {name}",
		full: "Full size",
		small: "Small",
		blur: "Blurred",
		sp: "SP",
		json: "JSON",
		pack: "Phira pack",
	},
	chartPlayer: {
		title: "Chart preview",
		lede: "Each chart plays itself here, drawn in your browser from the game's own chart file. Not exactly same as in the game.",
		level: "Difficulty",
		start: "Play preview",
		startLabel: "Play the {level} chart preview",
		loadingChart: "Loading the chart…",
		loadingAudio: "Loading the music {p}%",
		failed: "The chart could not be loaded.",
		retry: "Try again",
		noAudio:
			"This browser cannot play the music, so the preview runs silently.",
		noGl: "This browser cannot draw the preview: it needs WebGL 2.",
		play: "Play",
		pause: "Pause",
		seek: "Position",
		hardest: "Hardest 10 s",
		hardestHint:
			"Jump to the hardest 10 seconds ({n} notes): note count weighted by note type, chords and falling speed",
		hardestNoise:
			"Jump to the hardest 10 seconds ({n} notes, with noise fields): note count weighted by note type, chords and falling speed, plus the noise fields",
		back: "Back 5 seconds",
		forward: "Forward 5 seconds",
		hitSounds: "Hit sounds",
		hitVolume: "Hit sound volume",
		hitKinds: { tap: "Tap", drag: "Drag", flick: "Flick" },
		hitTest: "Play the {kind} sound",
		settings: "Settings",
		settingsTitle: "Preview settings",
		soundSection: "Sound",
		lookSection: "Look",
		noteSize: "Note size",
		reset: "Reset to defaults",
		close: "Close",
		speed: "Playback speed",
		video: "Download video",
		videoHint:
			"Render this chart to a 1080p 60 fps MP4 with its music and hit sounds, using your current settings.",
		videoProgress: "Making the video: {p}%",
		videoCancel: "Cancel",
		videoFailed:
			"The video could not be made in this browser. Try a recent Chrome, Edge or Safari.",
		videoDone: "The video is in your downloads.",
		version: "Version",
		current: "Current",
		removed: "Removed chart",
		removedFrom: "Removed chart · from {version}",
		fools: "April Fools",
		noise: "Noise fields",
		noiseHint:
			"Show the chart's noise fields: the red areas where the game blocks touch input.",
		chordColors: "Color chords",
		chordColorsHint:
			"Give each chord its own glow color when chords sit close together or have three or more notes.",
		fullscreen: "Full screen",
		exitFullscreen: "Exit full screen",
		canvas: "{title} {level} chart preview",
		keys: "Space plays or pauses. Arrow keys skip 5 seconds. F toggles full screen.",
	},
	similar: {
		title: "Similar charts",
		lede: "Charts close in constant, note density, note mix and BPM, weighted toward the same kyou tags where players have voted on both.",
		level: "Difficulty",
		song: "Song",
		levelCol: "Level",
		constant: "Constant",
		yours: "Yours",
	},
	suggest: {
		title: "Charts to try next",
		basis: {
			ap: "Charts you have not played that look like the hardest charts you have AP'd.",
			fc: "Charts you have not played that look like the hardest charts you have full combo'd.",
			best: "Charts you have not played that look like your best scores.",
		},
		song: "Song",
		level: "Level",
		constant: "Constant",
		like: "Like",
		likeOf: "{song} {level}",
	},
	charts: {
		title: "Chart browser",
		lede: "Every scored chart in one table. Filter by level, constant, chart tag or chapter and sort by any column; signed in, you can also filter by your own scores.",
		search: "Title, composer or charter",
		searchHint: "Type to filter",
		levels: "Levels",
		constant: "Constant",
		from: "From",
		to: "To",
		tag: "Chart tag",
		anyTag: "Any tag",
		otherTags: "Other",
		chapter: "Chapter",
		anyChapter: "Any chapter",
		status: "Your scores",
		statuses: {
			all: "All charts",
			none: "Not played",
			notFc: "Not FC'd yet",
			notAp: "Not AP'd yet",
			played: "Played",
		},
		signInHint: "Sign in and bind your save to filter by your own scores.",
		count: "Showing {shown} of {total} charts.",
		song: "Song",
		level: "Level",
		notes: "Notes",
		nps: "Notes/s",
		bpm: "BPM",
		length: "Length",
		tags: "Top tags",
		yours: "Your acc",
		more: "Show {n} more",
		none: "No chart matches these filters.",
		tagsNote:
			"Tags come from the chart-tag votes on kyou.net.cn: a chart has a tag when it gets at least 5% of the chart's votes. Notes per second divide the note count by the song length.",
	},
	formTargets: {
		title: "Below your usual form",
		lede: "Charts you have played where your accuracy is under the expected accuracy from your profile, which is what the rest of your charts predict for it from its constant and tags. Reaching it would add the RKS shown. Weak tags are the profile weaknesses the chart carries.",
		song: "Song",
		level: "Level",
		constant: "Constant",
		acc: "Acc",
		expected: "Expected",
		gain: "RKS gain",
		weak: "Weak tags",
		none: "None of your charts sit far enough below your usual form to change your RKS.",
		profileLink: "Open your profile",
	},
	snapshot: {
		open: "Open as image",
		download: "Download image",
		progress:
			"An image of this grid with clears, FCs and APs per level, for sharing.",
		targets: "An image of your ten closest targets, for sharing.",
		progressLegend:
			"Each cell: charts cleared out of charts, with FC and AP counts. The bar shows the cleared share.",
		goal: "next {goal}",
	},
	wrapped: {
		title: "{year} Recap",
		range: "{from} to {to}, China time",
		baseline:
			"Counted from {day}, the day after PhiBot first saw your save; earlier progress is not in its records.",
		note: "Dates are when your save was uploaded, not when you played. Plays between two uploads count as one. RKS is the in-game value at each upload, so a change of chart constants moves it too.",
		rks: "RKS",
		improved: "Charts improved",
		newCharts: "New charts",
		activeDays: "Days with progress",
		ap: "New all perfects",
		fc: "New full combos",
		jump: "Biggest jump",
		jumpSub: "{gain} RKS since {since}",
		mostImproved: "Biggest step on one chart",
		hardest: "Hardest: {chart}",
		thin: "Not enough data",
		none: "PhiBot has no score history for {year}. It records your progress each time your save is refreshed on the site or through the bot.",
		manual:
			"Manual profiles have no score history, so there is nothing to review.",
		page: "{year} Recap",
		heading: "Your {year} Recap",
		lede: "Your year from PhiBot's records of your save: a deck of cards to flick through, the same facts as a list, and an image to download and post.",
		soon: "Your recap opens on {day} at 00:00 China time (UTC+8).",
		soonHint:
			"Until then, refresh your save after you play: PhiBot only records what it sees when your save is refreshed.",
		countdown: {
			label: "Time until your recap opens",
			day: "day",
			days: "days",
			hour: "hour",
			hours: "hours",
			minute: "min",
			minutes: "mins",
			second: "sec",
			seconds: "secs",
			opening: "Opening your recap…",
			open: "Open your recap",
		},
		soFar:
			"The year is not over yet: this covers your uploads so far and grows each time you refresh your save.",
		years: "Year",
		alt: "Your {year} recap as an image. The same facts are listed above.",
		facts: "The same facts as a list",
		loading: "Loading your recap…",
		deck: {
			label: "Your {year} in cards",
			next: "Next card",
			prev: "Previous card",
			again: "Deal again",
			skip: "Skip to the numbers",
			hint: "Tap, swipe or use the arrow keys",
			count: "Card {n} of {total}",
			cover: "Your year, one card at a time.",
			day: "{day} · {n} charts",
			dayOne: "{day} · 1 chart",
			ap: "{n} new AP",
			fc: "{n} new FC",
			daysNote: "Every dot is a day with an upload. Tap one.",
			rksNote: "{delta} since the year began",
			chartsNote: "Old favourites polished, new ones opened.",
			hardest: "The hardest one",
			jumpNote: "Your best day.",
			stepNote: "Same chart, better hands.",
			typeLead: "And you are",
			why: "Why this type",
			done: "That was {year}",
			bye: "See you on the next chart.",
			show: "Show its card",
			busiest: "Busiest month: {month}",
			name: "Recap",
			flick: "Flick me",
			keep: "Keep the combo going",
			motion: "Tilt to flick",
		},
		pgti: {
			title: "Your PGTI",
			sub: "Phigros Type Indicator: letters from how you play, plus a family and a style. For fun, not science.",
			none: "Not enough records for a type yet.",
			axes: {
				aim: "Aim",
				range: "Range",
				grip: "Grip",
				pace: "Pace",
				drive: "Drive",
			},
			poles: {
				P: "Polish",
				R: "Reach",
				E: "Explorer",
				F: "Focused",
				S: "Steady",
				W: "Wild",
				M: "Marathon",
				B: "Burst",
				G: "Growing",
				K: "Keeping",
			},
			traits: {
				P: "Your rating comes from clean scores.",
				R: "Your rating comes from charts above your comfort zone.",
				E: "You try most of what sits at your level.",
				F: "You keep to a chosen few and know them well.",
				S: "When you play well, the combo usually holds.",
				W: "You score high even when the combo breaks.",
				M: "You kept at it across the year.",
				B: "Your progress came in bursts.",
				G: "Your RKS climbed this year.",
				K: "You held your level this year.",
			},
			facts: {
				aim: "Average accuracy of your best 27: {acc}%",
				range: "{played} of the {total} charts at your level and above",
				grip: "Full combo on {fc} of your {total} cleanest scores",
				pace: "Progress in {months} of {total} months",
				drive: "RKS change this year: {gain}",
			},
			names: {
				PESM: "The Cartographer",
				PESB: "The Curator",
				PEWM: "The Wanderer",
				PEWB: "The Comet",
				PFSM: "The Metronome",
				PFSB: "The Sniper",
				PFWM: "The Sculptor",
				PFWB: "The Jeweler",
				RESM: "The Trailblazer",
				RESB: "The Storm Chaser",
				REWM: "The Daredevil",
				REWB: "The Wildfire",
				RFSM: "The Climber",
				RFSB: "The Sprinter",
				RFWM: "The Boss Hunter",
				RFWB: "The Meteor",
			},
			family: "Family",
			style: "Style",
			families: {
				collector: {
					name: "Collectors",
					line: "Clean scores across a wide shelf.",
				},
				crafter: {
					name: "Crafters",
					line: "A few charts, polished until they shine.",
				},
				adventurer: {
					name: "Adventurers",
					line: "Always somewhere new, usually somewhere hard.",
				},
				challenger: {
					name: "Challengers",
					line: "A handful of walls, climbed again and again.",
				},
			},
			styles: {
				clockwork: {
					name: "Clockwork",
					line: "Steady hands, steady calendar.",
				},
				ambush: {
					name: "Ambush",
					line: "Quiet for a while, then a clean strike.",
				},
				grinder: {
					name: "Grinder",
					line: "Shows up all year and swings hard.",
				},
				fireworks: { name: "Fireworks", line: "Rare, loud and bright." },
			},
		},
		prompt: {
			ready: "Your {year} recap is ready.",
			open: "Deal my cards",
			later: "Not now",
		},
	},
	search: {
		open: "Search",
		label: "Search songs and pages",
		placeholder: "Song, nickname, composer or page",
		close: "Close",
		songs: "Songs",
		pages: "Pages",
		viaAlias: "Nickname: {alias}",
		results: "{n} results",
		resultsOne: "1 result",
		none: "Nothing matches.",
		loading: "Loading songs…",
		keys: "↑ ↓ to move · Enter to open · Esc to close",
	},
	versions: {
		title: "Version changes",
		loading: "Loading version tables…",
		lede: "What changed between two Phigros versions: new and removed songs, chart constant changes, and release notes. Signed in, you also see your RKS under each version's constants.",
		from: "From",
		to: "To",
		submit: "Compare",
		currentLabel: "{label} (current)",
		coverage:
			"{n} versions have song tables, from {first} to {last}. Tables up to 3.19.5 come from phi-plugin; later ones are saved by the site's game data pipeline as each build comes out, so a version between two listed ones is folded into the next.",
		unavailable: "The version tables are unavailable right now.",
		summaryTitle: "{from} to {to}",
		added: "songs added",
		removed: "songs removed",
		changed: "constants changed",
		newCharts: "new charts",
		dates: "Released {from} and {to}.",
		yoursTitle: "Your RKS",
		yoursSignedOut: "Sign in to see your RKS under both versions' constants.",
		yoursNotBound:
			"Bind a Phigros save to see your RKS under both versions' constants.",
		yoursNone: "None of your played charts are in both tables.",
		yoursHint:
			"Your current scores, rated with each version's constants. Charts a version does not have are left out of its total.",
		delta: "Change",
		yourRks: "Your RKS change",
		notesTitle: "Release notes",
		changedTitle: "Constant changes",
		addedTitle: "Songs added",
		removedTitle: "Songs removed",
		chartsTitle: "Charts added or removed",
		song: "Song",
		level: "Level",
		what: "Change",
		constant: "Constant",
		chartAdded: "Added",
		chartRemoved: "Removed",
		acc: "Acc",
		chartRks: "Chart RKS",
		b30: "B30",
		move: { in: "Enters", out: "Leaves", stay: "Stays" },
		enteredTitle: "Enter your B30 under {to}",
		leftTitle: "Leave your B30 under {to}",
		movesNone: "Your B30 holds the same charts under both versions.",
		yoursCharts: "Your charts with a new constant",
		yoursChartsHint:
			"Charts you have played whose constant changed, rated with your current accuracy. Charts that enter or leave your B30 come first.",
		seriesTitle: "Your RKS in every version",
		seriesLede:
			"Your current scores rated with each version's constants, newest first. Versions that leave it unchanged are left out.",
		seriesLoading: "Rating your scores under every version…",
		seriesVersion: "Version",
		seriesReleased: "Released",
		seriesCharts: "Charts",
	},
};
