// Offline render of one card kind + layout from data/raw-save.json → JPEG
// No Discord, KV or R2: jackets / avatars / icons come from a local phi-assets copy
// (default ../discord-bot/phi-assets), the catalog from the bundled phi-assets/info
//
//   node --import tsx scripts/render-card-local.ts <b30|x30|fc30|hisb30|info|song> [out.jpg]
//
// Env: STYLE=classic|table|portrait|timeline|summary  COUNT=33..99  LOCALE=en|zh
//      QUALITY=fast|high  BG=<illustration id>  TIPS="…"  HIDE_STATS=1
//      SAVE=data/raw-save.json  PHI_LOCAL_ASSETS=<dir with original_ill/ and html/>
//      HTML_OUT=/tmp/card.html (also dump the final HTML Takumi parses)
//      EMPTY_HISTORY=1 (hisb30 / info with no history: the empty state)
//      DUMP_DATA=/tmp/data.json (also write the template data)
//      song: CHART=<song id> LEVEL=EZ|HD|IN|AT  BUDGET=<ms, default 8000>
//            OFFLINE=1 (no phib19 lookups: the "turned off" state)
//      AVG=rank|top|all|b30 (b30/x30/fc30: peer badges, looked up before the render)
//      LB_KV=/tmp/phi-lb-kv.json (keep the in-memory KV in a file between runs, so
//            phib19 answers are reused). phib19 lookups go to PHI_CHART_TAG_API, e.g.
//            PHI_CHART_TAG_API=https://phib19.top:8080
// Run `node scripts/precompile-art.mjs && node scripts/bundle-css.mjs` after editing
// templates or CSS: the renderer reads the generated art-compiled.ts / bundle.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const KIND = process.argv[2] || "b30";
const STYLE = process.env.STYLE || "classic";
const OUT = process.argv[3] || `/tmp/phi-${KIND}-${STYLE}.jpg`;
const LOCAL = resolve(
	process.env.PHI_LOCAL_ASSETS ||
		join(process.cwd(), "../discord-bot/phi-assets"),
);
process.env.PHI_ILL ??= join(LOCAL, "original_ill");

const { createKv } = await import("../src/server/kv");
const { RenderEngine } = await import("../src/server/render/engine");
const { loadFontsFromDir } = await import("../src/server/render/fonts");
const { compileArt } = await import("../src/server/render/html");
const { hydrateCss, mountBytes } = await import("../src/server/vfs");
const { PHI_CSS } = await import("../src/phi/css/bundle");
const { setupPhi } = await import("../src/phi/setup");
const { loadWebConfig } = await import("../src/server/config");
const { assetsDir } = await import("../src/server/paths");
const { cardStyleTemplate, parseCardStyle } = await import(
	"../src/phi/lib/card-styles"
);

const LB_KV = process.env.LB_KV;
const mem = new Map<string, string>(
	LB_KV && existsSync(LB_KV) ? JSON.parse(readFileSync(LB_KV, "utf8")) : [],
);
const { store, db } = createKv({
	label: "mem",
	getRaw: async (k: string) => mem.get(k),
	putRaw: async (k: string, v: string) => {
		mem.set(k, v);
	},
	delRaw: async (k: string) => {
		mem.delete(k);
	},
	listRaw: async (p: string) => [...mem.keys()].filter((k) => k.startsWith(p)),
	ping: async () => {},
} as never);

const resources = assetsDir();
const res = resources.replace(/\\/g, "/");
// avatar/ and otherimg/ are gitignored in webui; mount the local copies
for (const dir of ["avatar", "otherimg"]) {
	const src = join(LOCAL, "html", dir);
	if (!existsSync(src)) continue;
	for (const f of readdirSync(src))
		mountBytes(join(resources, "html", dir, f), readFileSync(join(src, f)));
}

// Same wiring as host.ts bootRender, on the in-memory KV
hydrateCss(PHI_CSS);
const engine = new RenderEngine();
const templates = new Map<string, any>();
const services = new Map<string, unknown>([["kv", store]]);
const helpers = {
	resources,
	compileArt: (page: string, data: Record<string, unknown>) =>
		compileArt(
			join(resources, "html", page.endsWith(".art") ? page : `${page}.art`),
			{
				...data,
				defaultLayout: `${res}/html/common/layout/default.art`,
				_layout_path: `${res}/html/common/layout/`,
				_res_path: `${res}/`,
				pluResPath: `${res}/`,
				_imgPath: data._imgPath ?? `${res}/html/otherimg/`,
			},
		),
};
const app = {
	config: loadWebConfig(),
	db,
	template: (def: { id: string }) => void templates.set(def.id, def),
	service: (n: string, v: unknown) => void services.set(n, v),
	getService: (n: string) => {
		if (!services.has(n)) throw new Error(`unknown service ${n}`);
		return services.get(n);
	},
	fonts: {
		fromDir: async (dir: string, map: never) => {
			for (const f of await loadFontsFromDir(dir, map)) engine.registerFont(f);
		},
	},
};
await setupPhi(app as never);
const rt = app.getService("phi.runtime") as never;
const catalog = app.getService("phi.catalog") as never;

