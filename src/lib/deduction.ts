import { COLLECTION_LANGS, type CollectionLang } from "./collection";
import { v1Body } from "./parse";

export const DEDUCTION_KEY = "deduction/index.json";

/** The game runs the scene at 60 fps on most phones; every timing below is quantised to its frames */
export const DED_FPS = 60;

export const DED_LAYERS = [
	"img1",
	"img2",
	"img3",
	"img3_1",
	"img3_2",
	"img3_3",
	"img3_4",
	"img3_5",
	"img3_6",
] as const;
export type DedLayer = (typeof DED_LAYERS)[number];

export const DED_SOUNDS = [
	"ambient",
	"img2SE",
	"whiteToImg3SE",
	"img3_1SE",
	"img3_2SE",
] as const;
export type DedSoundId = (typeof DED_SOUNDS)[number];

export type DedLine = Partial<Record<CollectionLang, string>>;
export type DedPage = { visual: number; lines: DedLine[] };
export type DedImage = { file: string; width: number; height: number };
export type DedSound = { file: string; volume: number; loop: boolean };

export type Deduction = {
	pages: DedPage[];
	layers: Partial<Record<DedLayer, DedImage>>;
	gradient: DedImage | null;
	sounds: Partial<Record<DedSoundId, DedSound>>;
	typing: DedSound[];
	fade: { in: number; out: number };
};

function num(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function fileOf(v: unknown, dir: string): string | undefined {
	return typeof v === "string" &&
		v.startsWith(`${dir}/`) &&
		!v.includes("..") &&
		/^[\w./-]+$/.test(v)
		? v
		: undefined;
}

function imageOf(v: unknown): DedImage | undefined {
	const o = v as Record<string, unknown> | null;
	const file = fileOf(o?.file, "deduction");
	const width = num(o?.width);
	const height = num(o?.height);
	return file && width && height ? { file, width, height } : undefined;
}

function soundOf(v: unknown): DedSound | undefined {
	const o = v as Record<string, unknown> | null;
	const file = fileOf(o?.file, "deduction");
	if (!file?.endsWith(".ogg")) return undefined;
	return { file, volume: num(o?.volume) ?? 1, loop: o?.loop === true };
}

function lineOf(v: unknown): DedLine | undefined {
	if (!v || typeof v !== "object") return undefined;
	const o = v as Record<string, unknown>;
	const line: DedLine = {};
	for (const lang of COLLECTION_LANGS) {
		const text = o[lang];
		if (typeof text === "string") line[lang] = text;
	}
	return Object.keys(line).length ? line : undefined;
}

export function parseDeduction(raw: unknown): Deduction | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.pages)) return undefined;
	const pages: DedPage[] = [];
	for (const row of body.pages) {
		const r = row as Record<string, unknown> | null;
		const visual = num(r?.visual);
		if (visual === undefined || !Array.isArray(r?.lines)) return undefined;
		const lines = r.lines.flatMap((l) => {
			const line = lineOf(l);
			return line ? [line] : [];
		});
		if (!lines.length) return undefined;
		pages.push({ visual: Math.trunc(visual), lines });
	}
	if (!pages.length) return undefined;
	const layerRows = (body.layers ?? {}) as Record<string, unknown>;
	const layers: Partial<Record<DedLayer, DedImage>> = {};
	for (const id of DED_LAYERS) {
		const image = imageOf(layerRows[id]);
		if (image) layers[id] = image;
	}
	if (!layers.img1) return undefined;
	const soundRows = (body.sounds ?? {}) as Record<string, unknown>;
	const sounds: Partial<Record<DedSoundId, DedSound>> = {};
	for (const id of DED_SOUNDS) {
		const sound = soundOf(soundRows[id]);
		if (sound) sounds[id] = sound;
	}
	const typing = Array.isArray(body.typing)
		? body.typing.flatMap((t) => {
				const sound = soundOf(t);
				return sound ? [sound] : [];
			})
		: [];
	const fade = body.fade as Record<string, unknown> | null;
	return {
		pages,
		layers,
		gradient: imageOf(body.gradient) ?? null,
		sounds,
		typing,
		fade: { in: num(fade?.in) ?? 0.5, out: num(fade?.out) ?? 1.5 },
	};
}

