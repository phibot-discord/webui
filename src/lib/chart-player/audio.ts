import { firstAtOrAfter, type Hits } from "./chart";

const LEAD = 0.05;
const LOOKAHEAD = 0.3;
export const HIT_GAIN = 1;
const HIT_MAX = 1.5;
export const MUSIC_GAIN = 0.9;
const SOUND_KINDS = 3;

type Ctx = AudioContext & {
	getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number };
	outputLatency?: number;
};

function noise(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 2147483648 - 1;
	};
}

function synth(
	ctx: BaseAudioContext,
	seconds: number,
	fn: (t: number, rnd: () => number) => number,
): AudioBuffer {
	const rate = ctx.sampleRate;
	const n = Math.ceil(seconds * rate);
	const buf = ctx.createBuffer(1, n, rate);
	const out = buf.getChannelData(0);
	const rnd = noise(n);
	for (let i = 0; i < n; i++) out[i] = fn(i / rate, rnd);
	const tail = Math.min(n, Math.round(rate * 0.004));
	for (let i = 0; i < tail; i++) out[n - 1 - i]! *= i / tail;
	return buf;
}

function bandpass() {
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;
	return (x: number, fc: number, q: number, rate: number) => {
		const w = (2 * Math.PI * fc) / rate;
		const alpha = Math.sin(w) / (2 * q);
		const a0 = 1 + alpha;
		const y =
			(alpha * x - alpha * x2 + 2 * Math.cos(w) * y1 - (1 - alpha) * y2) / a0;
		x2 = x1;
		x1 = x;
		y2 = y1;
		y1 = y;
		return y;
	};
}

function normalize(buf: AudioBuffer, peak: number): AudioBuffer {
	const d = buf.getChannelData(0);
	let max = 0;
	for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]!));
	if (max > 0) for (let i = 0; i < d.length; i++) d[i]! *= peak / max;
	return buf;
}

export function hitSounds(ctx: BaseAudioContext): AudioBuffer[] {
	const tau = Math.PI * 2;
	const rate = ctx.sampleRate;
	const tap = synth(ctx, 0.09, (t, rnd) => {
		const body =
			Math.sin(tau * 1180 * t) * 0.55 * Math.exp(-t / 0.022) +
			Math.sin(tau * 2650 * t) * 0.25 * Math.exp(-t / 0.012);
		return (body + rnd() * 0.35 * Math.exp(-t / 0.0025)) * 0.9;
	});
	const tick = bandpass();
	const drag = synth(ctx, 0.06, (t, rnd) => {
		const glass =
			Math.sin(tau * 3150 * t) * Math.exp(-t / 0.009) +
			Math.sin(tau * 4920 * t) * 0.55 * Math.exp(-t / 0.005);
		const knock = Math.sin(tau * 1650 * t) * 0.35 * Math.exp(-t / 0.004);
		const click = tick(rnd(), 6000, 1.2, rate) * Math.exp(-t / 0.0012);
		return glass * 0.6 + knock + click * 0.9;
	});
	const snap = bandpass();
	const ring = (t: number, f: number, decay: number) =>
		Math.sin(tau * f * t) * Math.exp(-t / decay);
	const flick = synth(
		ctx,
		0.07,
		(t, rnd) =>
			ring(t, 1400, 0.014) * 0.45 +
			ring(t, 4200, 0.009) * 0.45 +
			ring(t, 6300, 0.005) * 0.25 +
			snap(rnd(), 7000, 1.3, rate) * 0.8 * Math.exp(-t / 0.0012),
	);
	return [normalize(tap, 1), normalize(drag, 0.72), normalize(flick, 0.92)];
}

// Hits stack on the music past full scale; a soft clipper tames that with no lookahead delay
const CLIP_KNEE = 0.8;
const CLIP_RANGE = 2;

export function limiter(ctx: BaseAudioContext): AudioNode {
	const n = 4096;
	const curve = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const x = ((i / (n - 1)) * 2 - 1) * CLIP_RANGE;
		const a = Math.abs(x);
		const y =
			a <= CLIP_KNEE
				? a
				: CLIP_KNEE +
					(1 - CLIP_KNEE) * Math.tanh((a - CLIP_KNEE) / (1 - CLIP_KNEE));
		curve[i] = Math.sign(x) * y;
	}
	const shaper = ctx.createWaveShaper();
	shaper.curve = curve;
	shaper.oversample = "none";
	shaper.connect(ctx.destination);
	const pre = ctx.createGain();
	pre.gain.value = 1 / CLIP_RANGE;
	pre.connect(shaper);
	return pre;
}

function clampHit(v: number, max = HIT_MAX): number {
	return Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 1;
}

export class AudioEngine {
	readonly ctx: Ctx;
	private readonly music: GainNode;
	private readonly hitsGain: GainNode;
	private readonly kindGain: GainNode[];
	private readonly sounds: AudioBuffer[];
	private buffer: AudioBuffer | null = null;
	private src: AudioBufferSourceNode | null = null;
	private queued: { node: AudioBufferSourceNode; at: number }[] = [];
	private startCtx = 0;
	private startPos = 0;
	private cursor = 0;
	private running = false;
	private rate = 1;
	private hitVolume = 1;
	private readonly mix = [1, 1, 1];

