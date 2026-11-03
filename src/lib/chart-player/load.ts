import { corsUrl } from "./base";
import { fetchChart, type Loaded } from "./fetch-chart";

type Reply = ({ ok: true } & Loaded) | { ok: false; error: string };

const BACKDROP_W = 160;

export function loadChart(source: string, pack = false): Promise<Loaded> {
	const url = corsUrl(source);
	let worker: Worker;
	try {
		worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});
	} catch {
		return fetchChart(url, pack);
	}
	return new Promise((resolve, reject) => {
		worker.onmessage = (e: MessageEvent<Reply>) => {
			worker.terminate();
			if (e.data.ok) resolve({ chart: e.data.chart, music: e.data.music });
			else reject(new Error(e.data.error));
		};
		worker.onerror = (e) => {
			e.preventDefault();
			worker.terminate();
			fetchChart(url, pack).then(resolve, reject);
		};
		worker.postMessage({ url, pack });
	});
}

export async function fetchBytes(
	url: string,
	progress: (done: number, total: number) => void,
): Promise<ArrayBuffer> {
	const res = await fetch(corsUrl(url));
	if (!res.ok || !res.body) throw new Error(`audio ${res.status}`);
	const total = Number(res.headers.get("content-length")) || 0;
	const reader = res.body.getReader();
	let out = new Uint8Array(total);
	let done = 0;
	for (;;) {
		const step = await reader.read();
		if (step.done) break;
		const chunk = step.value;
		if (done + chunk.byteLength > out.byteLength) {
			const grown = new Uint8Array(
				Math.max(done + chunk.byteLength, out.byteLength * 2),
			);
			grown.set(out.subarray(0, done));
			out = grown;
		}
		out.set(chunk, done);
		done += chunk.byteLength;
		progress(done, total);
	}
	return done === out.byteLength ? out.buffer : out.slice(0, done).buffer;
}

async function smallBitmap(url: string): Promise<ImageBitmap | null> {
	if (typeof createImageBitmap !== "function") return null;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await createImageBitmap(await res.blob(), {
			resizeWidth: BACKDROP_W,
			resizeQuality: "low",
		});
	} catch {
		return null;
	}
}

async function fullImage(url: string): Promise<HTMLImageElement | null> {
	const img = new Image();
	img.crossOrigin = "anonymous";
	img.decoding = "async";
	img.src = url;
	try {
		await img.decode();
	} catch {
		return null;
	}
	return img;
}

export async function loadBackdrop(
	url: string,
): Promise<HTMLCanvasElement | null> {
	const src = corsUrl(url);
	const image = (await smallBitmap(src)) ?? (await fullImage(src));
	if (!image) return null;
	const iw = "naturalWidth" in image ? image.naturalWidth : image.width;
	const ih = "naturalHeight" in image ? image.naturalHeight : image.height;
	const w = BACKDROP_W;
	const h = Math.max(1, Math.round((w * ih) / Math.max(1, iw)));
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const g = canvas.getContext("2d");
	if (!g) return null;
	g.filter = "blur(3px)";
	g.drawImage(image, -6, -6, w + 12, h + 12);
	if ("close" in image) image.close();
	try {
		g.getImageData(0, 0, 1, 1);
	} catch {
		return null;
	}
	return canvas;
}