/** As the game: the phone's language, else English for another set language, else Chinese */
export function dedText(line: DedLine, lang: CollectionLang): string {
	const order: CollectionLang[] =
		lang === "zh-CN"
			? ["zh-CN", "en"]
			: lang === "en"
				? ["en", "zh-CN"]
				: [lang, "en", "zh-CN"];
	for (const each of order) {
		const text = line[each];
		if (text) return text;
	}
	return "";
}

const TYPE_SECONDS = 0.058;
const FADE_SECONDS = 0.5;
const INDICATOR_DELAY = 0.5;
const BLINK_SECONDS = 0.45;
const WHITE_POINT = 0.999;

export const DED_CURSOR = "▏";
export const DED_INDICATOR = "▼";

function frames(seconds: number): number {
	return Math.ceil(seconds * DED_FPS - 1e-6);
}

function smooth(t: number): number {
	return t * t * (3 - 2 * t);
}

type Target = DedLayer | "levels" | "gradient" | "group" | "indicator";

type Tween = {
	target: Target;
	from: number | null;
	to: number;
	start: number;
	seconds: number;
	curve: "linear" | "smooth";
	ambient: boolean;
};

type Op =
	| { at: number; kind: "tween"; tween: Omit<Tween, "start"> }
	| { at: number; kind: "sound"; sound: DedSoundId }
	| { at: number; kind: "set"; target: DedLayer; value: number }
	| { at: number; kind: "page" }
	| { at: number; kind: "type" }
	| { at: number; kind: "end" };

export type DedSoundEvent =
	| { frame: number; kind: "typing"; voice: number }
	| { frame: number; kind: "sound"; sound: DedSoundId };

export type DedLineView = {
	full: string;
	shown: number | null;
	cursor: boolean;
};

export type DedView = {
	frame: number;
	page: number;
	layers: Record<DedLayer, number>;
	levels: number;
	gradient: number;
	group: number;
	indicator: number;
	ambient: number;
	lines: DedLineView[];
	waiting: boolean;
	ended: boolean;
};

/** A white-out of `levels` as the game's post effect does it: brighten by this factor, then lift by `levels` */
export function levelsGain(levels: number): number {
	return 1 / (1 - WHITE_POINT * Math.min(1, Math.max(0, levels)));
}

/** `C9DeductionControl` stepped one 60 fps frame at a time, in Unity's order: input, then coroutines */
export class DeductionSim {
	readonly data: Deduction;
	lang: CollectionLang;
	private frame = 0;
	private layers: Record<DedLayer, number>;
	private levels = 1;
	private ambient = 0;
	private gradient = 0;
	private group = 0;
	private indicator = 0;
	private page = 0;
	private lineIndex = 0;
	private shown: (number | null)[] = [];
	private animating = true;
	private typing: { line: number; k: number; next: number } | null = null;
	private cursor = true;
	private nextBlink = 0;
	private voice = 0;
	private ops: Op[] = [];
	private tweens: Tween[] = [];
	private indicatorAt: number | null = null;
	private pendingPage = 0;
	private ended = false;
	private events: DedSoundEvent[] = [];

	constructor(data: Deduction, lang: CollectionLang) {
		this.data = data;
		this.lang = lang;
		this.layers = Object.fromEntries(
			DED_LAYERS.map((id) => [id, id === "img1" ? 1 : 0]),
		) as Record<DedLayer, number>;
		this.renderPage();
		this.schedule([
			{
				at: 2,
				kind: "tween",
				tween: this.levelsTween(1, 0, data.fade.in, true),
			},
			{
				at: 2 + frames(data.fade.in),
				kind: "tween",
				tween: this.fade("gradient", 0, 1),
			},
			{
				at: 2 + frames(data.fade.in) + frames(FADE_SECONDS),
				kind: "tween",
				tween: this.fade("group", 0, 1),
			},
			{
				at: 2 + frames(data.fade.in) + 2 * frames(FADE_SECONDS),
				kind: "type",
			},
		]);
	}

	private lines(): DedLine[] {
		return this.data.pages[this.page]?.lines ?? [];
	}

	private text(line: number): string {
		const own = this.lines()[line];
		return own ? dedText(own, this.lang) : "";
	}

	private fade(
		target: Target,
		from: number | null,
		to: number,
	): Omit<Tween, "start"> {
		return {
			target,
			from,
			to,
			seconds: FADE_SECONDS,
			curve: "linear",
			ambient: false,
		};
	}

	private levelsTween(
		from: number,
		to: number,
		seconds: number,
		ambient: boolean,
	): Omit<Tween, "start"> {
		return { target: "levels", from, to, seconds, curve: "smooth", ambient };
	}

