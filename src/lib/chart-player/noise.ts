export const NOISE_SIZE = 256;

const CLOUD_MEAN = 0.5;
const CLOUD_SD = 0.13;
const FINE = { width: 3, share: 0.36 };
const COARSE = { width: 7, share: 0.6 };
const GRAIN_SHARE = 0.04;
const SPARK_EMPTY = 0.872;
const SPARK_SCALE = 40.6;
const SPARK_POWER = 0.8;

function hash(i: number, seed: number): number {
	let h = Math.imul(i ^ seed, 0x27d4eb2d);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

function boxPass(src: Float32Array, width: number, rows: boolean) {
	const n = NOISE_SIZE;
	const out = new Float32Array(n * n);
	const r = (width - 1) >> 1;
	for (let a = 0; a < n; a++) {
		const at = (b: number) => {
			const w = (b + n) % n;
			return rows ? a * n + w : w * n + a;
		};
		let sum = 0;
		for (let b = -r; b <= r; b++) sum += src[at(b)]!;
		for (let b = 0; b < n; b++) {
			out[at(b)] = sum / width;
			sum += src[at(b + r + 1)]! - src[at(b - r)]!;
		}
	}
	return out;
}

function standardize(v: Float32Array) {
	let mean = 0;
	for (const x of v) mean += x;
	mean /= v.length;
	let sq = 0;
	for (const x of v) sq += (x - mean) * (x - mean);
	const sd = Math.sqrt(sq / v.length) || 1;
	for (let i = 0; i < v.length; i++) v[i] = (v[i]! - mean) / sd;
	return v;
}

function white(seed: number): Float32Array {
	const v = new Float32Array(NOISE_SIZE * NOISE_SIZE);
	for (let i = 0; i < v.length; i++) v[i] = hash(i, seed) - 0.5;
	return v;
}

function blurred(seed: number, width: number): Float32Array {
	let v = white(seed);
	for (let k = 0; k < 3; k++)
		v = boxPass(boxPass(v, width, true), width, false);
	return standardize(v);
}

// Tileable 256x256 RG texture: R is a flow field with the grain of the game's displacement map, G a sparse speckle like its spark map
export function noiseData(): Uint8Array {
	const n = NOISE_SIZE * NOISE_SIZE;
	const fine = blurred(11, FINE.width);
	const coarse = blurred(23, COARSE.width);
	const grain = standardize(white(37));
	const cloud = new Float32Array(n);
	const a = Math.sqrt(FINE.share);
	const b = Math.sqrt(COARSE.share);
	const c = Math.sqrt(GRAIN_SHARE);
	for (let i = 0; i < n; i++) {
		cloud[i] = a * fine[i]! + b * coarse[i]! + c * grain[i]!;
	}
	standardize(cloud);
	const out = new Uint8Array(n * 2);
	for (let i = 0; i < n; i++) {
		const v = CLOUD_MEAN + CLOUD_SD * cloud[i]!;
		out[i * 2] = Math.round(Math.min(Math.max(v, 0), 1) * 255);
		const u = hash(i, 53);
		if (u >= SPARK_EMPTY) {
			const x = -Math.log(1 - (u - SPARK_EMPTY) / (1 - SPARK_EMPTY));
			out[i * 2 + 1] = Math.min(
				255,
				Math.round(SPARK_SCALE * x ** SPARK_POWER),
			);
		}
	}
	return out;
}
