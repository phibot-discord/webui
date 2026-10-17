import { join } from "node:path";
import { JACKET_TREES, type JacketTree } from "@/lib/assets";
import { avatarFile, parseAvatarFiles } from "@/lib/texts";
import { type IllTree, songIllPath } from "@/server/ill";
import { logger } from "@/server/logger";
import { illDir } from "@/server/paths";
import { ALL_LEVEL, LEVEL } from "./const";
import { bindBackground } from "./fcompute";
import { readJson, readText, readTsv } from "./files";

type Chart = {
	id: string;
	rank: string;
	charter: string;
	difficulty: number;
	tap?: number;
	drag?: number;
	hold?: number;
	flick?: number;
	combo?: number;
	maxTime?: number;
};

type SongInfo = {
	id: string;
	song: string;
	composer?: string;
	illustrator?: string;
	illustration?: string;
	chapter?: string;
	bpm?: string;
	length?: string;
	spinfo?: string;
	isOriginal?: boolean;
	can_t_be_letter?: boolean;
	can_t_be_guessill?: boolean;
	chart: Record<string, Chart>;
	sp_vis?: boolean;
};

type CsvRow = {
	id: string;
	song: string;
	composer: string;
	illustrator: string;
	EZ?: string;
	HD?: string;
	IN?: string;
	AT?: string;
	EZC?: string;
	HDC?: string;
	INC?: string;
	ATC?: string;
};

type Notes = Record<
	string,
	Partial<
		Record<
			(typeof LEVEL)[number],
			{ m: number; t: [number, number, number, number] }
		>
	>
>;

/** Catalog id form (`Song.Composer.0`); idempotent, unlike phi-plugin's helper */
export function withDotZero(id: string) {
	return id.endsWith(".0") ? id : `${id}.0`;
}

class GetInfo {
	allLevel = ALL_LEVEL;
	tips: string[] = [];
	ori_info: Record<string, SongInfo> = {};
	sp_info: Record<string, SongInfo> = {};
	songsid: Record<string, string> = {};
	idssong: Record<string, string> = {};
	illlist: string[] = [];
	idList: string[] = [];
	MAX_DIFFICULTY = 0;
	avatarid: string[] = [];
	/** Display name → file stem under `html/avatar/`, from the ripper's `avatars.json` */
	avatarFiles: ReadonlyMap<string, string> = new Map();
	/** Catalog id → the file stem its jackets have in the side tree; set from the manifests, not by `init` */
	private side: Record<JacketTree, Map<string, string>> = {
		fools: new Map(),
		removed: new Map(),
	};
	/** Catalog id → the levels with their own jacket (`original_ill/ill/<level>/<id>.png`) */
	private illLevels = new Map<string, ReadonlySet<string>>();
	private totals: [number, number, number, number] | undefined;
	resources = "";
	originalIll = "";

	async init(resources: string) {
		this.resources = resources;
		this.originalIll = illDir();
		const infoPath = join(resources, "info");

		this.tips = [];
		this.ori_info = {};
		this.sp_info = {};
		this.songsid = {};
		this.idssong = {};
		this.illlist = [];
		this.idList = [];
		this.MAX_DIFFICULTY = 0;
		this.totals = undefined;

		this.avatarid = readText(join(infoPath, "avatar.txt"))
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		this.avatarFiles =
			parseAvatarFiles(readJson<unknown>(join(infoPath, "avatars.json"), [])) ??
			new Map();
		this.tips = readText(join(infoPath, "tips.txt"))
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);

		const spJson = readJson<Record<string, Partial<SongInfo>>>(
			join(infoPath, "spinfo.json"),
			{},
		);
		for (const [raw, data] of Object.entries(spJson)) {
			const id = withDotZero(raw);
			const song: SongInfo = {
				...data,
				id,
				sp_vis: true,
				song: data.song || raw,
				chart: data.chart || {},
			};
			this.sp_info[id] = song;
			this.idssong[raw] = id;
			if (song.song) this.idssong[song.song] = id;
			if (song.illustration) this.illlist.push(id);
		}

		const notesInfo = readJson<Notes>(join(infoPath, "notesInfo.json"), {});

		const csvInfo = readTsv<CsvRow>(join(infoPath, "info.csv"));
		const jsonInfo = readJson<
			Record<string, Partial<SongInfo> & { chart?: Record<string, Chart> }>
		>(join(infoPath, "infolist.json"), {});