const { Save } = await import("../src/phi/lib/save");
const { getNotes } = await import("../src/phi/lib/notes");
const { b19Card } = await import("../src/phi/lib/cards");
const { buildUpdateCard } = await import("../src/phi/lib/history");
const { SaveHistory } = await import("../src/phi/lib/save-history");

const locale = process.env.LOCALE === "zh" ? "zh" : "en";
const style = parseCardStyle(KIND, STYLE);
// Fresh Save per render: getB19 / getBestWithLimit mutate rows
const save = new Save(
	JSON.parse(readFileSync(process.env.SAVE || "data/raw-save.json", "utf8")),
);
const notes = {
	...(await getNotes(db, "local")),
	allowApiUsage: false, // no phib19 peer-average calls
	showTagAnalysis: false, // no chart-tag API calls
	locale,
	cardBackground: process.env.BG || undefined,
};

let id: string;
let data: Record<string, unknown>;
if (KIND === "info") {
	// Seed 12 weeks of RKS + data history (and two B30 snapshots) so the charts
	// have something to draw; EMPTY_HISTORY=1 leaves them empty
	const { infoCard } = await import("../src/phi/lib/cards");
	const empty = process.env.EMPTY_HISTORY === "1";
	const token = "localinfotoken00000000000";
	if (!empty) {
		const now = Date.parse(save.saveInfo.modifiedAt.iso);
		const week = 7 * 86_400_000;
		const rksNow = save.saveInfo.summary.rankingScore;
		const money = save.gameProgress?.money || [0, 0, 0, 0, 0];
		await db.set(
			`phi:history:${token}`,
			JSON.stringify({
				version: 3,
				scoreHistory: {},
				rks: Array.from({ length: 12 }, (_, i) => ({
					date: new Date(now - (11 - i) * week).toISOString(),
					value: rksNow - (11 - i) * 0.035 + (i % 3) * 0.004,
				})),
				data: Array.from({ length: 12 }, (_, i) => ({
					date: new Date(now - (11 - i) * week).toISOString(),
					value: [
						money[0],
						Math.max(0, money[1] - (11 - i) * 37),
						money[2],
						money[3],
						money[4],
					],
				})),
				challengeModeRank: [],
			}),
		);
	}
	data = await infoCard(rt, save, db, "local", catalog, {
		locale,
		notes: notes as never,
		token: empty ? "" : token,
	});
	id = cardStyleTemplate(KIND, style) ?? "phi/userinfo/userinfo";
} else if (KIND === "song") {
	const { buildSongCard } = await import("../src/phi/lib/song-card");
	const { parseSongLevel } = await import("../src/server/card-kinds");
	const built = await buildSongCard(
		rt,
		save,
		db,
		catalog,
		{
			chart: process.env.CHART || "Rrharil.TeamGrimoire",
			level: parseSongLevel(process.env.LEVEL),
			locale,
			notes: { ...notes, allowApiUsage: process.env.OFFLINE !== "1" },
		},
		{ budgetMs: Number(process.env.BUDGET) || undefined },
	);
	if ("error" in built) throw new Error(`song card: ${built.error}`);
	id = built.templateId;
	data = { ...built.data, theme: notes.theme || "default", locale };
	const sc = built.data.songCard as { state: unknown };
	console.log("song card state", sc.state, "partial", built.data.renderPartial);
} else if (KIND === "hisb30") {
	// raw-save has no score history: synthesize two entries per chart over 12 days
	const now = Date.parse(save.saveInfo.modifiedAt.iso);
	const day = 86_400_000;
	const scoreHistory: Record<string, Record<string, unknown>> = {};
	let n = 0;
	const empty = process.env.EMPTY_HISTORY === "1";
	for (const [sid, rows] of empty
		? []
		: (Object.entries(save.gameRecord) as [string, any[]][])) {
		rows.forEach((rec, lv) => {
			if (!rec || lv > 3) return;
			const level = ["EZ", "HD", "IN", "AT"][lv]!;
			const d = new Date(now - ((n++ * 7919) % 12) * day);
			const prev = [
				Math.max(0, rec.acc - 0.8).toFixed(4),
				Math.max(0, rec.score - 9000),
				new Date(d.getTime() - 20 * day).toISOString(),
				false,
			];
			scoreHistory[sid] ??= {};
			scoreHistory[sid][level] = [
				prev,
				[rec.acc.toFixed(4), rec.score, d.toISOString(), rec.fc],
			];
		});
	}
	const rksNow = save.saveInfo.summary.rankingScore;
	const history = new SaveHistory({
		version: 3,
		scoreHistory,
		rks: Array.from({ length: empty ? 0 : 12 }, (_, i) => ({
			date: new Date(now - (11 - i) * 3 * day).toISOString(),
			value: rksNow - (11 - i) * 0.02,
		})),
		data: [],
		challengeModeRank: [],
	} as never);
	// B30 snapshots like snapshotB30 writes: the current B30, and a previous one in
	// which the 3 lowest B27 charts were 3 others (so "entered / left B30" has data)
	const b30 = await new Save(
		JSON.parse(readFileSync(process.env.SAVE || "data/raw-save.json", "utf8")),
	).getB19(undefined, 33, { avgType: "none" } as never);
	const pick = (x: { id: string; rank: string } | undefined) =>
		x ? [{ id: x.id, rank: x.rank }] : [];
	const phi = (b30.phi || []).flatMap(pick);
	const b27 = (b30.b19_list || []).slice(0, 27).flatMap(pick);
	const older = [
		...b27.slice(0, 24),
		...(b30.b19_list || []).slice(27, 30).flatMap(pick),
	];
	const snaps = empty
		? []
		: [
				{ t: now - day, rks: rksNow - 0.0123, phi, b27: older },
				{ t: now, rks: rksNow, phi, b27 },
			];
	id = cardStyleTemplate(KIND, style) ?? "phi/update/update";
	data = {
		...(await buildUpdateCard(
			rt,
			save,
			catalog,
			history,
			notes,
			snaps as never,
			{
				locale,
			},
		)),
		theme: notes.theme || "default",
		locale,
		hisb30Snaps: snaps,
	};
} else {
	const avg = process.env.AVG;
	if (avg) {
		// Look the badges up first with a long budget, so the card's own 2.5 s wait
		// is answered from memory (and LB_KV keeps them for the next run)
		const { attachB19AccAvg } = await import("../src/phi/lib/score-avg");
		const warm = await new Save(
			JSON.parse(
				readFileSync(process.env.SAVE || "data/raw-save.json", "utf8"),
			),
		).getB19(undefined, Number(process.env.COUNT || 33), {
			avgType: "none",
		} as never);
		console.log(
			"avg warm-up",
			await attachB19AccAvg(warm as never, {
				avgType: avg,
				db,
				budgetMs: 60_000,
			}),
		);
		Object.assign(notes, { allowApiUsage: true, b30AvgKind: avg });
	}
	id = cardStyleTemplate(KIND, style) ?? "phi/b19/b19";
	data = {
		...(await b19Card(rt, save, db, "local", catalog, {
			nnum: Number(process.env.COUNT || 33),
			mode: KIND as "b30" | "x30" | "fc30",
			locale,
			showTagAnalysis: false,
			notes,
		})),
		hideRecordStats: process.env.HIDE_STATS === "1",
	};
}
data.cardKind = KIND;
data.cardStyle = style;
if (process.env.TIPS) data.tips = process.env.TIPS;

const def = templates.get(id);
if (!def)
	throw new Error(
		`template ${id} not registered (have: ${[...templates.keys()].join(", ")})`,
	);
if (process.env.DUMP_DATA) {
	writeFileSync(process.env.DUMP_DATA, JSON.stringify(data, null, 1));
}
if (process.env.HTML_OUT) {
	writeFileSync(process.env.HTML_OUT, await def.html(data, helpers));
}
const img = await engine.renderTemplate(def, data, helpers, {
	paintQuality: process.env.QUALITY === "high" ? "high" : "fast",
});
writeFileSync(OUT, img.bytes);
console.log(
	`wrote ${OUT} ${img.width}x${img.height} css px, ${img.bytes.length} B`,
	img.timings,
);
if (LB_KV) {
	await new Promise((r) => setTimeout(r, 300)); // background KV writes
	writeFileSync(LB_KV, JSON.stringify([...mem]));
}
process.exit(0); // undici agents / timers keep the loop alive otherwise
