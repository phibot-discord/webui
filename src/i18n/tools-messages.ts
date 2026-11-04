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
		diff: string;
		charts: string;
		mean: string;
		net: string;
		hold: string;
		verdict: string;
		sides: Record<"strong" | "weak" | "even", string>;
		slight: Record<"strong" | "weak", string>;
		leaning: Record<"strong" | "weak", string>;
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
		history: string;
		historyOne: string;
		historySummary: string;
		filesTitle: string;
		filesCollection: string;
		filesPv: string;
		filesPvHint: string;
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
	snapshot: {
		open: string;
		download: string;
		progress: string;
		targets: string;
		progressLegend: string;
		goal: string;
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
			"Numbers are nines of accuracy against your own charts of the same constant: +0.30 is roughly half the lost accuracy, +1.00 one more nine (99.9% where you usually get 99%), 0.00 the same as the rest.",
		howLink: "How the numbers are worked out",
		source: "Votes from kyou.net.cn, copied {date}.",
		categoriesTitle: "Categories",
		allTagsTitle: "All tags",
		allTagsHint:
			"Open a tag to see the charts counted for it. Average is your gap on those charts. Net is what the tag adds once the other tags on the same charts are accounted for; the verdict uses it. Holds is how often the net keeps its sign when your charts are resampled: a listing needs {hold}% and at least {n} charts, and counts as established from {firm}%.",
		tag: "Tag",
		category: "Category",
		diff: "+/-",
		charts: "Charts",
		mean: "Average",
		net: "Net",
		hold: "Holds",
		verdict: "Verdict",
		sides: { strong: "Strength", weak: "Weakness", even: "–" },
		slight: { strong: "Slight strength", weak: "Slight weakness" },
		leaning: { strong: "Leaning strength", weak: "Leaning weakness" },
		slightHint:
			"Leaning: the net holds in under 98% of resamples; shown in full on the card. Slight: it is under ±0.05; dimmed on the card. Ordinary score swings alone can produce either, so treat them as hints.",
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
		history: "History",
		historyOne: "One entry, {date}",
		historySummary: "{n} saved scores since {date}, from {from} to {to}",
		filesTitle: "In Files",
		filesCollection: "Collection",
		filesPv: "PV",
		filesPvHint:
			"Clips that name this song come first, then the rest of its chapter's.",
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
		lede: "Charts close in constant, note density, note mix and BPM.",
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
	search: {
		open: "Search",
		label: "Search songs and pages",
		placeholder: "Song, nickname, composer or page",
		close: "Close",
		songs: "Songs",
		pages: "Pages",
		viaAlias: "Nickname: {alias}",
		results: "{n} results",
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
	profile: {
		title: "玩家画像",
		lede: "文字版 B30 成绩图：每个槽位、B30 数据分析，以及完整的谱面标签画像和计入每个标签的谱面。",
		bestTitle: "Best 30",
		extraTitle: "候补（B28–B33）",
		slot: "#",
		song: "曲目",
		level: "难度",
		constant: "定数",
		score: "分数",
		acc: "准确率",
		rks: "RKS",
		push: "推分线",
		noPush: "无法推分",
		fc: "FC",
		ap: "AP",
		analysisTitle: "B30 数据分析",
		average: "平均 RKS（P1–P3 + B1–B27）",
		stddev: "标准差",
		tagsTitle: "谱面标签画像",
		meta: "定数 {min}–{max} · 成绩 {scores} · 已投票谱面 {charts} · 选票 {votes}",
		baseline:
			"数值以准确率的「9 的个数」计，与你自己同定数的谱面相比：+0.30 约等于失误减半，+1.00 多一个 9（你平时 99% 的地方打到 99.9%），0.00 与其余谱面持平。",
		howLink: "数值的计算方式",
		source: "投票来自 kyou.net.cn，同步于 {date}。",
		categoriesTitle: "分类",
		allTagsTitle: "全部标签",
		allTagsHint:
			"展开标签可查看计入它的谱面。「平均」是你在这些谱面上的差值；「净值」是扣除同一谱面上其他标签的影响后该标签自身的贡献，判定以它为准；「稳定」是重抽谱面时净值保持同号的比例，列出需要 {hold}% 且至少 {n} 张谱面，达到 {firm}% 才算确定。",
		tag: "标签",
		category: "分类",
		diff: "+/-",
		charts: "谱面",
		mean: "平均",
		net: "净值",
		hold: "稳定",
		verdict: "判定",
		sides: { strong: "擅长", weak: "薄弱", even: "–" },
		slight: { strong: "略擅长", weak: "略薄弱" },
		leaning: { strong: "倾向擅长", weak: "倾向薄弱" },
		slightHint:
			"倾向：净值的稳定不足 98%，成绩图上正常显示。略：净值小于 ±0.05，成绩图上变暗。正常的成绩波动也可能造成，仅供参考。",
		few: "出现在你少于 {n} 张谱面上：不会列在成绩图上。",
		chartsFor: "计入「{name}」的谱面",
		expected: "预期准确率",
		share: "权重",
		third: "三等分",
		groups: { best: "最佳", middle: "中间", worst: "最差" },
		insufficient:
			"你所在难度及以上目前只有 {n} 张已投票谱面，成绩图需要 {min} 张。可前往 kyou.net.cn/phigros 为谱面标签投票。",
		votesMissing: "谱面标签数据暂时无法读取，请稍后再试。",
		empty: "还没有已计分的谱面。",
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
		history: "历史",
		historyOne: "仅一条记录，{date}",
		historySummary: "自 {date} 起记录了 {n} 次成绩，从 {from} 到 {to}",
		filesTitle: "相关资源",
		filesCollection: "收藏品",
		filesPv: "PV",
		filesPvHint: "先列出与本曲相关的 PV，再列出同一章节的其他 PV。",
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
		challengeColors: ["", "绿", "蓝", "红", "金", "彩"],
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
		pastName: "{name}（{date}）",
		pastLabel: "或与过去的自己对比",
		pastSubmit: "与这一天对比",
		pastHint: "取存档记录中那一天结束时（北京时间）的成绩。",
		pastNote:
			"过去的成绩按现在的谱面定数计算，单曲 RKS 可能与当时游戏中显示的不同。顶部的 RKS 是游戏当时记录的数值。",
		noHistory:
			"{label}：那一天没有存档记录。存档记录从本站第一次读取你的存档时开始；未通过 TapTap 登录添加的账号没有存档记录。",
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
			"今天的每日题需要登录。从你点击「开始」起，记录就保存在 PhiBot 上，计时无法重来。练习题和往日的每日题无需登录，只保存在此浏览器中。",
			"只有今天的题目计入排行榜：先比尝试次数，次数相同再比用时。",
		],
		shareLabel: "PhiBot 猜曲绘",
		start: "开始",
		startHint: "点击「开始」后计时。",
		time: "用时",
		rankMe: "在排行榜上显示我",
		rankHint:
			"所有人都能看到你的显示名称、尝试次数和用时。随时取消勾选即可移除。",
		signInToPlay:
			"登录后即可游玩今天的题目并参与排行榜。练习题和往日的每日题无需登录。",
		pastUnranked: "往日的每日题不计入排行榜。",
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
	rankCurve: {
		title: "准确率与排名",
		signedOut: "登录后可查看各准确率在这张谱面上的排名。",
		lede: "在 phib19.top 记录的所有玩家中，各准确率在这张谱面上排第几，以及再提升一点能前进多少名。",
		level: "难度",
		load: "显示曲线",
		loading: "加载中…",
		gathering: "正在收集这张谱面的全部记录，第一次可能需要一分钟。",
		failed: "暂时无法获取排名数据。",
		retry: "重试",
		none: "这张谱面还没有记录。",
		summary: "{n} 条记录 · {ap} 个 AP · {fc} 个 FC",
		chartLabel: "{n} 条记录的排名与准确率曲线，从 {lo}% 到 100%",
		topTick: "前 {p}%",
		acc: "准确率",
		rank: "排名",
		top: "前",
		gain: "前进名次",
		ap: "AP",
		you: "你",
		tied: "与 {n} 人并列第一",
		about: "约第 {rank} 名",
		places: "+{n}",
		source: "排名根据 phib19.top 截至 {date} 的记录估算。",
	},
	songFiles: {
		music: "音乐",
		art: "曲绘",
		charts: "谱面",
		chartsHint:
			"PhiBot 保存的这首曲子的全部谱面：游戏的谱面 JSON 与 Phira 谱面包，包括当前版本以及所有旧版本和已移除的版本。",
		download: "下载",
		saving: "保存中…",
		saveLabel: "下载 {name}，{size}",
		listen: "试听 {name}",
		full: "原图",
		small: "小图",
		blur: "模糊图",
		sp: "SP",
		json: "JSON",
		pack: "Phira 谱面包",
	},
	chartPlayer: {
		title: "谱面预览",
		lede: "在浏览器里直接用游戏的谱面文件自动播放每张谱面。不是游戏原图。",
		level: "难度",
		start: "播放预览",
		startLabel: "播放 {level} 谱面预览",
		loadingChart: "正在加载谱面…",
		loadingAudio: "正在加载音乐 {p}%",
		failed: "谱面加载失败。",
		retry: "重试",
		noAudio: "此浏览器无法播放这首曲子的音频，预览将静音播放。",
		noGl: "此浏览器无法显示预览：需要 WebGL 2。",
		play: "播放",
		pause: "暂停",
		seek: "播放位置",
		back: "后退 5 秒",
		forward: "前进 5 秒",
		hitSounds: "打击音",
		hitVolume: "打击音音量",
		hitKinds: { tap: "Tap", drag: "Drag", flick: "Flick" },
		hitTest: "试听 {kind} 音效",
		settings: "设置",
		settingsTitle: "预览设置",
		soundSection: "声音",
		lookSection: "画面",
		noteSize: "音符大小",
		reset: "恢复默认",
		close: "关闭",
		speed: "播放速度",
		video: "下载视频",
		videoHint: "按当前设置把这张谱面渲染成带音乐和打击音的 1080p 60 帧 MP4。",
		videoProgress: "正在生成视频：{p}%",
		videoCancel: "取消",
		videoFailed: "此浏览器无法生成视频，请使用较新的 Chrome、Edge 或 Safari。",
		videoDone: "视频已保存到下载文件夹。",
		version: "版本",
		current: "当前版本",
		removed: "已移除的谱面",
		removedFrom: "已移除的谱面 · 来自 {version}",
		fools: "愚人节",
		noise: "噪域",
		noiseHint: "显示谱面的噪域，即游戏中屏蔽触摸的红色区域。",
		chordColors: "多押分色",
		chordColorsHint: "相邻的多押或三押及以上的多押，各用不同颜色的光晕区分。",
		fullscreen: "全屏",
		exitFullscreen: "退出全屏",
		canvas: "{title} {level} 谱面预览",
		keys: "空格键播放或暂停，方向键前进或后退 5 秒，F 键切换全屏。",
	},
	similar: {
		title: "相似谱面",
		lede: "定数、物量密度、音符构成和 BPM 相近的谱面。",
		level: "难度",
		song: "曲目",
		levelCol: "难度",
		constant: "定数",
		yours: "你的成绩",
	},
	suggest: {
		title: "接下来可以试试",
		basis: {
			ap: "你还没玩过、与你 AP 过的最难谱面相似的谱面。",
			fc: "你还没玩过、与你 Full Combo 过的最难谱面相似的谱面。",
			best: "你还没玩过、与你的最佳成绩相似的谱面。",
		},
		song: "曲目",
		level: "难度",
		constant: "定数",
		like: "类似",
		likeOf: "{song} {level}",
	},
	snapshot: {
		open: "以图片打开",
		download: "下载图片",
		progress: "把这张表做成图片分享，包含各难度的通关、FC 和 AP 数量。",
		targets: "把离你最近的十个推分目标做成图片分享。",
		progressLegend:
			"每格：已通关 / 谱面数，以及 FC 和 AP 数量。色条表示通关比例。",
		goal: "下一档 {goal}",
	},
	search: {
		open: "搜索",
		label: "搜索曲目和页面",
		placeholder: "曲名、别名、曲师或页面",
		close: "关闭",
		songs: "曲目",
		pages: "页面",
		viaAlias: "别名：{alias}",
		results: "{n} 个结果",
		none: "没有匹配的结果。",
		loading: "正在加载曲目…",
		keys: "↑ ↓ 选择 · Enter 打开 · Esc 关闭",
	},
	versions: {
		title: "版本变化",
		loading: "正在加载版本曲目表…",
		lede: "两个 Phigros 版本之间的变化：新增和移除的曲目、谱面定数调整，以及更新说明。登录后还能看到你在两个版本定数下的 RKS。",
		from: "从",
		to: "到",
		submit: "对比",
		currentLabel: "{label}（当前）",
		coverage:
			"共有 {n} 个版本有曲目表，从 {first} 到 {last}。3.19.5 及以前的表来自 phi-plugin；之后的由本站的游戏数据流程在每个版本发布时保存，因此两个已列出版本之间的版本会并入后一个。",
		unavailable: "暂时无法获取版本曲目表。",
		summaryTitle: "{from} 到 {to}",
		added: "首新增曲目",
		removed: "首移除曲目",
		changed: "张谱面定数调整",
		newCharts: "张新谱面",
		dates: "发布于 {from} 和 {to}。",
		yoursTitle: "你的 RKS",
		yoursSignedOut: "登录后可查看你在两个版本定数下的 RKS。",
		yoursNotBound: "绑定 Phigros 存档后可查看你在两个版本定数下的 RKS。",
		yoursNone: "你玩过的谱面都不同时出现在两张表中。",
		yoursHint:
			"用你现在的成绩，分别按两个版本的定数计算。某个版本没有的谱面不计入该版本的总分。",
		delta: "变化",
		yourRks: "你的 RKS 变化",
		notesTitle: "更新说明",
		changedTitle: "定数调整",
		addedTitle: "新增曲目",
		removedTitle: "移除曲目",
		chartsTitle: "新增或移除的谱面",
		song: "曲目",
		level: "难度",
		what: "变化",
		constant: "定数",
		chartAdded: "新增",
		chartRemoved: "移除",
	},
};