		for (const row of csvInfo) {
			const idWithout0 = row.id;
			const id = withDotZero(idWithout0);
			if (idWithout0 === "AnotherMe.DAAN") row.song = "Another Me (KALPA)";
			if (idWithout0 === "AnotherMe.NeutralMoon")
				row.song = "Another Me (Rising Sun Traxx)";
			this.songsid[id] = row.song;
			this.idssong[row.song] = id;
			this.ori_info[id] = {
				...(jsonInfo[idWithout0] || { chapter: "", bpm: "", length: "" }),
				id,
				song: row.song,
				composer: row.composer,
				illustrator: row.illustrator,
				chart: {},
			};
			for (const level of LEVEL) {
				if (!row[level]) continue;
				const notes = notesInfo[idWithout0]?.[level];
				const combo = notes
					? notes.t[0] + notes.t[1] + notes.t[2] + notes.t[3]
					: undefined;
				const chart: Chart = {
					id,
					rank: level,
					charter: row[`${level}C` as keyof CsvRow] || "",
					difficulty: Number(row[level]),
					tap: notes?.t[0],
					drag: notes?.t[1],
					hold: notes?.t[2],
					flick: notes?.t[3],
					combo,
					maxTime: notes?.m,
				};
				this.ori_info[id]!.chart![level] = chart;
				this.MAX_DIFFICULTY = Math.max(this.MAX_DIFFICULTY, chart.difficulty);
			}
			if (jsonInfo[idWithout0]?.chart) {
				this.ori_info[id]!.chart = {
					...this.ori_info[id]!.chart,
					...jsonInfo[idWithout0]!.chart,
				};
			}
			this.illlist.push(id);
			this.idList.push(id);
		}

		bindBackground((name) => this.getBackground(name) || "");
		logger.ok(
			`phi getInfo: ${this.idList.length} songs, max ${this.MAX_DIFFICULTY}`,
		);
	}

	/** Stored row without copying; callers must not mutate it */
	raw(id: string): SongInfo | undefined {
		return (
			this.ori_info[id] ||
			this.sp_info[id] ||
			this.ori_info[withDotZero(id)] ||
			this.sp_info[withDotZero(id)]
		);
	}

	/** Only charts with a real constant; fixed per catalog load */
	chartTotals(): [number, number, number, number] {
		if (this.totals) return this.totals;
		const tot: [number, number, number, number] = [0, 0, 0, 0];
		for (const info of Object.values(this.ori_info)) {
			if (!info.chart) continue;
			for (let i = 0; i < LEVEL.length; i++) {
				if (Number(info.chart[LEVEL[i]!]?.difficulty))
					tot[i] = (tot[i] ?? 0) + 1;
			}
		}
		this.totals = tot;
		return tot;
	}

	/** `[id, stem]`: a catalog id and its jacket stem in that tree; only jackets are routed, never song tables */
	setSide(tree: JacketTree, songs: Iterable<readonly [string, string]>) {
		this.side[tree] = new Map(
			[...songs].map(([id, stem]) => [withDotZero(id), stem]),
		);
	}

	setIllLevels(levels: ReadonlyMap<string, readonly string[]>) {
		this.illLevels = new Map(
			[...levels].map(([id, list]) => [withDotZero(id), new Set(list)]),
		);
	}

	/** A song in info.csv keeps its normal jacket, even when it is also a 4/1 special or in spinfo.json */
	private illTree(key: string): IllTree {
		if (this.ori_info[key]) return "normal";
		const side = JACKET_TREES.find((tree) => this.side[tree].has(key));
		if (side) return side;
		return this.sp_info[key] ? "sp" : "normal";
	}

	/** `id` with or without `.0`; a `level` gets that chart's jacket when the song has one per difficulty */
	getill(
		id: string,
		kind: "common" | "blur" | "low" = "common",
		level?: string,
	): string {
		const key = withDotZero(id);
		const tree = this.illTree(key);
		const own =
			level && tree === "normal" && this.illLevels.get(key)?.has(level)
				? level
				: undefined;
		const stem =
			tree === "normal" || tree === "sp"
				? key.replace(/\.0$/, "")
				: (this.side[tree].get(key) ?? key);
		return songIllPath(this.originalIll, stem, kind, tree, own);
	}

	idgetavatar(id: string) {
		if (!this.avatarid.includes(id)) return "Introduction";
		return avatarFile(id, this.avatarFiles);
	}

	idgetsong(id: string) {
		return this.songsid?.[id];
	}

	SongGetId(song: string) {
		return this.idssong?.[song];
	}

	getBackground(saveBackground: string) {
		if (!saveBackground) return "";
		let name = saveBackground;
		switch (name) {
			case "Another Me ":
				name = "Another Me (KALPA)";
				break;
			case "Another Me":
				name = "Another Me (Rising Sun Traxx)";
				break;
			case "Re_Nascence (Psystyle Ver.) ":
				name = "Re_Nascence (Psystyle Ver.)";
				break;
			case "Energy Synergy Matrix":
				name = "ENERGY SYNERGY MATRIX";
				break;
			case "Le temps perdu-":
				name = "Le temps perdu";
				break;
			default:
				break;
		}
		return this.getill(this.SongGetId(name) || name);
	}
}

const g = globalThis as typeof globalThis & { __phiGetInfo?: GetInfo };
if (!g.__phiGetInfo) g.__phiGetInfo = new GetInfo();
export const getInfo = g.__phiGetInfo;
