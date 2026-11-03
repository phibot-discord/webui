import type { AreaCounts } from "./areas";
import { DISABLED_LEVEL } from "./areas";
import { ASPECT } from "./base";
import { STRIDE, TAP_HH } from "./frame";

const NOTE_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_i0;
layout(location = 2) in vec4 a_i1;
layout(location = 3) in vec4 a_i2;
uniform vec2 u_scale;
uniform float u_px;
out vec2 v_p;
flat out vec4 v_s;
flat out vec4 v_q;
void main() {
	float kind = a_i0.x;
	vec2 ax = vec2(a_i0.w, a_i1.x);
	float sg = a_i1.z < 0.0 ? -1.0 : 1.0;
	vec2 ay = vec2(-ax.y, ax.x) * sg;
	vec2 h = vec2(a_i1.y, abs(a_i1.z));
	float glow = (kind > 0.5 && kind < 4.5 && a_i2.x > 0.5) ? 0.009 : 0.0;
	vec2 e = h + vec2(glow + 2.0 * u_px);
	vec2 lp = a_corner * e;
	vec2 w = a_i0.yz + ax * lp.x + ay * lp.y;
	gl_Position = vec4(w * u_scale, 0.0, 1.0);
	v_p = lp;
	v_s = vec4(kind, h, a_i1.w);
	v_q = a_i2;
}`;

const NOTE_FS = `#version 300 es
precision highp float;
in vec2 v_p;
flat in vec4 v_s;
flat in vec4 v_q;
uniform float u_px;
uniform float u_note;
out vec4 o;
const float HEAD = ${TAP_HH.toFixed(5)};
const vec3 C_TAP = vec3(0.29, 0.78, 1.0);
const vec3 C_DRAG = vec3(1.0, 0.86, 0.36);
const vec3 C_FLICK = vec3(1.0, 0.34, 0.43);
const vec3 C_HOLD = vec3(0.36, 0.83, 1.0);
const vec3 C_GOLD = vec3(1.0, 0.9, 0.55);
const vec3 C_LINE = vec3(1.0, 0.95, 0.74);
const vec3 C_FX = vec3(1.0, 0.9, 0.6);
float box(vec2 p, vec2 b, float r) {
	vec2 q = abs(p) - b + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float cover(float d) {
	return clamp(0.5 - d / u_px, 0.0, 1.0);
}
void lay(inout vec4 c, vec3 col, float a) {
	c = c * (1.0 - a) + vec4(col * a, a);
}
vec3 glowColor(float m) {
	if (m < 1.5) return C_GOLD;
	if (m < 2.5) return vec3(1.0, 0.42, 0.84);
	if (m < 3.5) return vec3(0.38, 1.0, 0.6);
	if (m < 4.5) return vec3(0.7, 0.55, 1.0);
	return vec3(1.0, 0.58, 0.22);
}
void bar(inout vec4 c, vec2 p, vec2 h, vec3 col, float multi, float kind) {
	float d = box(p, h, h.y * 0.5);
	vec3 gc = glowColor(multi);
	if (multi > 0.5 && d > 0.0) {
		float g = 1.0 - d / 0.009;
		lay(c, gc, clamp(g, 0.0, 1.0) * clamp(g, 0.0, 1.0) * 0.75);
	}
	float a = cover(d);
	if (a <= 0.0) return;
	float shade = smoothstep(-h.y, h.y, p.y);
	vec3 body = mix(col * 0.78, min(col * 1.18 + 0.06, vec3(1.0)), shade);
	float inner = cover(d + (multi > 0.5 ? 2.4 : 1.6) * u_px);
	vec3 edge = multi > 0.5 ? gc : min(col + 0.35, vec3(1.0));
	vec3 tone = mix(edge, body, inner);
	if (kind > 3.5) {
		float m = abs(p.x) / (h.y * 1.9) + abs(p.y) / (h.y * 0.62);
		tone = mix(tone, vec3(1.0), cover((m - 1.0) * h.y * 0.6));
	}
	lay(c, tone, a);
}
void main() {
	float kind = v_s.x;
	vec2 h = v_s.yz;
	vec2 p = v_p;
	vec4 c = vec4(0.0);
	if (kind < 0.5) {
		lay(c, C_LINE, cover(abs(p.y) - h.y));
	} else if (kind < 1.5) {
		float y = p.y - v_q.z;
		float len = v_q.w;
		float bw = h.x * 0.88;
		if (len > 0.0) {
			float d = box(vec2(p.x, y - len * 0.5), vec2(bw, len * 0.5), 0.0);
			float a = cover(d);
			float side = smoothstep(bw * 0.55, bw, abs(p.x));
			lay(c, mix(C_HOLD * 0.72, min(C_HOLD + 0.3, vec3(1.0)), side), a * 0.82);
			float cap = box(vec2(p.x, y - len), vec2(bw, 0.0025), 0.0025);
			lay(c, vec3(0.92, 0.98, 1.0), cover(cap) * 0.95);
		}
		if (v_q.y > 0.5) bar(c, vec2(p.x, y), vec2(h.x, HEAD * u_note), C_TAP, v_q.x, 1.0);
	} else if (kind < 4.5) {
		vec3 col = kind < 2.5 ? C_DRAG : kind < 3.5 ? C_TAP : C_FLICK;
		bar(c, p, h, col, v_q.x, kind);
	} else if (kind < 5.5) {
		float age = v_q.x;
		float k = 1.0 - age;
		float s = h.x * mix(0.5, 1.0, 1.0 - k * k * k);
		float w = mix(0.011, 0.0025, age);
		float ring = abs(box(p, vec2(s), s * 0.14)) - w * 0.5;
		lay(c, C_FX, cover(ring) * pow(k, 1.4));
		float core = box(p, vec2(s * 0.62), s * 0.1);
		lay(c, C_FX, cover(core) * pow(k, 9.0) * 0.9);
	} else {
		lay(c, C_FX, cover(box(p, h, 0.0)));
	}
	o = c * v_s.w;
	if (kind > 4.5) o.a *= 0.4;
}`;

const BG_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
uniform vec4 u_uv;
out vec2 v_uv;
void main() {
	v_uv = u_uv.xy + (a_corner * 0.5 + 0.5) * u_uv.zw;
	gl_Position = vec4(a_corner, 0.0, 1.0);
}`;

const BG_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_dim;
out vec4 o;
void main() {
	vec2 q = v_uv - 0.5;
	float vig = 1.0 - dot(q, q) * 0.55;
	o = vec4(texture(u_tex, v_uv).rgb * u_dim * vig, 1.0);
}`;

const WM_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
out vec4 o;
void main() {
	o = texture(u_tex, v_uv) * u_alpha;
}`;

const WATERMARK = "Rendered by PhiBot";
const TEXT_PX = 64;
const TEXT_MAX_W = 2048;

export type CaptionText = { title: string; level: string };

type TextRun = { text: string; weight: number; alpha: number };

function textCanvas(runs: TextRun[]): HTMLCanvasElement | null {
	const c = document.createElement("canvas");
	const g = c.getContext("2d");
	if (!g) return null;
	const font = (px: number, weight: number) =>
		`${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
	const gap = TEXT_PX * 0.45;
	const widths = runs.map((r) => {
		g.font = font(TEXT_PX, r.weight);
		return g.measureText(r.text).width;
	});
	const total = widths.reduce((a, b) => a + b, 0) + gap * (runs.length - 1);
	const px = Math.round(TEXT_PX * Math.min(1, (TEXT_MAX_W - TEXT_PX) / total));
	const k = px / TEXT_PX;
	c.width = Math.ceil(total * k) + TEXT_PX;
	c.height = Math.round(TEXT_PX * 1.5);
	g.textBaseline = "middle";
	let x = TEXT_PX / 2;
	runs.forEach((r, i) => {
		g.font = font(px, r.weight);
		g.globalAlpha = r.alpha;
		g.fillStyle = "rgba(0, 0, 0, 0.6)";
		g.fillText(r.text, x + 3, c.height / 2 + 3);
		g.fillStyle = "#ffffff";
		g.fillText(r.text, x, c.height / 2);
		x += widths[i]! * k + gap * k;
	});
	return c;
}

function watermarkCanvas(): HTMLCanvasElement | null {
	return textCanvas([{ text: WATERMARK, weight: 600, alpha: 1 }]);
}

function captionCanvas(text: CaptionText): HTMLCanvasElement | null {
	const runs: TextRun[] = [{ text: text.title, weight: 600, alpha: 1 }];
	if (text.level) runs.push({ text: text.level, weight: 500, alpha: 0.78 });
	return textCanvas(runs);
}

function textTexture(
	gl: WebGL2RenderingContext,
	canvas: HTMLCanvasElement,
): WebGLTexture {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR_MIPMAP_LINEAR,
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return tex;
}

type Label = { tex: WebGLTexture; aspect: number };

const AREA_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_i0;
layout(location = 2) in vec4 a_i1;
layout(location = 3) in vec4 a_i2;
uniform vec2 u_scale;
flat out vec4 v_q;
void main() {
	vec2 ax = vec2(a_i0.w, a_i1.x);
	vec2 ay = vec2(-ax.y, ax.x);
	vec2 w = a_i0.yz + ax * (a_corner.x * a_i1.y) + ay * (a_corner.y * a_i1.z);
	gl_Position = vec4(w * u_scale, 0.0, 1.0);
	v_q = a_i2;
}`;

const AREA_FS = `#version 300 es
precision mediump float;
flat in vec4 v_q;
out vec4 o;
void main() {
	o = v_q;
}`;

const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
out vec2 v_uv;
void main() {
	v_uv = a_corner * 0.5 + 0.5;
	gl_Position = vec4(a_corner, 0.0, 1.0);
}`;

// Field boundaries wobble with a slow cloud flow; a one-texel ring outside is the outline, the next four rings fade out as glow
const EFFECT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_mask;
uniform sampler2D u_noise;
uniform vec2 u_texel;
uniform float u_time;
out vec4 o;
const float IDLE = ${DISABLED_LEVEL.toFixed(3)};
const vec2 DIR = vec2(0.70710678);
const vec2 PERP = vec2(-0.70710678, 0.70710678);
float xr(float a, float b) {
	return clamp(a + b - 2.0 * a * b, 0.0, 1.0);
}
float act(vec2 p) {
	vec4 m = texture(u_mask, p);
	return xr(m.r, m.g);
}
float ring(vec2 p, float r) {
	vec2 d = u_texel * r;
	float m = act(p + vec2(d.x, 0.0));
	m = max(m, act(p - vec2(d.x, 0.0)));
	m = max(m, act(p + vec2(0.0, d.y)));
	m = max(m, act(p - vec2(0.0, d.y)));
	m = max(m, act(p + d));
	m = max(m, act(p - d));
	m = max(m, act(p + vec2(d.x, -d.y)));
	m = max(m, act(p + vec2(-d.x, d.y)));
	return m;
}
void main() {
	float s = u_time * 0.1295;
	vec2 base = v_uv * vec2(2.13, 1.02);
	float a = texture(u_noise, base + DIR * s).r - 0.5;
	float b = texture(u_noise, base + PERP * s).r - 0.5;
	vec2 p = v_uv + (DIR * a + PERP * b) * 0.1;
	float inside = act(p);
	float edge = 0.0;
	float glow = 0.0;
	if (inside <= 0.0) {
		if (ring(p, 1.0) > 0.0) {
			edge = 1.0;
			glow = 0.459;
		} else if (ring(p, 2.0) > 0.0) {
			glow = 0.283;
		} else if (ring(p, 3.0) > 0.0) {
			glow = 0.157;
		} else if (ring(p, 4.0) > 0.0) {
			glow = 0.073;
		} else if (ring(p, 5.0) > 0.0) {
			glow = 0.025;
		}
	}
	vec4 m = texture(u_mask, v_uv);
	float level = m.a > 0.5 ? (m.b > 0.004 ? 0.0 : IDLE) : m.b;
	o = vec4(inside, edge, glow, level);
}`;

// Active field: a pixelated, flow-warped copy of the chart under a dark red tint with sparks, a light red outline and a red glow; ready: a white flicker; disabled: an additive dark red with dim sparks
const COMPOSE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_chart;
uniform sampler2D u_effect;
uniform sampler2D u_noise;
uniform sampler2D u_scene;
uniform vec2 u_size;
uniform float u_time;
out vec4 o;
const float IDLE = ${DISABLED_LEVEL.toFixed(3)};
const vec2 DIR = vec2(0.70710678);
const vec2 PERP = vec2(-0.70710678, 0.70710678);
const vec3 FILL = vec3(0.713, 0.235, 0.235);
const vec3 EDGE = vec3(1.0, 0.33, 0.33);
const vec3 GLOW = vec3(1.0, 0.179, 0.179);
const vec3 SPARK = vec3(5.69, 1.62, 1.62);
const vec3 IDLE_FILL = vec3(0.199, 0.055, 0.055);
const vec3 IDLE_SPARK = vec3(1.09, 0.272, 0.272);
vec2 flow(vec2 uv, vec2 tile, float speed, out float avg) {
	vec2 base = uv * tile;
	float s = u_time * speed;
	float a = texture(u_noise, base + DIR * s).r;
	float b = texture(u_noise, base + PERP * s).r;
	avg = (a + b) * 0.5;
	return DIR * (a - 0.5) + PERP * (b - 0.5);
}
vec3 overlay(vec3 b, vec3 s) {
	return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b));
}
void main() {
	vec4 e = texture(u_effect, v_uv);
	float inside = e.r;
	float edge = e.g;
	float glow = e.b;
	float level = e.a;
	vec3 col = texture(u_chart, v_uv).rgb;
	if (level >= 0.9) {
		col += vec3(0.12 * (1.0 + 0.5 * sin(u_time * 37.9)));
	} else if (level > 0.0) {
		float avg;
		vec2 d = flow(v_uv, vec2(0.5, 0.2), 0.015, avg);
		float sp = texture(u_noise, v_uv * vec2(3.0, 1.2) + d * 2.29).b * avg;
		col += clamp(level / IDLE, 0.0, 1.0) * (IDLE_FILL + IDLE_SPARK * sp);
	}
	if (inside + edge + glow > 0.0) {
		float cell = max(1.0, floor(u_size.y / 180.0));
		vec2 puv = (floor(v_uv * u_size / cell) + 0.5) * cell / u_size;
		float avg;
		vec2 d = flow(puv, vec2(0.8, 0.3), 0.075, avg);
		vec3 inner = texture(u_scene, puv + d * 0.15).rgb;
		vec3 sp = clamp(texture(u_noise, v_uv * vec2(3.0, 1.2) + d * 2.39).b * avg * SPARK, 0.0, 1.0);
		inner = overlay(inner, sp);
		vec3 fill = mix(max(FILL - avg * 0.411, 0.0), inner, 0.667);
		float aEdge = edge * 0.8;
		float aGlow = glow * clamp(1.0 - edge - inside, 0.0, 1.0) * 0.8;
		float alpha = inside * 0.667 + aEdge + aGlow;
		col = col * (1.0 - alpha) + fill * inside + EDGE * aEdge + GLOW * aGlow;
	}
	o = vec4(col, 1.0);
}`;

const NOISE_SIZE = 256;
const SPARK_COUNT = 560;

function hash2(x: number, y: number, seed: number): number {
	let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ seed;
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

function clouds(seed: number, out: Uint8Array, channel: number) {
	const n = NOISE_SIZE;
	const sum = new Float32Array(n * n);
	let amp = 1;
	for (let period = 4; period <= 64; period *= 2) {
		const grid = new Float32Array(period * period);
		for (let i = 0; i < grid.length; i++) {
			grid[i] = hash2(i % period, (i / period) | 0, seed + period);
		}
		for (let y = 0; y < n; y++) {
			const fy = (y / n) * period;
			const iy = fy | 0;
			const ty = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
			const y1 = (iy + 1) % period;
			for (let x = 0; x < n; x++) {
				const fx = (x / n) * period;
				const ix = fx | 0;
				const tx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
				const x1 = (ix + 1) % period;
				const a = grid[iy * period + ix]!;
				const b = grid[iy * period + x1]!;
				const c = grid[y1 * period + ix]!;
				const d = grid[y1 * period + x1]!;
				const top = a + (b - a) * tx;
				sum[y * n + x]! += amp * (top + (c + (d - c) * tx - top) * ty);
			}
		}
		amp *= 0.55;
	}
	let lo = Number.POSITIVE_INFINITY;
	let hi = Number.NEGATIVE_INFINITY;
	for (const v of sum) {
		if (v < lo) lo = v;
		if (v > hi) hi = v;
	}
	const span = hi - lo || 1;
	for (let i = 0; i < sum.length; i++) {
		out[i * 4 + channel] = Math.round(((sum[i]! - lo) / span) * 255);
	}
}

function sparks(seed: number, out: Uint8Array, channel: number) {
	const n = NOISE_SIZE;
	const v = new Float32Array(n * n);
	for (let k = 0; k < SPARK_COUNT; k++) {
		const cx = hash2(k, 1, seed) * n;
		const cy = hash2(k, 2, seed) * n;
		const r = 0.8 + hash2(k, 3, seed);
		const bright = 0.55 + hash2(k, 4, seed) * 0.45;
		for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
			for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
				const f = Math.max(0, 1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r);
				if (f <= 0) continue;
				const i = (((y % n) + n) % n) * n + (((x % n) + n) % n);
				v[i] = Math.max(v[i]!, bright * f * f);
			}
		}
	}
	for (let i = 0; i < v.length; i++)
		out[i * 4 + channel] = Math.round(v[i]! * 255);
}

function noiseTexture(gl: WebGL2RenderingContext): WebGLTexture {
	const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
	clouds(11, data, 0);
	clouds(23, data, 1);
	sparks(37, data, 2);
	for (let i = 3; i < data.length; i += 4) data[i] = 255;
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		NOISE_SIZE,
		NOISE_SIZE,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		data,
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	return tex;
}

function shader(gl: WebGL2RenderingContext, type: number, src: string) {
	const s = gl.createShader(type);
	if (!s) throw new Error("gl: shader");
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
		throw new Error(`gl: ${gl.getShaderInfoLog(s)}`);
	}
	return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
	const p = gl.createProgram();
	if (!p) throw new Error("gl: program");
	gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
	gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
		throw new Error(`gl: ${gl.getProgramInfoLog(p)}`);
	}
	return p;
}

type Targets = {
	w: number;
	h: number;
	chartTex: WebGLTexture;
	chart: WebGLFramebuffer;
	maskTex: WebGLTexture;
	mask: WebGLFramebuffer;
	mw: number;
	mh: number;
	effectTex: WebGLTexture;
	effect: WebGLFramebuffer;
	ew: number;
	eh: number;
	sceneTex: WebGLTexture;
	scene: WebGLFramebuffer;
	sw: number;
	sh: number;
};

type Res = {
	notes: WebGLProgram;
	bg: WebGLProgram;
	wm: WebGLProgram;
	wmLabel: Label | null;
	caption: Label | null;
	uWmUv: WebGLUniformLocation | null;
	uWmAlpha: WebGLUniformLocation | null;
	area: WebGLProgram;
	compose: WebGLProgram;
	effect: WebGLProgram;
	noiseTex: WebGLTexture | null;
	vao: WebGLVertexArrayObject;
	bgVao: WebGLVertexArrayObject;
	areaVao: WebGLVertexArrayObject;
	inst: WebGLBuffer;
	areaBuf: WebGLBuffer;
	cap: number;
	areaCap: number;
	tex: WebGLTexture | null;
	targets: Targets | null;
	uScale: WebGLUniformLocation | null;
	uPx: WebGLUniformLocation | null;
	uNote: WebGLUniformLocation | null;
	uUv: WebGLUniformLocation | null;
	uDim: WebGLUniformLocation | null;
	uAreaScale: WebGLUniformLocation | null;
	uEffMask: WebGLUniformLocation | null;
	uEffNoise: WebGLUniformLocation | null;
	uEffTexel: WebGLUniformLocation | null;
	uEffTime: WebGLUniformLocation | null;
	uChart: WebGLUniformLocation | null;
	uEffect: WebGLUniformLocation | null;
	uNoise: WebGLUniformLocation | null;
	uScene: WebGLUniformLocation | null;
	uSize: WebGLUniformLocation | null;
	uTime: WebGLUniformLocation | null;
};

export type Backdrop = TexImageSource & { width: number; height: number };

export type AreaFrame = {
	data: Float32Array;
	counts: AreaCounts;
	time: number;
};

function target(
	gl: WebGL2RenderingContext,
	w: number,
	h: number,
	nearest = false,
) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
	const filter = nearest ? gl.NEAREST : gl.LINEAR;
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		tex,
		0,
	);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	return { tex, fb };
}

export class ChartRenderer {
	private readonly gl: WebGL2RenderingContext;
	private res: Res | null = null;
	private backdrop: Backdrop | null = null;
	private captionText: CaptionText | null = null;
	private noteScale = 1;
	private lost = false;
	drawCalls = 0;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		opts: { preserve?: boolean } = {},
	) {
		const gl = canvas.getContext("webgl2", {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: true,
			preserveDrawingBuffer: opts.preserve ?? false,
			powerPreference: "high-performance",
		});
		if (!gl) throw new Error("webgl2");
		this.gl = gl;
		canvas.addEventListener("webglcontextlost", this.onLost);
		canvas.addEventListener("webglcontextrestored", this.onRestored);
		this.res = this.init();
	}

	private onLost = (e: Event) => {
		e.preventDefault();
		this.lost = true;
		this.res = null;
	};

	private onRestored = () => {
		this.lost = false;
		this.res = this.init();
		if (this.backdrop) this.setBackdrop(this.backdrop);
		if (this.captionText) this.setCaption(this.captionText);
	};

	private init(): Res {
		const gl = this.gl;
		const notes = program(gl, NOTE_VS, NOTE_FS);
		const bg = program(gl, BG_VS, BG_FS);
		const wm = program(gl, BG_VS, WM_FS);
		const mark = watermarkCanvas();
		const wmLabel = mark
			? { tex: textTexture(gl, mark), aspect: mark.width / mark.height }
			: null;
		const area = program(gl, AREA_VS, AREA_FS);
		const compose = program(gl, QUAD_VS, COMPOSE_FS);
		const effect = program(gl, QUAD_VS, EFFECT_FS);
		const quad = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
			gl.STATIC_DRAW,
		);
		const bgVao = gl.createVertexArray();
		gl.bindVertexArray(bgVao);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const inst = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, inst);
		for (let i = 0; i < 3; i++) {
			gl.enableVertexAttribArray(1 + i);
			gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
			gl.vertexAttribDivisor(1 + i, 1);
		}
		const areaVao = gl.createVertexArray();
		gl.bindVertexArray(areaVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const areaBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, areaBuf);
		for (let i = 0; i < 3; i++) {
			gl.enableVertexAttribArray(1 + i);
			gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
			gl.vertexAttribDivisor(1 + i, 1);
		}
		gl.bindVertexArray(null);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		return {
			notes,
			bg,
			area,
			compose,
			effect,
			noiseTex: null,
			vao,
			bgVao,
			areaVao,
			inst,
			areaBuf,
			cap: 0,
			areaCap: 0,
			tex: null,
			targets: null,
			uScale: gl.getUniformLocation(notes, "u_scale"),
			uPx: gl.getUniformLocation(notes, "u_px"),
			uNote: gl.getUniformLocation(notes, "u_note"),
			uUv: gl.getUniformLocation(bg, "u_uv"),
			uDim: gl.getUniformLocation(bg, "u_dim"),
			wm,
			wmLabel,
			caption: null,
			uWmUv: gl.getUniformLocation(wm, "u_uv"),
			uWmAlpha: gl.getUniformLocation(wm, "u_alpha"),
			uAreaScale: gl.getUniformLocation(area, "u_scale"),
			uEffMask: gl.getUniformLocation(effect, "u_mask"),
			uEffNoise: gl.getUniformLocation(effect, "u_noise"),
			uEffTexel: gl.getUniformLocation(effect, "u_texel"),
			uEffTime: gl.getUniformLocation(effect, "u_time"),
			uChart: gl.getUniformLocation(compose, "u_chart"),
			uEffect: gl.getUniformLocation(compose, "u_effect"),
			uNoise: gl.getUniformLocation(compose, "u_noise"),
			uScene: gl.getUniformLocation(compose, "u_scene"),
			uSize: gl.getUniformLocation(compose, "u_size"),
			uTime: gl.getUniformLocation(compose, "u_time"),
		};
	}

	setBackdrop(source: Backdrop | null) {
		this.backdrop = source;
		const res = this.res;
		if (!res) return;
		const gl = this.gl;
		if (res.tex) gl.deleteTexture(res.tex);
		res.tex = null;
		if (!source) return;
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		res.tex = tex;
	}

	setCaption(text: CaptionText | null) {
		this.captionText = text;
		const res = this.res;
		if (!res) return;
		const gl = this.gl;
		if (res.caption) gl.deleteTexture(res.caption.tex);
		res.caption = null;
		if (!text) return;
		const c = captionCanvas(text);
		if (c)
			res.caption = { tex: textTexture(gl, c), aspect: c.width / c.height };
	}

	setNoteScale(scale: number) {
		this.noteScale = scale;
	}

	draw(data: Float32Array, count: number, areas?: AreaFrame) {
		const res = this.res;
		this.drawCalls = 0;
		if (!res || this.lost) return;
		const gl = this.gl;
		const cw = this.canvas.width;
		const ch = this.canvas.height;
		let w = cw;
		let h = Math.round(cw / ASPECT);
		if (h > ch) {
			h = ch;
			w = Math.round(ch * ASPECT);
		}
		const x = Math.floor((cw - w) / 2);
		const y = Math.floor((ch - h) / 2);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, cw, ch);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		if (!areas?.counts.total) {
			gl.viewport(x, y, w, h);
			this.scene(res, data, count, w, [x, y, w, h]);
			this.labels(res, x, y, w, h);
			return;
		}
		const tg = this.targets(res, w, h);
		if (!res.noiseTex) res.noiseTex = noiseTexture(gl);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.chart);
		gl.viewport(0, 0, w, h);
		this.scene(res, data, count, w, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.mask);
		gl.viewport(0, 0, tg.mw, tg.mh);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.drawAreas(res, areas);
		gl.disable(gl.BLEND);
		gl.bindVertexArray(res.bgVao);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.effect);
		gl.viewport(0, 0, tg.ew, tg.eh);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.effect);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, res.noiseTex);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tg.maskTex);
		gl.uniform1i(res.uEffMask, 0);
		gl.uniform1i(res.uEffNoise, 1);
		gl.uniform2f(res.uEffTexel, 1 / tg.ew, 1 / tg.eh);
		gl.uniform1f(res.uEffTime, areas.time);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		this.drawCalls++;
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.scene);
		gl.viewport(0, 0, tg.sw, tg.sh);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.wm);
		gl.uniform4f(res.uWmUv, 0, 0, 1, 1);
		gl.uniform1f(res.uWmAlpha, 1);
		gl.bindTexture(gl.TEXTURE_2D, tg.chartTex);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		this.drawCalls++;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(x, y, w, h);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.compose);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, tg.sceneTex);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, res.noiseTex);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, tg.effectTex);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tg.chartTex);
		gl.uniform1i(res.uChart, 0);
		gl.uniform1i(res.uEffect, 1);
		gl.uniform1i(res.uNoise, 2);
		gl.uniform1i(res.uScene, 3);
		gl.uniform2f(res.uSize, w, h);
		gl.uniform1f(res.uTime, areas.time);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		this.drawCalls++;
		gl.enable(gl.BLEND);
		gl.bindVertexArray(null);
		this.labels(res, x, y, w, h);
	}

	private labels(res: Res, x: number, y: number, w: number, h: number) {
		if (!res.wmLabel && !res.caption) return;
		const gl = this.gl;
		const margin = Math.round(h * 0.02);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.wm);
		gl.uniform4f(res.uWmUv, 0, 0, 1, 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindVertexArray(res.bgVao);
		if (res.wmLabel) {
			const th = Math.max(8, Math.round(h * 0.034));
			const tw = Math.round(th * res.wmLabel.aspect);
			this.label(
				res,
				res.wmLabel,
				x + w - tw - margin,
				y + margin,
				tw,
				th,
				0.55,
			);
		}
		if (res.caption) {
			let th = Math.max(10, Math.round(h * 0.046));
			let tw = Math.round(th * res.caption.aspect);
			const maxW = Math.round(w * 0.6);
			if (tw > maxW) {
				tw = maxW;
				th = Math.max(8, Math.round(maxW / res.caption.aspect));
			}
			this.label(res, res.caption, x + margin, y + margin, tw, th, 0.92);
		}
		gl.bindVertexArray(null);
		gl.viewport(x, y, w, h);
	}

	private label(
		res: Res,
		label: Label,
		lx: number,
		ly: number,
		tw: number,
		th: number,
		alpha: number,
	) {
		const gl = this.gl;
		gl.viewport(lx, ly, tw, th);
		gl.uniform1f(res.uWmAlpha, alpha);
		gl.bindTexture(gl.TEXTURE_2D, label.tex);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		this.drawCalls++;
	}

	private targets(res: Res, w: number, h: number): Targets {
		const old = res.targets;
		if (old && old.w === w && old.h === h) return old;
		const gl = this.gl;
		if (old) {
			for (const fb of [old.chart, old.mask, old.effect, old.scene]) {
				gl.deleteFramebuffer(fb);
			}
			for (const tex of [
				old.chartTex,
				old.maskTex,
				old.effectTex,
				old.sceneTex,
			]) {
				gl.deleteTexture(tex);
			}
		}
		const mw = Math.max(1, w >> 3);
		const mh = Math.max(1, h >> 3);
		const ew = Math.max(1, w >> 2);
		const eh = Math.max(1, h >> 2);
		const sw = Math.max(1, Math.floor(w / 6));
		const sh = Math.max(1, Math.floor(h / 6));
		const chart = target(gl, w, h);
		const mask = target(gl, mw, mh, true);
		const effect = target(gl, ew, eh);
		const scene = target(gl, sw, sh, true);
		const next: Targets = {
			w,
			h,
			chartTex: chart.tex,
			chart: chart.fb,
			maskTex: mask.tex,
			mask: mask.fb,
			mw,
			mh,
			effectTex: effect.tex,
			effect: effect.fb,
			ew,
			eh,
			sceneTex: scene.tex,
			scene: scene.fb,
			sw,
			sh,
		};
		res.targets = next;
		return next;
	}

	private scene(
		res: Res,
		data: Float32Array,
		count: number,
		w: number,
		box: [number, number, number, number] | null,
	) {
		const gl = this.gl;
		if (res.tex && this.backdrop) {
			const ia = this.backdrop.width / Math.max(1, this.backdrop.height);
			const sx = ia > ASPECT ? ASPECT / ia : 1;
			const sy = ia > ASPECT ? 1 : ia / ASPECT;
			// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
			gl.useProgram(res.bg);
			gl.uniform4f(res.uUv, (1 - sx) / 2, (1 - sy) / 2, sx, sy);
			gl.uniform1f(res.uDim, 0.38);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, res.tex);
			gl.bindVertexArray(res.bgVao);
			gl.disable(gl.BLEND);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.enable(gl.BLEND);
			this.drawCalls++;
		} else {
			if (box) {
				gl.enable(gl.SCISSOR_TEST);
				gl.scissor(box[0], box[1], box[2], box[3]);
			}
			gl.clearColor(0.06, 0.07, 0.09, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.disable(gl.SCISSOR_TEST);
		}
		if (count) this.drawInstances(res, data, count, w);
	}

	private drawAreas(res: Res, areas: AreaFrame) {
		const gl = this.gl;
		const { data, counts } = areas;
		gl.bindBuffer(gl.ARRAY_BUFFER, res.areaBuf);
		if (res.areaCap < data.length) {
			gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
			res.areaCap = data.length;
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, counts.total * STRIDE);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.area);
		gl.uniform2f(res.uAreaScale, 1, ASPECT);
		gl.bindVertexArray(res.areaVao);
		const group = (first: number, n: number) => {
			if (!n) return;
			for (let i = 0; i < 3; i++) {
				gl.vertexAttribPointer(
					1 + i,
					4,
					gl.FLOAT,
					false,
					STRIDE * 4,
					first * STRIDE * 4 + i * 16,
				);
			}
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
			this.drawCalls++;
		};
		gl.blendEquation(gl.MAX);
		gl.colorMask(true, false, true, false);
		group(0, counts.normal);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ZERO);
		gl.colorMask(false, true, false, false);
		group(counts.normal, counts.activeSub);
		gl.blendFuncSeparate(gl.ZERO, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ZERO);
		gl.colorMask(false, false, false, true);
		group(counts.normal + counts.activeSub, counts.idleSub);
		gl.colorMask(true, true, true, true);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.bindVertexArray(null);
	}

	private drawInstances(
		res: Res,
		data: Float32Array,
		count: number,
		w: number,
	) {
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, res.inst);
		if (res.cap < data.length) {
			gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
			res.cap = data.length;
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * STRIDE);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.notes);
		gl.uniform2f(res.uScale, 1, ASPECT);
		gl.uniform1f(res.uPx, 2 / w);
		gl.uniform1f(res.uNote, this.noteScale);
		gl.bindVertexArray(res.vao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
		gl.bindVertexArray(null);
		this.drawCalls++;
	}

	dispose() {
		this.canvas.removeEventListener("webglcontextlost", this.onLost);
		this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
		this.gl.getExtension("WEBGL_lose_context")?.loseContext();
		this.res = null;
	}
}
