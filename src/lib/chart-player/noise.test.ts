import assert from "node:assert/strict";
import test from "node:test";
import { NOISE_SIZE, noiseData } from "./noise";

const N = NOISE_SIZE;
const data = noiseData();
const channel = (c: number) =>
	Float64Array.from({ length: N * N }, (_, i) => data[i * 2 + c]! / 255);

function mean(v: Float64Array) {
	return v.reduce((a, b) => a + b, 0) / v.length;
}

function correlation(v: Float64Array, lag: number) {
	const m = mean(v);
	let num = 0;
	let den = 0;
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			const d = v[y * N + x]! - m;
			num += d * (v[y * N + ((x + lag) % N)]! - m);
			num += d * (v[((y + lag) % N) * N + x]! - m);
			den += 2 * d * d;
		}
	}
	return num / den;
}

test("the flow field has the game's spread and grain", () => {
	const v = channel(0);
	const m = mean(v);
	const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
	assert.ok(Math.abs(m - 0.5) < 0.01, `mean ${m}`);
	assert.ok(Math.abs(sd - 0.13) < 0.01, `sd ${sd}`);
	const want: [number, number][] = [
		[1, 0.93],
		[2, 0.8],
		[4, 0.54],
		[8, 0.2],
		[16, 0.02],
	];
	for (const [lag, r] of want) {
		const got = correlation(v, lag);
		assert.ok(Math.abs(got - r) < 0.06, `lag ${lag}: ${got}`);
	}
});

test("sparks are sparse single texels with a long bright tail", () => {
	const v = channel(1);
	const lit = (above: number) =>
		v.filter((x) => x > above / 255).length / v.length;
	assert.ok(Math.abs(lit(0) - 0.128) < 0.01, `lit ${lit(0)}`);
	assert.ok(Math.abs(lit(20) - 0.082) < 0.012, `>20 ${lit(20)}`);
	assert.ok(lit(100) > 0.002 && lit(100) < 0.009, `>100 ${lit(100)}`);
	assert.ok(Math.abs(correlation(v, 1)) < 0.03);
});

test("the texture tiles without a seam", () => {
	const v = channel(0);
	let edge = 0;
	let inner = 0;
	for (let y = 0; y < N; y++) {
		edge += Math.abs(v[y * N + N - 1]! - v[y * N]!);
		inner += Math.abs(v[y * N + 100]! - v[y * N + 101]!);
	}
	assert.ok(edge < inner * 1.5);
});
