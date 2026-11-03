import type { AreaCounts } from "./areas";
import { DISABLED_LEVEL } from "./areas";
import { ASPECT, WATERMARK } from "./base";
import { STRIDE, TAP_HH } from "./frame";
import { NOISE_SIZE, noiseData } from "./noise";

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

export type CaptionText = { title: string; level: string };

type TextRun = { text: string; weight: number; alpha: number };

type Label = { tex: WebGLTexture; w: number; h: number };

const TEXT_LINE = 1.5;

function textCanvas(
	runs: TextRun[],
	height: number,
	maxWidth: number,
): HTMLCanvasElement | null {
	const c = document.createElement("canvas");
	const g = c.getContext("2d");
	if (!g) return null;
	const font = (px: number, weight: number) =>
		`${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
	const base = height / TEXT_LINE;
	const widths = runs.map((r) => {
		g.font = font(base, r.weight);
		return g.measureText(r.text).width;
	});
	const natural =
		widths.reduce((a, b) => a + b, 0) + base * (0.45 * (runs.length - 1) + 1);
	const k = Math.min(1, maxWidth / natural);
	const px = base * k;
	c.width = Math.max(1, Math.ceil(natural * k));
	c.height = Math.max(1, Math.round(px * TEXT_LINE));
	const shadow = Math.max(1, Math.round(px * 0.047));
	g.textBaseline = "middle";
	let x = px / 2;
	runs.forEach((r, i) => {
		g.font = font(px, r.weight);
		g.globalAlpha = r.alpha;
		g.fillStyle = "rgba(0, 0, 0, 0.6)";
		g.fillText(r.text, x + shadow, c.height / 2 + shadow);
		g.fillStyle = "#ffffff";
		g.fillText(r.text, x, c.height / 2);
		x += widths[i]! * k + px * 0.45;
	});
	return c;
}

function labelTexture(
	gl: WebGL2RenderingContext,
	canvas: HTMLCanvasElement,
): Label {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	sampling(gl, gl.NEAREST, gl.CLAMP_TO_EDGE);
	return { tex, w: canvas.width, h: canvas.height };
}

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

// The field grid matches the game at 1920x1080: masks at 1/8, outline and glow at 1/4, the pixelated interior at 1/6
const MASK_W = 240;
const MASK_H = 135;
const RING_W = MASK_W * 2;
const RING_H = MASK_H * 2;
const SCENE_W = 320;
const SCENE_H = 180;
const AREA_MARGIN = 0.11;

const FLOW = `
const vec2 DIR = vec2(0.70710678);
const vec2 PERP = vec2(-0.70710678, 0.70710678);
vec2 flow(float a, float b) {
	return DIR * (a - 0.5) + PERP * (b - 0.5);
}`;

// Active fields: the active mask looked up through a slow flow, so blocks wobble; ready and disabled levels pass through
const FIELD_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_mask;
uniform sampler2D u_noise;
uniform float u_time;
out vec4 o;
const float IDLE = ${DISABLED_LEVEL.toFixed(3)};
${FLOW}
void main() {
	float s = u_time * 0.1295;
	vec2 p = v_uv * vec2(2.13, 1.02);
	vec2 d = flow(texture(u_noise, p + DIR * s).r, texture(u_noise, p + PERP * s).r);
	vec4 m = texture(u_mask, v_uv + d * 0.1);
	vec4 h = texture(u_mask, v_uv);
	float idle = h.a > 0.5 ? (h.b > 0.004 ? 0.0 : IDLE) : h.b;
	float ready = step(0.9, idle);
	o = vec4(abs(m.r - m.g), ready, idle * (1.0 - ready) / IDLE, 0.0);
}`;

// Distance in outline texels to the nearest active block, found per row here and per column in RINGS_FS; stored as 1 - d/8 so cleared texels read as far away
const ROWS_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_field;
out vec4 o;
void main() {
	ivec2 q = ivec2(gl_FragCoord.xy);
	int c = q.x >> 1;
	int w = textureSize(u_field, 0).x;
	int d = 6;
	for (int k = -3; k <= 3; k++) {
		int b = c + k;
		if (b < 0 || b >= w) continue;
		if (texelFetch(u_field, ivec2(b, q.y), 0).r < 0.5) continue;
		d = min(d, k == 0 ? 0 : (k > 0 ? 2 * b - q.x : q.x - 2 * b - 1));
	}
	o = vec4(1.0 - float(d) / 8.0, 0.0, 0.0, 1.0);
}`;

const RINGS_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_rows;
out vec4 o;
const float W[5] = float[5](0.45856798, 0.28286123, 0.15658922, 0.07305908, 0.02494781);
void main() {
	ivec2 q = ivec2(gl_FragCoord.xy);
	int c = q.y >> 1;
	int h = textureSize(u_rows, 0).y;
	int d = 6;
	for (int k = -3; k <= 3; k++) {
		int b = c + k;
		if (b < 0 || b >= h) continue;
		int dy = k == 0 ? 0 : (k > 0 ? 2 * b - q.y : q.y - 2 * b - 1);
		int dx = int((1.0 - texelFetch(u_rows, ivec2(q.x, b), 0).r) * 8.0 + 0.5);
		d = min(d, max(dx, dy));
	}
	o = d >= 1 && d <= 5 ? vec4(d == 1 ? 1.0 : 0.0, W[d - 1], 0.0, 1.0) : vec4(0.0);
}`;

// Active: a pixelated, displaced copy of the chart, hue-shifted and overlaid with sparks, under a dark red fill, with a light red outline and red glow; ready: a white flicker; disabled: an additive dark red with dim sparks
const OVERLAY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_field;
uniform sampler2D u_rings;
uniform sampler2D u_noise;
uniform sampler2D u_scene;
uniform float u_time;
out vec4 o;
const vec2 CELLS = vec2(${SCENE_W}.0, ${SCENE_H}.0);
const vec3 FILL = vec3(0.7132, 0.2355, 0.2355);
const vec3 EDGE = vec3(1.0, 0.3302, 0.3302);
const vec3 GLOW = vec3(1.0, 0.1792, 0.1792);
const vec3 SPARK = vec3(1.0, 0.2849, 0.2849) * 5.69;
const vec3 IDLE_FILL = vec3(0.497, 0.1377, 0.1377) * 0.4;
const vec3 IDLE_SPARK = vec3(0.3113, 0.0778, 0.0778) * 3.5;
${FLOW}
vec3 toHsv(vec3 c) {
	vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = c.g < c.b ? vec4(c.bg, k.wz) : vec4(c.gb, k.xy);
	vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);
	float d = q.x - min(q.w, q.y);
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 toRgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec3 overlay(vec3 b, vec3 s) {
	return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b));
}
float cloud(vec2 p) {
	return texture(u_noise, p).r;
}
void main() {
	vec4 f = texture(u_field, v_uv);
	ivec2 rs = textureSize(u_rings, 0);
	float edge = texelFetch(u_rings, min(ivec2(v_uv * vec2(rs)), rs - 1), 0).r;
	float glow = texture(u_rings, v_uv).g;
	float act = f.r;
	if (act + edge + glow + f.g + f.b < 1e-4) discard;
	vec3 c = vec3(0.0);
	float alpha = 0.0;
	if (act > 0.0) {
		float s = u_time * 0.075;
		vec2 p = v_uv * vec2(0.8, 0.3);
		float a = cloud((floor((p + DIR * s) * CELLS) + 0.5) / CELLS);
		float b = cloud((floor((p + PERP * s) * CELLS) + 0.5) / CELLS);
		float avg = (a + b) * 0.5;
		vec2 d = flow(a, b);
		vec3 scene = texture(u_scene, (floor(v_uv * CELLS) + 0.5) / CELLS + d * 0.15).rgb;
		vec3 sp = texture(u_noise, v_uv * vec2(1.5, 0.6) + d * 1.195).g * avg * SPARK;
		vec3 lit = clamp(overlay(toRgb(toHsv(scene) + sp * 0.2), sp), 0.0, 1.0);
		c = mix(FILL - avg * 0.411, lit, 0.667) * act;
		alpha = act * 0.667;
	}
	float g = glow * (1.0 - edge - act);
	c += EDGE * (edge * 0.8) + GLOW * (g * 0.8);
	alpha += edge * 0.8 + g * 0.8;
	c += vec3(0.12 * (sin(u_time * 37.9) * 0.5 + 1.0)) * f.g;
	if (f.b > 0.0) {
		float s = u_time * 0.015;
		vec2 p = v_uv * vec2(0.5, 0.2);
		float a = cloud(p + DIR * s);
		float b = cloud(p + PERP * s);
		float sp = texture(u_noise, v_uv * vec2(1.5, 0.6) + flow(a, b) * 1.145).g * (a + b) * 0.5;
		c += f.b * (IDLE_FILL + IDLE_SPARK * sp) * (1.0 - alpha);
	}
	o = vec4(c, alpha);
}`;

function sampling(gl: WebGL2RenderingContext, filter: number, wrap: number) {
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
}

function noiseTexture(gl: WebGL2RenderingContext): WebGLTexture {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RG8,
		NOISE_SIZE,
		NOISE_SIZE,
		0,
		gl.RG,
		gl.UNSIGNED_BYTE,
		noiseData(),
	);
	sampling(gl, gl.LINEAR, gl.REPEAT);
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

function samplers(
	gl: WebGL2RenderingContext,
	p: WebGLProgram,
	names: string[],
) {
	// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
	gl.useProgram(p);
	names.forEach((n, i) => {
		gl.uniform1i(gl.getUniformLocation(p, n), i);
	});
}

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer };

function target(
	gl: WebGL2RenderingContext,
	w: number,
	h: number,
	format: number,
	filter: number,
): Target {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texStorage2D(gl.TEXTURE_2D, 1, format, w, h);
	sampling(gl, filter, gl.CLAMP_TO_EDGE);
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

type Targets = {
	scene: Target;
	mask: Target;
	field: Target;
	rows: Target;
	rings: Target;
};

type Res = {
	notes: WebGLProgram;
	bg: WebGLProgram;
	wm: WebGLProgram;
	area: WebGLProgram;
	field: WebGLProgram;
	rows: WebGLProgram;
	rings: WebGLProgram;
	overlay: WebGLProgram;
	vao: WebGLVertexArrayObject;
	bgVao: WebGLVertexArrayObject;
	areaVao: WebGLVertexArrayObject;
	inst: WebGLBuffer;
	areaBuf: WebGLBuffer;
	cap: number;
	areaCap: number;
	tex: WebGLTexture | null;
	noiseTex: WebGLTexture | null;
	targets: Targets | null;
	mark: Label | null;
	caption: Label | null;
	labelsFor: number;
	uScale: WebGLUniformLocation | null;
	uPx: WebGLUniformLocation | null;
	uNote: WebGLUniformLocation | null;
	uUv: WebGLUniformLocation | null;
	uDim: WebGLUniformLocation | null;
	uWmUv: WebGLUniformLocation | null;
	uWmAlpha: WebGLUniformLocation | null;
	uAreaScale: WebGLUniformLocation | null;
	uFieldTime: WebGLUniformLocation | null;
	uOverlayTime: WebGLUniformLocation | null;
};

export type Backdrop = TexImageSource & { width: number; height: number };

export type AreaFrame = {
	data: Float32Array;
	counts: AreaCounts;
	time: number;
};

function clamp01(v: number) {
	return Math.min(Math.max(v, 0), 1);
}

function areaBounds(areas: AreaFrame, out: Float32Array): Float32Array {
	const { data, counts } = areas;
	let x0 = Number.POSITIVE_INFINITY;
	let y0 = Number.POSITIVE_INFINITY;
	let x1 = Number.NEGATIVE_INFINITY;
	let y1 = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < counts.total; i++) {
		const o = i * STRIDE;
		const c = Math.abs(data[o + 3]!);
		const s = Math.abs(data[o + 4]!);
		const hx = Math.abs(data[o + 5]!);
		const hy = Math.abs(data[o + 6]!);
		const ex = c * hx + s * hy;
		const ey = (s * hx + c * hy) * ASPECT;
		const x = data[o + 1]!;
		const y = data[o + 2]! * ASPECT;
		x0 = Math.min(x0, x - ex);
		x1 = Math.max(x1, x + ex);
		y0 = Math.min(y0, y - ey);
		y1 = Math.max(y1, y + ey);
	}
	if (!(x1 >= x0 && y1 >= y0)) {
		out.set([0, 0, 1, 1]);
		return out;
	}
	out[0] = clamp01((x0 + 1) / 2 - AREA_MARGIN);
	out[1] = clamp01((y0 + 1) / 2 - AREA_MARGIN);
	out[2] = clamp01((x1 + 1) / 2 + AREA_MARGIN);
	out[3] = clamp01((y1 + 1) / 2 + AREA_MARGIN);
	return out;
}

function clip(
	gl: WebGL2RenderingContext,
	box: Float32Array,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	const l = Math.floor(box[0]! * w);
	const b = Math.floor(box[1]! * h);
	gl.enable(gl.SCISSOR_TEST);
	gl.scissor(
		x + l,
		y + b,
		Math.ceil(box[2]! * w) - l,
		Math.ceil(box[3]! * h) - b,
	);
}

export class ChartRenderer {
	private readonly gl: WebGL2RenderingContext;
	private readonly withLabels: boolean;
	private res: Res | null = null;
	private backdrop: Backdrop | null = null;
	private captionText: CaptionText | null = null;
	private noteScale = 1;
	private lost = false;
	private readonly box = new Float32Array(4);

	constructor(
		private readonly canvas: HTMLCanvasElement,
		opts: { preserve?: boolean; labels?: boolean } = {},
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
		this.withLabels = opts.labels ?? false;
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
	};

	private init(): Res {
		const gl = this.gl;
		const notes = program(gl, NOTE_VS, NOTE_FS);
		const bg = program(gl, BG_VS, BG_FS);
		const wm = program(gl, BG_VS, WM_FS);
		const area = program(gl, AREA_VS, AREA_FS);
		const field = program(gl, QUAD_VS, FIELD_FS);
		const rows = program(gl, QUAD_VS, ROWS_FS);
		const rings = program(gl, QUAD_VS, RINGS_FS);
		const overlay = program(gl, QUAD_VS, OVERLAY_FS);
		samplers(gl, field, ["u_mask", "u_noise"]);
		samplers(gl, rows, ["u_field"]);
		samplers(gl, rings, ["u_rows"]);
		samplers(gl, overlay, ["u_field", "u_rings", "u_noise", "u_scene"]);
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
			wm,
			area,
			field,
			rows,
			rings,
			overlay,
			vao,
			bgVao,
			areaVao,
			inst,
			areaBuf,
			cap: 0,
			areaCap: 0,
			tex: null,
			noiseTex: null,
			targets: null,
			mark: null,
			caption: null,
			labelsFor: -1,
			uScale: gl.getUniformLocation(notes, "u_scale"),
			uPx: gl.getUniformLocation(notes, "u_px"),
			uNote: gl.getUniformLocation(notes, "u_note"),
			uUv: gl.getUniformLocation(bg, "u_uv"),
			uDim: gl.getUniformLocation(bg, "u_dim"),
			uWmUv: gl.getUniformLocation(wm, "u_uv"),
			uWmAlpha: gl.getUniformLocation(wm, "u_alpha"),
			uAreaScale: gl.getUniformLocation(area, "u_scale"),
			uFieldTime: gl.getUniformLocation(field, "u_time"),
			uOverlayTime: gl.getUniformLocation(overlay, "u_time"),
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
		sampling(gl, gl.LINEAR, gl.CLAMP_TO_EDGE);
		res.tex = tex;
	}

	setCaption(text: CaptionText | null) {
		this.captionText = text;
		if (this.res) this.res.labelsFor = -1;
	}

	setNoteScale(scale: number) {
		this.noteScale = scale;
	}

	draw(data: Float32Array, count: number, split: number, areas?: AreaFrame) {
		const res = this.res;
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
		this.upload(res, data, count);
		const fields = areas?.counts.total ? this.fields(res, areas, split) : null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, cw, ch);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.viewport(x, y, w, h);
		if (!fields || !areas) {
			this.scene(res, count, w, [x, y, w, h]);
		} else {
			this.scene(res, split, w, [x, y, w, h]);
			this.overlay(res, areas.time, fields, x, y, w, h);
			this.notes(res, split, count - split, w);
		}
		if (this.withLabels) this.labels(res, x, y, w, h);
	}

	private upload(res: Res, data: Float32Array, count: number) {
		if (!count) return;
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, res.inst);
		if (res.cap < data.length) {
			gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
			res.cap = data.length;
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * STRIDE);
	}

	private fields(res: Res, areas: AreaFrame, split: number): Float32Array {
		const gl = this.gl;
		const tg = res.targets ?? this.makeTargets(res);
		if (!res.noiseTex) res.noiseTex = noiseTexture(gl);
		const box = areaBounds(areas, this.box);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.scene.fb);
		gl.viewport(0, 0, SCENE_W, SCENE_H);
		this.scene(res, split, SCENE_W, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.mask.fb);
		gl.viewport(0, 0, MASK_W, MASK_H);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.drawAreas(res, areas);
		gl.disable(gl.BLEND);
		gl.bindVertexArray(res.bgVao);
		gl.bindFramebuffer(gl.FRAMEBUFFER, tg.field.fb);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.field);
		gl.uniform1f(res.uFieldTime, areas.time);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, res.noiseTex);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tg.mask.tex);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		this.ringPass(res.rows, tg.rows, tg.field.tex, RING_W, MASK_H, box);
		this.ringPass(res.rings, tg.rings, tg.rows.tex, RING_W, RING_H, box);
		gl.enable(gl.BLEND);
		gl.bindVertexArray(null);
		return box;
	}

	private ringPass(
		p: WebGLProgram,
		to: Target,
		from: WebGLTexture,
		w: number,
		h: number,
		box: Float32Array,
	) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb);
		gl.viewport(0, 0, w, h);
		gl.clear(gl.COLOR_BUFFER_BIT);
		clip(gl, box, 0, 0, w, h);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(p);
		gl.bindTexture(gl.TEXTURE_2D, from);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.disable(gl.SCISSOR_TEST);
	}

	private overlay(
		res: Res,
		time: number,
		box: Float32Array,
		x: number,
		y: number,
		w: number,
		h: number,
	) {
		const gl = this.gl;
		const tg = res.targets;
		if (!tg) return;
		clip(gl, box, x, y, w, h);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.overlay);
		gl.uniform1f(res.uOverlayTime, time);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, tg.scene.tex);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, res.noiseTex);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, tg.rings.tex);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tg.field.tex);
		gl.bindVertexArray(res.bgVao);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindVertexArray(null);
		gl.disable(gl.SCISSOR_TEST);
	}

	private makeTargets(res: Res): Targets {
		const gl = this.gl;
		const t: Targets = {
			scene: target(gl, SCENE_W, SCENE_H, gl.RGBA8, gl.NEAREST),
			mask: target(gl, MASK_W, MASK_H, gl.RGBA8, gl.NEAREST),
			field: target(gl, MASK_W, MASK_H, gl.RGBA8, gl.NEAREST),
			rows: target(gl, RING_W, MASK_H, gl.R8, gl.NEAREST),
			rings: target(gl, RING_W, RING_H, gl.RG8, gl.LINEAR),
		};
		res.targets = t;
		return t;
	}

	private labels(res: Res, x: number, y: number, w: number, h: number) {
		const gl = this.gl;
		if (res.labelsFor !== h) this.makeLabels(res, w, h);
		if (!res.mark && !res.caption) return;
		const margin = Math.round(h * 0.02);
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.wm);
		gl.uniform4f(res.uWmUv, 0, 0, 1, 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindVertexArray(res.bgVao);
		if (res.mark) {
			this.label(res, res.mark, x + w - res.mark.w - margin, y + margin, 0.55);
		}
		if (res.caption) this.label(res, res.caption, x + margin, y + margin, 0.92);
		gl.bindVertexArray(null);
		gl.viewport(x, y, w, h);
	}

	private makeLabels(res: Res, w: number, h: number) {
		const gl = this.gl;
		if (res.mark) gl.deleteTexture(res.mark.tex);
		if (res.caption) gl.deleteTexture(res.caption.tex);
		res.mark = null;
		res.caption = null;
		res.labelsFor = h;
		const mark = textCanvas(
			[{ text: WATERMARK, weight: 600, alpha: 1 }],
			Math.max(8, Math.round(h * 0.034)),
			w * 0.4,
		);
		if (mark) res.mark = labelTexture(gl, mark);
		const text = this.captionText;
		if (!text) return;
		const runs: TextRun[] = [{ text: text.title, weight: 600, alpha: 1 }];
		if (text.level) runs.push({ text: text.level, weight: 500, alpha: 0.78 });
		const cap = textCanvas(runs, Math.max(10, Math.round(h * 0.046)), w * 0.6);
		if (cap) res.caption = labelTexture(gl, cap);
	}

	private label(res: Res, label: Label, lx: number, ly: number, alpha: number) {
		const gl = this.gl;
		gl.viewport(lx, ly, label.w, label.h);
		gl.uniform1f(res.uWmAlpha, alpha);
		gl.bindTexture(gl.TEXTURE_2D, label.tex);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	private scene(
		res: Res,
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
		} else {
			if (box) {
				gl.enable(gl.SCISSOR_TEST);
				gl.scissor(box[0], box[1], box[2], box[3]);
			}
			gl.clearColor(0.06, 0.07, 0.09, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.disable(gl.SCISSOR_TEST);
		}
		this.notes(res, 0, count, w);
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

	private notes(res: Res, first: number, n: number, w: number) {
		if (n <= 0) return;
		const gl = this.gl;
		// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
		gl.useProgram(res.notes);
		gl.uniform2f(res.uScale, 1, ASPECT);
		gl.uniform1f(res.uPx, 2 / w);
		gl.uniform1f(res.uNote, this.noteScale);
		gl.bindVertexArray(res.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, res.inst);
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
		gl.bindVertexArray(null);
	}

	dispose() {
		this.canvas.removeEventListener("webglcontextlost", this.onLost);
		this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
		this.gl.getExtension("WEBGL_lose_context")?.loseContext();
		this.res = null;
	}
}
