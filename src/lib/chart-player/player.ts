import { evictOldest } from "@/phi/lib/lru";
import { AreaBuilder } from "./areas";
import { AudioEngine } from "./audio";
import type { CompiledChart } from "./chart";
import { FrameBuilder, NOTE_SCALE_MAX, NOTE_SCALE_MIN } from "./frame";
import { type AreaFrame, type CaptionText, ChartRenderer } from "./gl";
import { fetchBytes, loadBackdrop, loadChart } from "./load";
import { Pacer } from "./pacer";

export type AudioState =
	| { kind: "loading"; progress: number }
	| { kind: "ready" }
	| { kind: "failed" };

export type PlayerEvents = {
	onTime: (pos: number, duration: number) => void;
	onPlaying: (playing: boolean) => void;
	onAudio: (state: AudioState) => void;
};

export type PlayerSource = { chart: string; pack: boolean; music?: string };

// Only the music in use stays decoded: a decoded song is tens of megabytes
const DECODED_KEPT = 1;

export type PlayerStats = {
	cpuMs: number;
	instances: number;
	drawCalls: number;
	notes: number;
	effects: number;
	areas: number;
	scale: number;
};

const EMPTY = new Float32Array(0);
const TAIL = 2;
const SCALES = [1, 0.8, 0.65, 0.5];

export function clampNoteScale(v: number): number {
	return Number.isFinite(v)
		? Math.min(Math.max(v, NOTE_SCALE_MIN), NOTE_SCALE_MAX)
		: 1;
}

