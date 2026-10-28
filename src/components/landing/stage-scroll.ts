import b30Sheet from "@/drawings/b30.json";
import chartSheet from "@/drawings/chart.json";
import b30Model from "@/lib/drawings/models/b30.mjs";
import chartModel from "@/lib/drawings/models/chart.mjs";
import { sheet } from "@/lib/drawings/sheet.mjs";

type Name = "b30" | "chart";
type Camera = { azimuth: number; elevation: number };
type Pose = Camera & { name: Name; amount: number; tags: number };
type Rect = { x: number; y: number; w: number; h: number };
type Box = number[];
type Point = [number, number];
type Frame = {
	box: Box;
	bare: Box;
	tags: { id: string; at: Point }[];
	scale: number;
	place: (v: number[]) => Point;
	width: number;
};
type Mapping = { scale: number; x: number; y: number };
type Shot = { pose: Pose; map: Mapping; alpha: number };
type Drawn = { key: string; svg: string; frame: Frame };
type Spec = { gap?: number; order?: string };
type Model = {
	view: Camera;
	views: ({ name: string } & Spec)[];
	build: () => unknown;
};
type SheetJson = {
	parts: string[];
	views: Record<string, { tags: { id: string; n: number }[] }>;
};

type Scene = {
	name: Name;
	drawn: unknown;
	pivot: number[];
	iso: Camera;
	spec: Spec;
	parts: Set<string>;
	numbers: Map<string, number>;
};

type Layer = {
	scene: Scene;
	root: HTMLDivElement;
	ink: HTMLDivElement;
	svg: SVGSVGElement;
	tags: Map<string, HTMLSpanElement>;
	key: string;
	style: string;
};

const SLOTS = ["hero", "break", "explore", "closing"] as const;
type Slot = (typeof SLOTS)[number];
const PATH: Slot[] = [
	"hero",
	"break",
	"break",
	"explore",
	"explore",
	"closing",
	"closing",
];

const FRONT: Camera = { azimuth: -90, elevation: 90 };
const RIDE = 0.12;
const LOW = 14;
const TURN = 180;
const SETTLE = 0.4;
const KEEP = 160;
const BAR = 150;
const SVG = "http://www.w3.org/2000/svg";

const clamp = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const span = (t: number, from: number, to: number) =>
	clamp((t - from) / (to - from));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
	x: lerp(a.x, b.x, t),
	y: lerp(a.y, b.y, t),
	w: lerp(a.w, b.w, t),
	h: lerp(a.h, b.h, t),
});
const lerpBox = (a: Box, b: Box, t: number): Box =>
	a.map((v, i) => lerp(v, b[i] ?? v, t));
const scrolled = (r: Rect, s: number): Rect => ({ ...r, y: r.y - s });

function pivotOf(drawn: unknown): number[] {
	const base = (drawn as { parts: { solids: { points: number[][] }[] }[] })
		.parts[0];
	const points = base?.solids.flatMap((s) => s.points) ?? [];
	const xs = points.map((p) => p[0] ?? 0),
		ys = points.map((p) => p[1] ?? 0),
		zs = points.map((p) => p[2] ?? 0);
	return [
		(Math.min(...xs) + Math.max(...xs)) / 2,
		(Math.min(...ys) + Math.max(...ys)) / 2,
		Math.min(...zs),
	];
}

function scene(name: Name, model: Model, json: SheetJson): Scene {
	const spec = model.views.find((v) => v.name === "exploded");
	const drawn = model.build();
	return {
		name,
		drawn,
		pivot: pivotOf(drawn),
		iso: model.view,
		spec: { gap: spec?.gap, order: spec?.order },
		parts: new Set(json.parts),
		numbers: new Map(json.views.exploded?.tags.map((t) => [t.id, t.n])),
	};
}

const blend = (a: Mapping, b: Mapping, t: number): Mapping => ({
	scale: a.scale * (b.scale / a.scale) ** t,
	x: lerp(a.x, b.x, t),
	y: lerp(a.y, b.y, t),
});

const pose = (s: Scene, amount: number, tags: number, cam = s.iso): Pose => ({
	name: s.name,
	azimuth: cam.azimuth,
	elevation: cam.elevation,
	amount,
	tags,
});