	constructor() {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		this.ctx = new Ctor({ latencyHint: "interactive" }) as Ctx;
		const out = limiter(this.ctx);
		this.music = this.ctx.createGain();
		this.music.gain.value = MUSIC_GAIN;
		this.music.connect(out);
		this.hitsGain = this.ctx.createGain();
		this.hitsGain.gain.value = HIT_GAIN;
		this.hitsGain.connect(out);
		this.kindGain = Array.from({ length: SOUND_KINDS }, () => {
			const g = this.ctx.createGain();
			g.connect(this.hitsGain);
			return g;
		});
		this.sounds = hitSounds(this.ctx);
	}

	get playing() {
		return this.running;
	}

	get musicBuffer(): AudioBuffer | null {
		return this.buffer;
	}

	get hitLevel(): number {
		return this.hitVolume;
	}

	get hitMix(): number[] {
		return [...this.mix];
	}

	get duration() {
		return this.buffer?.duration ?? 0;
	}

	setSpeed(rate: number) {
		this.rate = Math.min(Math.max(rate, 0.25), 2);
	}

	setHitVolume(v: number) {
		this.hitVolume = clampHit(v);
		this.hitsGain.gain.setTargetAtTime(
			this.hitVolume * HIT_GAIN,
			this.ctx.currentTime,
			0.01,
		);
	}

	setHitMix(kind: number, v: number) {
		const g = this.kindGain[kind];
		if (!g) return;
		this.mix[kind] = clampHit(v, 1);
		g.gain.setTargetAtTime(this.mix[kind]!, this.ctx.currentTime, 0.01);
	}

	preview(kind: number) {
		const buffer = this.sounds[kind];
		const g = this.kindGain[kind];
		if (!buffer || !g) return;
		this.unlock();
		const node = this.ctx.createBufferSource();
		node.buffer = buffer;
		node.connect(g);
		node.start();
	}

	setMusic(buffer: AudioBuffer | null) {
		this.buffer = buffer;
	}

	unlock() {
		if (this.ctx.state === "suspended") void this.ctx.resume();
	}

	private heard(): number {
		const ctx = this.ctx;
		const ts = ctx.getOutputTimestamp?.();
		if (ts?.contextTime && ts.performanceTime) {
			return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
		}
		return ctx.currentTime - (ctx.outputLatency ?? ctx.baseLatency ?? 0);
	}

	position(): number {
		if (!this.running) return this.startPos;
		return Math.max(
			this.startPos,
			this.startPos + (this.heard() - this.startCtx) * this.rate,
		);
	}

	play(from: number, hits: Hits | null, offset: number) {
		this.halt();
		this.unlock();
		const at = this.ctx.currentTime + LEAD;
		const pos = Math.max(0, from);
		if (this.buffer && pos < this.buffer.duration) {
			const src = this.ctx.createBufferSource();
			src.buffer = this.buffer;
			src.playbackRate.value = this.rate;
			src.connect(this.music);
			src.start(at, pos);
			this.src = src;
		}
		this.startCtx = at;
		this.startPos = pos;
		this.running = true;
		this.cursor = hits ? firstAtOrAfter(hits.t, pos - offset) : 0;
	}

	pause() {
		const pos = this.position();
		this.halt();
		this.startPos = pos;
	}

	seek(pos: number) {
		this.halt();
		this.startPos = Math.max(0, pos);
	}

	private halt() {
		if (this.src) {
			try {
				this.src.stop();
			} catch {}
			this.src.disconnect();
			this.src = null;
		}
		for (const q of this.queued) {
			try {
				q.node.stop();
			} catch {}
			q.node.disconnect();
		}
		this.queued = [];
		this.running = false;
	}

	schedule(hits: Hits, offset: number) {
		if (!this.running) return;
		const now = this.ctx.currentTime;
		if (this.queued.length) {
			let keep = 0;
			for (const q of this.queued) {
				if (q.at > now - 0.2) this.queued[keep++] = q;
				else q.node.disconnect();
			}
			this.queued.length = keep;
		}
		const horizon =
			this.startPos + (now + LOOKAHEAD - this.startCtx) * this.rate;
		const n = hits.t.length;
		while (this.cursor < n && hits.t[this.cursor]! + offset < horizon) {
			const i = this.cursor++;
			const kind = hits.sound[i]!;
			if (!this.hitVolume || !this.mix[kind]) continue;
			const at =
				this.startCtx + (hits.t[i]! + offset - this.startPos) / this.rate;
			if (at < now) continue;
			const node = this.ctx.createBufferSource();
			node.buffer = this.sounds[kind] ?? null;
			node.connect(this.kindGain[kind] ?? this.hitsGain);
			node.start(at);
			this.queued.push({ node, at });
		}
	}

	async decode(data: ArrayBuffer): Promise<AudioBuffer> {
		return this.ctx.decodeAudioData(data);
	}

	close() {
		this.halt();
		void this.ctx.close().catch(() => undefined);
	}
}