export class ChartPlayer {
	private readonly renderer: ChartRenderer;
	private readonly audio: AudioEngine;
	private readonly observer: ResizeObserver;
	private readonly seen: IntersectionObserver | null;
	private chart: CompiledChart | null = null;
	private frame: FrameBuilder | null = null;
	private areas: AreaBuilder | null = null;
	private chordColors = false;
	private noteScale = 1;
	private backdrop: HTMLCanvasElement | null = null;
	private backdropUrl = "";
	private backdropJob = 0;
	private caption: CaptionText | null = null;
	private areaFrame: AreaFrame | null = null;
	private level = 0;
	private lastTs = 0;
	private visible = true;
	private dirty = true;
	private readonly pacer = new Pacer();
	private musicJob: Promise<boolean> = Promise.resolve(false);
	private noise = true;
	private readonly decoded = new Map<string, Promise<AudioBuffer | null>>();
	private wanted = "";
	private current = "";
	private shownProgress = -1;
	private raf = 0;
	private job = 0;
	private disposed = false;
	readonly stats: PlayerStats = {
		cpuMs: 0,
		instances: 0,
		drawCalls: 0,
		notes: 0,
		effects: 0,
		areas: 0,
		scale: 1,
	};

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly events: PlayerEvents,
	) {
		this.renderer = new ChartRenderer(canvas);
		this.audio = new AudioEngine();
		this.observer = new ResizeObserver(() => this.fit());
		this.observer.observe(canvas);
		this.seen =
			typeof IntersectionObserver === "function"
				? new IntersectionObserver((entries) => {
						const visible = entries.some((e) => e.isIntersecting);
						if (visible === this.visible) return;
						this.visible = visible;
						if (visible) this.request();
					})
				: null;
		this.seen?.observe(canvas);
		this.fit();
	}

	get duration(): number {
		if (this.audio.duration) return this.audio.duration;
		return this.chart ? this.chart.end + this.chart.offset + TAIL : 0;
	}

	get playing(): boolean {
		return this.audio.playing;
	}

	get ready(): boolean {
		return this.chart !== null;
	}

	get hasNoise(): boolean {
		return (this.chart?.areas.count ?? 0) > 0;
	}

	unlock() {
		this.audio.unlock();
	}

	private decodeOnce(
		key: string,
		bytes: () => Promise<ArrayBuffer>,
	): Promise<AudioBuffer | null> {
		const job =
			this.decoded.get(key) ??
			bytes()
				.then((b) => this.audio.decode(b))
				.catch(() => null);
		this.decoded.delete(key);
		this.decoded.set(key, job);
		evictOldest(this.decoded, DECODED_KEPT);
		return job;
	}

	private async applyMusic(
		key: string,
		job: Promise<AudioBuffer | null>,
	): Promise<boolean> {
		this.wanted = key;
		const buffer = await job;
		if (this.disposed || this.wanted !== key) return false;
		if (this.current !== key) {
			this.current = key;
			const pos = this.audio.position();
			const playing = this.audio.playing;
			this.audio.setMusic(buffer);
			if (playing && this.chart) {
				this.audio.play(pos, this.chart.hits, this.chart.offset);
			}
		}
		this.events.onAudio(buffer ? { kind: "ready" } : { kind: "failed" });
		this.request();
		return buffer !== null;
	}

	loadMusic(url: string): Promise<boolean> {
		if (!this.decoded.has(url)) {
			this.shownProgress = 0;
			this.events.onAudio({ kind: "loading", progress: 0 });
		}
		return this.applyMusic(
			url,
			this.decodeOnce(url, () =>
				fetchBytes(url, (done, total) => {
					if (!total || this.wanted !== url) return;
					const pct = Math.floor((done / total) * 100);
					if (pct === this.shownProgress) return;
					this.shownProgress = pct;
					this.events.onAudio({ kind: "loading", progress: pct / 100 });
				}),
			),
		);
	}

	async loadSource(
		source: PlayerSource,
	): Promise<{ music: Promise<boolean> } | null> {
		const job = ++this.job;
		const early = source.music ? this.loadMusic(source.music) : null;
		const { chart, music } = await loadChart(source.chart, source.pack);
		if (job !== this.job || this.disposed) return null;
		this.chart = chart;
		this.frame = new FrameBuilder(chart);
		this.frame.chordColors = this.chordColors;
		this.frame.noteScale = this.noteScale;
		this.areas = chart.areas.count ? new AreaBuilder(chart.areas) : null;
		this.areaFrame = this.areas
			? { data: this.areas.data, counts: this.areas.counts, time: 0 }
			: null;
		if (this.audio.playing) {
			this.audio.play(this.audio.position(), chart.hits, chart.offset);
		}
		this.request();
		if (early) {
			this.musicJob = early;
			return { music: early };
		}
		if (music) {
			const bytes = music;
			this.musicJob = this.applyMusic(
				source.chart,
				this.decodeOnce(source.chart, async () => bytes),
			);
			return { music: this.musicJob };
		}
		this.wanted = "";
		this.current = "";
		this.audio.setMusic(null);
		this.events.onAudio({ kind: "failed" });
		this.musicJob = Promise.resolve(false);
		return { music: this.musicJob };
	}

	async loadBackdrop(url: string) {
		if (url === this.backdropUrl) return;
		this.backdropUrl = url;
		const job = ++this.backdropJob;
		const img = await loadBackdrop(url);
		if (this.disposed || job !== this.backdropJob) return;
		if (!img) this.backdropUrl = "";
		this.backdrop = img;
		this.renderer.setBackdrop(img);
		this.request();
	}

	setCaption(text: CaptionText | null) {
		this.caption = text;
		this.renderer.setCaption(text);
		this.request();
	}

	async exportVideo(opts: {
		width: number;
		height: number;
		fps: number;
		signal: AbortSignal;
		onProgress: (done: number) => void;
	}): Promise<Blob> {
		const chart = this.chart;
		if (!chart) throw new Error("no chart");
		this.pause();
		const [{ exportVideo }] = await Promise.all([
			import("./export"),
			this.musicJob,
		]);
		if (this.chart !== chart) throw new Error("chart changed");
		return exportVideo({
			chart,
			music: this.audio.musicBuffer,
			backdrop: this.backdrop,
			caption: this.caption,
			duration: this.duration,
			hitVolume: this.audio.hitLevel,
			hitMix: this.audio.hitMix,
			chordColors: this.chordColors,
			noise: this.noise,
			noteScale: this.noteScale,
			...opts,
		});
	}

	play() {
		const chart = this.chart;
		if (!chart || this.disposed) return;
		let from = this.audio.position();
		if (from >= this.duration - 0.05) from = 0;
		this.audio.play(from, chart.hits, chart.offset);
		this.events.onPlaying(true);
		this.request();
	}

	pause() {
		if (!this.audio.playing) return;
		this.audio.pause();
		this.events.onPlaying(false);
		this.request();
	}

	toggle() {
		if (this.audio.playing) this.pause();
		else this.play();
	}

	seek(pos: number) {
		const p = Math.min(Math.max(0, pos), this.duration);
		if (this.audio.playing && this.chart) {
			this.audio.play(p, this.chart.hits, this.chart.offset);
		} else {
			this.audio.seek(p);
		}
		this.request();
	}

	skip(by: number) {
		this.seek(this.audio.position() + by);
	}

	setHitVolume(v: number) {
		this.audio.setHitVolume(v);
	}

	setHitMix(kind: number, v: number) {
		this.audio.setHitMix(kind, v);
	}

	previewHit(kind: number) {
		this.audio.preview(kind);
	}

	setSpeed(rate: number) {
		const chart = this.chart;
		const pos = this.audio.position();
		this.audio.setSpeed(rate);
		if (this.audio.playing && chart)
			this.audio.play(pos, chart.hits, chart.offset);
		this.request();
	}

	setNoise(on: boolean) {
		this.noise = on;
		this.request();
	}

	setChordColors(on: boolean) {
		this.chordColors = on;
		if (this.frame) this.frame.chordColors = on;
		this.request();
	}

	setNoteScale(v: number) {
		this.noteScale = clampNoteScale(v);
		if (this.frame) this.frame.noteScale = this.noteScale;
		this.renderer.setNoteScale(this.noteScale);
		this.request();
	}

	private fit() {
		const dpr =
			Math.min(2, window.devicePixelRatio || 1) * (SCALES[this.level] ?? 1);
		this.stats.scale = SCALES[this.level] ?? 1;
		const box = this.canvas.getBoundingClientRect();
		const w = Math.max(1, Math.round(box.width * dpr));
		const h = Math.max(1, Math.round(box.height * dpr));
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
		this.request();
	}

	private request() {
		this.dirty = true;
		this.queue();
	}

	private queue() {
		if (!this.raf && !this.disposed) {
			this.raf = requestAnimationFrame(this.tick);
		}
	}

	private pace(ts: number) {
		const last = this.lastTs;
		this.lastTs = ts;
		if (!last || !this.audio.playing) return;
		const step = this.pacer.step(ts - last);
		if (step < 0 && this.level < SCALES.length - 1) {
			this.level++;
			this.fit();
		} else if (step > 0 && this.level > 0) {
			this.level--;
			this.fit();
		}
	}

	private tick = (ts: number) => {
		this.raf = 0;
		if (this.disposed) return;
		const duration = this.duration;
		let pos = this.audio.position();
		if (this.audio.playing && duration > 0 && pos >= duration) {
			this.audio.pause();
			this.audio.seek(duration);
			pos = duration;
			this.events.onPlaying(false);
		}
		if (this.visible) {
			this.pace(ts);
			this.render(pos);
			this.dirty = false;
		} else {
			this.lastTs = 0;
		}
		this.events.onTime(pos, duration);
		if (this.audio.playing) {
			if (this.chart) this.audio.schedule(this.chart.hits, this.chart.offset);
			this.queue();
		} else if (this.dirty && this.visible) {
			this.queue();
		}
	};

	private render(pos: number) {
		const start = performance.now();
		const { chart, frame, areas, stats } = this;
		let count = 0;
		const t = chart ? Math.max(0, pos - chart.offset) : 0;
		if (chart && frame) {
			count = frame.build(t);
			stats.notes = frame.stats.notes;
			stats.effects = frame.stats.fx;
		}
		stats.areas = areas && this.noise ? areas.build(t) : 0;
		const af = this.areaFrame;
		if (af) af.time = t;
		this.renderer.draw(
			frame ? frame.data : EMPTY,
			count,
			af && stats.areas ? af : undefined,
		);
		stats.instances = count;
		stats.drawCalls = this.renderer.drawCalls;
		stats.cpuMs = performance.now() - start;
	}

	dispose() {
		this.disposed = true;
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
		this.observer.disconnect();
		this.seen?.disconnect();
		this.audio.close();
		this.renderer.dispose();
	}
}