export function mountStage(stage: HTMLElement, landing: HTMLElement) {
	const b30 = scene("b30", b30Model as Model, b30Sheet as SheetJson);
	const chart = scene("chart", chartModel as Model, chartSheet as SheetJson);
	const cache = new Map<string, Drawn>();
	const figs = [...landing.querySelectorAll<HTMLElement>("[data-stage-slot]")];
	const legend = [
		...landing.querySelectorAll<HTMLElement>(
			'[data-stage-slot="break"] :is(.fig-title, .fig-parts li)',
		),
	];
	let hovered: string | null = null;
	let open = -1;

	function draw(s: Scene, p: Pose): Drawn {
		const azimuth = Math.round(p.azimuth * 10) / 10;
		const elevation = Math.round(p.elevation * 10) / 10;
		const amount = Math.round(p.amount * 500) / 500;
		const key = `${s.name}|${azimuth}|${elevation}|${amount}`;
		const hit = cache.get(key);
		if (hit) {
			cache.delete(key);
			cache.set(key, hit);
			return hit;
		}
		const out = sheet(
			s.drawn,
			{ amount, tags: true, gap: s.spec.gap, order: s.spec.order },
			{ azimuth, elevation },
		) as unknown as { svg: string; frame: Frame };
		const made = { key, svg: out.svg, frame: out.frame };
		cache.set(key, made);
		if (cache.size > KEEP) cache.delete(cache.keys().next().value as string);
		return made;
	}

	function layer(s: Scene): Layer {
		const root = document.createElement("div");
		root.className = "fig stage-layer";
		root.hidden = true;
		const ink = document.createElement("div");
		ink.className = "drawing";
		ink.dataset.drawing = s.name;
		const svg = document.createElementNS(SVG, "svg");
		svg.setAttribute("focusable", "false");
		ink.append(svg);
		const tags = new Map<string, HTMLSpanElement>();
		for (const [id, n] of s.numbers) {
			const tag = document.createElement("span");
			tag.className = "drawing-tag";
			tag.dataset.part = id;
			tag.textContent = String(n);
			ink.append(tag);
			tags.set(id, tag);
		}
		root.append(ink);
		stage.append(root);
		return { scene: s, root, ink, svg, tags, key: "", style: "" };
	}

	const layers = [layer(b30), layer(chart)];

	function mark(l: Layer) {
		const id = hovered && l.scene.parts.has(hovered) ? hovered : null;
		l.root.toggleAttribute("data-active", id !== null);
		for (const node of l.root.querySelectorAll("[data-part]"))
			node.toggleAttribute("data-on", node.getAttribute("data-part") === id);
	}

	function fit(s: Scene, p: Pose, rect: Rect): Mapping {
		const { frame } = draw(s, p);
		const [vx = 0, vy = 0, vw = 1, vh = 1] = lerpBox(
			frame.bare,
			frame.box,
			p.tags,
		);
		const per = Math.min(rect.w / vw, rect.h / vh);
		const [px, py] = frame.place(s.pivot);
		return {
			scale: per * frame.scale,
			x: rect.x + (rect.w - vw * per) / 2 + (px - vx) * per,
			y: rect.y + (rect.h - vh * per) / 2 + (py - vy) * per,
		};
	}

	const widthAt = (s: Scene, cam: Camera) =>
		draw(s, pose(s, 0, 0, cam)).frame.width;

	function flip(from: Scene, to: Scene, u: number, rect: Rect): Shot[] {
		const a = fit(from, pose(from, 1, 1), rect);
		const b = fit(to, pose(to, 1, 1), rect);
		if (u <= 0) return [{ pose: pose(from, 1, 1), map: a, alpha: 1 }];
		if (u >= 1) return [{ pose: pose(to, 1, 1), map: b, alpha: 1 }];
		const e = ease(u);
		const dip = Math.sin(Math.PI * e);
		const elevation = lerp(
			lerp(from.iso.elevation, to.iso.elevation, e),
			LOW,
			dip,
		);
		const turn = TURN * e;
		const wa = widthAt(from, {
			azimuth: from.iso.azimuth + TURN / 2,
			elevation: LOW,
		});
		const wb = widthAt(to, {
			azimuth: to.iso.azimuth - TURN / 2,
			elevation: LOW,
		});
		const bar = Math.sqrt(a.scale * wa * b.scale * wb);
		const x = rect.x + rect.w / 2,
			y = rect.y + rect.h / 2;
		const fade = smooth(span(u, 0.36, 0.64));
		const shots: Shot[] = [];
		if (fade < 1)
			shots.push({
				pose: pose(from, 1 - ease(span(u, 0, 0.5)), 1 - span(u, 0, 0.15), {
					azimuth: from.iso.azimuth + turn,
					elevation,
				}),
				map: blend(a, { scale: bar / wa, x, y }, dip),
				alpha: 1 - fade,
			});
		if (fade > 0)
			shots.push({
				pose: pose(to, ease(span(u, 0.5, 1)), span(u, 0.85, 1), {
					azimuth: to.iso.azimuth + turn - TURN,
					elevation,
				}),
				map: blend(b, { scale: bar / wb, x, y }, dip),
				alpha: fade,
			});
		return shots;
	}

	function paint(l: Layer, p: Pose, m: Mapping) {
		const d = draw(l.scene, p);
		if (l.key !== d.key) {
			l.svg.innerHTML = d.svg;
			l.key = d.key;
			if (hovered) mark(l);
		}
		const vb = lerpBox(d.frame.bare, d.frame.box, p.tags);
		const [vx = 0, vy = 0, vw = 1, vh = 1] = vb;
		const per = m.scale / d.frame.scale;
		const [px, py] = d.frame.place(l.scene.pivot);
		const x = m.x - (px - vx) * per,
			y = m.y - (py - vy) * per;
		const w = vw * per,
			h = vh * per;
		const style = `${d.key}|${vb.map((v) => v.toFixed(2)).join(" ")}|${w.toFixed(1)}|${h.toFixed(1)}|${p.tags}`;
		l.root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
		if (style === l.style) return;
		l.style = style;
		l.svg.setAttribute("viewBox", vb.map((v) => v.toFixed(2)).join(" "));
		l.ink.style.width = `${w.toFixed(1)}px`;
		l.ink.style.height = `${h.toFixed(1)}px`;
		l.root.style.setProperty("--tags", p.tags.toFixed(3));
		for (const t of d.frame.tags) {
			const tag = l.tags.get(t.id);
			if (!tag) continue;
			tag.style.left = `${(((t.at[0] - vx) / vw) * 100).toFixed(2)}%`;
			tag.style.top = `${(((t.at[1] - vy) / vh) * 100).toFixed(2)}%`;
		}
	}

	type Geo = {
		keys: number[];
		rects: Rect[];
		closing: Rect;
	};
	let geo: Geo | undefined;

	let view = { w: window.innerWidth, h: window.innerHeight };

	function measure() {
		const vh = view.h;
		const top = window.scrollY;
		const slots = {} as Record<Slot, Rect>;
		for (const slot of SLOTS) {
			const el = landing.querySelector(`[data-stage-slot="${slot}"] .drawing`);
			if (!el) {
				geo = undefined;
				return;
			}
			const r = el.getBoundingClientRect();
			slots[slot] = { x: r.left, y: r.top + top, w: r.width, h: r.height };
		}
		const max = Math.max(1, document.documentElement.scrollHeight - vh);
		const mid = (r: Rect, f: number) => r.y + r.h / 2 - f * vh;
		const keys = [
			0,
			mid(slots.break, 0.5 + RIDE),
			mid(slots.break, 0.5 - RIDE),
			mid(slots.explore, 0.5 + RIDE),
			mid(slots.explore, 0.5 - RIDE),
			mid(slots.closing, 0.5 + RIDE),
			mid(slots.closing, 0.5 - RIDE),
		];
		for (let i = 1; i < keys.length; i++)
			keys[i] = Math.max(keys[i] as number, (keys[i - 1] as number) + 1);
		keys[6] = Math.min(keys[6] as number, max);
		keys[5] = Math.min(keys[5] as number, (keys[6] as number) - SETTLE * vh);
		for (let i = 5; i > 0; i--)
			keys[i] = Math.min(keys[i] as number, (keys[i + 1] as number) - 1);
		const rects = keys.map((s, i) => scrolled(slots[PATH[i] as Slot], s));
		rects[5] = rects[6] as Rect;
		geo = { keys, rects, closing: slots.closing };
	}

	function at(s: number): { shots: Shot[]; open: number } {
		const g = geo as Geo;
		const k = g.keys as [
			number,
			number,
			number,
			number,
			number,
			number,
			number,
		];
		const r = g.rects as [Rect, Rect, Rect, Rect, Rect, Rect, Rect];
		const t = (i: number) => {
			const from = g.keys[i] ?? 0;
			return clamp((s - from) / ((g.keys[i + 1] ?? from + 1) - from));
		};
		const one = (p: Pose, map: Mapping) => [{ pose: p, map, alpha: 1 }];
		const open = pose(b30, 1, 1);
		const shut = pose(b30, 0, 0);
		if (s < k[1]) {
			const u = t(0);
			const c = ease(span(u, 0, 0.65));
			const e = ease(span(u, 0.1, 1));
			const rect = lerpRect(r[0], r[1], e);
			return {
				shots: one(
					pose(b30, ease(span(u, 0.3, 1)), span(u, 0.8, 1), {
						azimuth: lerp(FRONT.azimuth, b30.iso.azimuth, c),
						elevation: lerp(FRONT.elevation, b30.iso.elevation, c),
					}),
					blend(
						fit(b30, pose(b30, 0, 0, FRONT), rect),
						fit(b30, open, rect),
						e,
					),
				),
				open: span(u, 0.55, 1),
			};
		}
		if (s < k[2])
			return {
				shots: one(open, fit(b30, open, lerpRect(r[1], r[2], t(1)))),
				open: 1,
			};
		if (s < k[3]) {
			const u = t(2);
			return {
				shots: flip(
					b30,
					chart,
					span(u, 0.45, 1),
					lerpRect(r[2], r[3], ease(u)),
				),
				open: 1,
			};
		}
		if (s < k[4]) {
			const p = pose(chart, 1, 1);
			return {
				shots: one(p, fit(chart, p, lerpRect(r[3], r[4], t(3)))),
				open: 1,
			};
		}
		if (s < k[5]) {
			const u = t(4);
			return {
				shots: flip(
					chart,
					b30,
					span(u, 0, 0.55),
					lerpRect(r[4], r[5], ease(u)),
				),
				open: 1,
			};
		}
		if (s < k[6]) {
			const u = t(5);
			const e = ease(u);
			const rect = lerpRect(r[5], r[6], u);
			return {
				shots: one(
					pose(b30, 1 - e, 1 - span(u, 0, 0.35)),
					blend(fit(b30, open, rect), fit(b30, shut, rect), e),
				),
				open: 1,
			};
		}
		return {
			shots: one(shut, fit(b30, shut, scrolled(g.closing, s))),
			open: 1,
		};
	}

	function unfold(value: number) {
		if (value === open) return;
		open = value;
		legend.forEach((item, i) => {
			item.style.setProperty("--o", clamp((value - i * 0.1) / 0.5).toFixed(3));
		});
	}

	let frame = 0;
	function update() {
		frame = 0;
		if (!geo) return;
		const s = Math.max(window.scrollY, 0);
		const now = at(s);
		for (const l of layers) {
			const shot = now.shots.find((x) => x.pose.name === l.scene.name);
			if (l.root.hidden === !!shot) l.root.hidden = !shot;
			if (!shot) continue;
			paint(l, shot.pose, shot.map);
			const alpha = shot.alpha.toFixed(3);
			if (l.root.style.opacity !== alpha) l.root.style.opacity = alpha;
		}
		unfold(now.open);
	}
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	let live = false;
	const go = () => {
		if (live) return;
		live = true;
		landing.setAttribute("data-stage", "");
	};
	const onScroll = () => {
		go();
		schedule();
	};
	const onLayout = () => {
		measure();
		schedule();
	};
	const onResize = () => {
		const w = window.innerWidth,
			h = window.innerHeight;
		if (w === view.w && Math.abs(h - view.h) < BAR) return;
		view = { w, h };
		onLayout();
	};

	const watch = new MutationObserver(() => {
		const on = landing.querySelector("[data-stage-slot] [data-part][data-on]");
		const id = on?.getAttribute("data-part") ?? null;
		if (id === hovered) return;
		hovered = id;
		for (const l of layers) mark(l);
	});
	for (const fig of figs)
		watch.observe(fig, {
			attributes: true,
			attributeFilter: ["data-on"],
			subtree: true,
		});

	const sizes = new ResizeObserver(onLayout);
	sizes.observe(landing);
	window.addEventListener("resize", onResize);
	window.addEventListener("scroll", onScroll, { passive: true });
	measure();
	update();

	const intro = landing.querySelector('[data-stage-slot="hero"]');
	if (window.scrollY > 0 || !intro) go();
	else
		Promise.allSettled(
			intro.getAnimations({ subtree: true }).map((a) => a.finished),
		).then(go);

	return () => {
		live = true;
		if (frame) cancelAnimationFrame(frame);
		watch.disconnect();
		sizes.disconnect();
		window.removeEventListener("resize", onResize);
		window.removeEventListener("scroll", onScroll);
		landing.removeAttribute("data-stage");
		for (const item of legend) item.style.removeProperty("--o");
		stage.replaceChildren();
	};
}
