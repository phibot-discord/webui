import {
	AudioBufferSource,
	BufferTarget,
	CanvasSource,
	getFirstEncodableAudioCodec,
	getFirstEncodableVideoCodec,
	Mp4OutputFormat,
	Output,
	QUALITY_HIGH,
} from "mediabunny";
import { AreaBuilder } from "./areas";
import { HIT_GAIN, hitSounds, limiter, MUSIC_GAIN } from "./audio";
import type { CompiledChart } from "./chart";
import { FrameBuilder } from "./frame";
import {
	type AreaFrame,
	type Backdrop,
	type CaptionText,
	ChartRenderer,
} from "./gl";

const RATE = 48000;

export type ExportJob = {
	chart: CompiledChart;
	music: AudioBuffer | null;
	backdrop: Backdrop | null;
	caption: CaptionText | null;
	duration: number;
	hitVolume: number;
	hitMix: number[];
	chordColors: boolean;
	noise: boolean;
	noteScale: number;
	width: number;
	height: number;
	fps: number;
	signal: AbortSignal;
	onProgress: (done: number) => void;
};

async function mix(job: ExportJob): Promise<AudioBuffer> {
	const ctx = new OfflineAudioContext(
		2,
		Math.max(1, Math.ceil(job.duration * RATE)),
		RATE,
	);
	const out = limiter(ctx);
	if (job.music) {
		const src = ctx.createBufferSource();
		src.buffer = job.music;
		const gain = ctx.createGain();
		gain.gain.value = MUSIC_GAIN;
		src.connect(gain).connect(out);
		src.start(0);
	}
	if (job.hitVolume > 0) {
		const sounds = hitSounds(ctx);
		const master = ctx.createGain();
		master.gain.value = job.hitVolume * HIT_GAIN;
		master.connect(out);
		const kinds = sounds.map((_, k) => {
			const g = ctx.createGain();
			g.gain.value = job.hitMix[k] ?? 1;
			g.connect(master);
			return g;
		});
		const { t, sound } = job.chart.hits;
		for (let i = 0; i < t.length; i++) {
			const at = t[i]! + job.chart.offset;
			const kind = sound[i]!;
			if (at < 0 || at >= job.duration || !(job.hitMix[kind] ?? 1)) continue;
			const node = ctx.createBufferSource();
			node.buffer = sounds[kind] ?? null;
			node.connect(kinds[kind] ?? master);
			node.start(at);
		}
	}
	return ctx.startRendering();
}

function stopped(signal: AbortSignal) {
	if (signal.aborted) throw new DOMException("cancelled", "AbortError");
}

export async function exportVideo(job: ExportJob): Promise<Blob> {
	const format = new Mp4OutputFormat({ fastStart: "in-memory" });
	const videoCodec = await getFirstEncodableVideoCodec(
		format.getSupportedVideoCodecs(),
		{ width: job.width, height: job.height, quality: QUALITY_HIGH },
	);
	if (!videoCodec) throw new Error("video codec");
	const audioCodec = await getFirstEncodableAudioCodec(
		format.getSupportedAudioCodecs(),
	);
	stopped(job.signal);
	const canvas = document.createElement("canvas");
	canvas.width = job.width;
	canvas.height = job.height;
	const renderer = new ChartRenderer(canvas, { preserve: true, labels: true });
	renderer.setBackdrop(job.backdrop);
	renderer.setCaption(job.caption);
	renderer.setNoteScale(job.noteScale);
	const frame = new FrameBuilder(job.chart);
	frame.chordColors = job.chordColors;
	frame.noteScale = job.noteScale;
	const areas =
		job.noise && job.chart.areas.count
			? new AreaBuilder(job.chart.areas)
			: null;
	const af: AreaFrame | null = areas
		? { data: areas.data, counts: areas.counts, time: 0 }
		: null;
	const output = new Output({ format, target: new BufferTarget() });
	const video = new CanvasSource(canvas, {
		codec: videoCodec,
		quality: QUALITY_HIGH,
	});
	output.addVideoTrack(video, { frameRate: job.fps });
	const audio = audioCodec
		? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH })
		: null;
	if (audio) output.addAudioTrack(audio);
	try {
		const sound = audio ? await mix(job) : null;
		stopped(job.signal);
		await output.start();
		const total = Math.max(1, Math.ceil(job.duration * job.fps));
		for (let i = 0; i < total; i++) {
			stopped(job.signal);
			const pos = i / job.fps;
			const t = Math.max(0, pos - job.chart.offset);
			const n = frame.build(t);
			const shown = areas ? areas.build(t) : 0;
			if (af) af.time = t;
			renderer.draw(
				frame.data,
				n,
				frame.stats.lines + frame.stats.notes,
				af && shown ? af : undefined,
			);
			await video.add(pos, 1 / job.fps);
			if (i % 15 === 0) job.onProgress(i / total);
		}
		if (audio && sound) await audio.add(sound);
		await output.finalize();
		job.onProgress(1);
	} catch (err) {
		await output.cancel().catch(() => undefined);
		throw err;
	} finally {
		renderer.dispose();
	}
	const buffer = output.target.buffer;
	if (!buffer) throw new Error("video empty");
	return new Blob([buffer], { type: "video/mp4" });
}