	private schedule(ops: Op[]) {
		this.ops.push(...ops);
		this.ops.sort((a, b) => a.at - b.at);
	}

	private renderPage() {
		this.shown = this.lines().map(() => null);
		this.lineIndex = 0;
		this.typing = null;
		this.indicator = 0;
		this.indicatorAt = null;
	}

	private get(target: Target): number {
		switch (target) {
			case "levels":
				return this.levels;
			case "gradient":
				return this.gradient;
			case "group":
				return this.group;
			case "indicator":
				return this.indicator;
			default:
				return this.layers[target];
		}
	}

	private put(target: Target, value: number) {
		switch (target) {
			case "levels":
				this.levels = value;
				return;
			case "gradient":
				this.gradient = value;
				return;
			case "group":
				this.group = value;
				return;
			case "indicator":
				this.indicator = value;
				return;
			default:
				this.layers[target] = value;
		}
	}

	private sound(sound: DedSoundId) {
		if (this.data.sounds[sound])
			this.events.push({ frame: this.frame, kind: "sound", sound });
	}

	private startTyping() {
		if (this.lineIndex >= this.lines().length) return;
		this.animating = true;
		this.typing = { line: this.lineIndex, k: 0, next: this.frame };
		this.cursor = true;
		this.nextBlink = this.frame + frames(BLINK_SECONDS);
		this.typeStep();
	}

	private typeStep() {
		const typing = this.typing;
		if (!typing || this.frame < typing.next) return;
		const full = this.text(typing.line);
		this.shown[typing.line] = typing.k;
		if (typing.k >= full.length) {
			this.finishLine();
			return;
		}
		this.events.push({ frame: this.frame, kind: "typing", voice: this.voice });
		this.voice = (this.voice + 1) % 3;
		typing.k += 1;
		typing.next = this.frame + frames(TYPE_SECONDS);
	}

	private finishLine() {
		const typing = this.typing;
		if (!typing) return;
		this.shown[typing.line] = this.text(typing.line).length;
		this.typing = null;
		this.lineIndex += 1;
		this.animating = false;
		if (this.lineIndex >= this.lines().length) {
			this.indicatorAt = this.frame + frames(INDICATOR_DELAY);
		}
	}

	private visualOps(visual: number, at: number): { ops: Op[]; length: number } {
		const wait = frames(1);
		const half = frames(FADE_SECONDS);
		const cross = (from: DedLayer, to: DedLayer, start: number): Op[] => [
			{ at: start, kind: "tween", tween: this.fade(from, null, 0) },
			{ at: start, kind: "tween", tween: this.fade(to, null, 1) },
		];
		switch (visual) {
			case 1:
				return {
					ops: [
						{ at: at + wait, kind: "sound", sound: "img2SE" },
						{ at: at + wait, kind: "tween", tween: this.fade("img2", null, 1) },
					],
					length: wait + half,
				};
			case 2: {
				const into = frames(this.data.fade.in);
				return {
					ops: [
						{ at, kind: "sound", sound: "whiteToImg3SE" },
						{
							at,
							kind: "tween",
							tween: this.levelsTween(0, 1, this.data.fade.in, false),
						},
						{ at: at + into, kind: "set", target: "img3", value: 1 },
						{
							at: at + into,
							kind: "tween",
							tween: this.levelsTween(1, 0, this.data.fade.out, false),
						},
					],
					length: into + frames(this.data.fade.out),
				};
			}
			case 3:
				return {
					ops: [
						{ at, kind: "sound", sound: "img3_1SE" },
						{ at, kind: "tween", tween: this.fade("img3_1", null, 1) },
					],
					length: half,
				};
			case 4:
				return {
					ops: [
						{ at: at + wait, kind: "sound", sound: "img3_2SE" },
						...cross("img3_1", "img3_2", at + wait),
					],
					length: wait + half,
				};
			case 5:
				return { ops: cross("img3_2", "img3_3", at), length: half };
			case 6:
				return { ops: cross("img3_3", "img3_4", at), length: half };
			case 7:
				return { ops: cross("img3_4", "img3_5", at), length: half };
			case 8:
				return { ops: cross("img3_5", "img3_6", at), length: half };
			case 9:
				return {
					ops: [{ at, kind: "tween", tween: this.fade("img3_6", null, 0) }],
					length: half,
				};
			default:
				return { ops: [], length: 0 };
		}
	}

	private transition(next: number) {
		this.animating = true;
		this.indicatorAt = null;
		this.tweens = this.tweens.filter((t) => t.target !== "indicator");
		const half = frames(FADE_SECONDS);
		const visualAt = this.frame + half;
		const visual = this.visualOps(this.data.pages[next]?.visual ?? 0, visualAt);
		const pageAt = visualAt + visual.length;
		this.startTween(this.fade("group", null, 0));
		this.schedule([
			...visual.ops,
			{ at: pageAt, kind: "page" },
			{ at: pageAt, kind: "tween", tween: this.fade("group", null, 1) },
			{ at: pageAt + half, kind: "type" },
		]);
		this.pendingPage = next;
	}

	private finish() {
		this.animating = true;
		this.startTween(this.levelsTween(0, 1, this.data.fade.in, true));
		this.schedule([
			{ at: this.frame + frames(this.data.fade.in), kind: "end" },
		]);
	}

	private startTween(tween: Omit<Tween, "start">) {
		this.tweens = this.tweens.filter((t) => t.target !== tween.target);
		const full: Tween = {
			...tween,
			start: this.frame,
			from: tween.from ?? this.get(tween.target),
		};
		this.tweens.push(full);
		this.applyTween(full);
	}

	private applyTween(tween: Tween): boolean {
		const elapsed = (this.frame - tween.start + 1) / DED_FPS;
		const t = Math.min(1, elapsed / tween.seconds);
		const from = tween.from ?? 0;
		const value =
			from + (tween.to - from) * (tween.curve === "smooth" ? smooth(t) : t);
		this.put(tween.target, value);
		if (tween.ambient) this.ambient = 1 - Math.min(1, Math.max(0, value));
		return t >= 1;
	}

	/** True when a tap now would do something */
	get waiting(): boolean {
		if (this.ended) return false;
		return this.typing !== null || !this.animating;
	}

	get done(): boolean {
		return this.ended;
	}

	/** A line is typing; a tap completes it */
	get typingNow(): boolean {
		return this.typing !== null;
	}

	/** Nothing is animating; a tap types the next line or turns the page */
	get idle(): boolean {
		return !this.animating && !this.ended;
	}

	get at(): number {
		return this.frame;
	}

	private advance() {
		if (this.animating) {
			if (this.typing) this.finishLine();
			return;
		}
		if (this.lineIndex < this.lines().length) {
			this.startTyping();
		} else if (this.page < this.data.pages.length - 1) {
			this.transition(this.page + 1);
		} else {
			this.finish();
		}
	}

	step(tap = false): DedSoundEvent[] {
		this.events = [];
		if (this.ended) {
			this.frame += 1;
			return this.events;
		}
		if (this.typing && this.frame >= this.nextBlink) {
			this.cursor = !this.cursor;
			this.nextBlink = this.frame + frames(BLINK_SECONDS);
		}
		if (tap) this.advance();
		this.tweens = this.tweens.filter(
			(tween) => tween.start === this.frame || !this.applyTween(tween),
		);
		while (
			this.ops.length &&
			(this.ops[0]?.at ?? Number.POSITIVE_INFINITY) <= this.frame
		) {
			const op = this.ops.shift();
			if (!op) break;
			switch (op.kind) {
				case "tween":
					this.startTween(op.tween);
					break;
				case "sound":
					this.sound(op.sound);
					break;
				case "set":
					this.put(op.target, op.value);
					break;
				case "page":
					this.page = this.pendingPage;
					this.renderPage();
					break;
				case "type":
					this.startTyping();
					break;
				case "end":
					this.ended = true;
					this.levels = 1;
					break;
			}
		}
		if (this.typing && this.typing.next <= this.frame) this.typeStep();
		if (this.indicatorAt !== null && this.frame >= this.indicatorAt) {
			this.indicatorAt = null;
			this.startTween(this.fade("indicator", 0, 1));
		}
		const events = this.events;
		this.frame += 1;
		return events;
	}

	view(): DedView {
		const typingLine = this.typing?.line;
		return {
			frame: this.frame,
			page: this.page,
			layers: { ...this.layers },
			levels: this.levels,
			gradient: this.gradient,
			group: this.group,
			indicator: this.indicator,
			ambient: this.ambient,
			lines: this.lines().map((_, line) => ({
				full: this.text(line),
				shown: this.shown[line] ?? null,
				cursor: line === typingLine && this.cursor,
			})),
			waiting: this.waiting,
			ended: this.ended,
		};
	}
}
