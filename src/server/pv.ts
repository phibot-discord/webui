import {
	EMPTY_OVERLAYS,
	mergeSpecials,
	PV_MANIFEST_KEY,
	PV_OVERLAY_KEY,
	PV_SPECIALS_KEY,
	type PvClip,
	type PvSpecial,
	parseOverlayIndex,
	parsePvManifest,
	parsePvSpecials,
	withSpecialOverlays,
} from "@/lib/pv";
import { publicFiles } from "./assets";
import { runInBackground } from "./background";
import { cfFetch } from "./cf-fetch";
import { logger } from "./logger";
import { jsonLoader } from "./manifest";
import { poolAll } from "./pool";
import { publicObjectUrl, r2WriteReady } from "./r2";
import { withTimeout } from "./render-lock";

const clips = jsonLoader(PV_MANIFEST_KEY, parsePvManifest, [] as PvClip[]);

const specials = jsonLoader(
	PV_SPECIALS_KEY,
	parsePvSpecials,
	[] as PvSpecial[],
);

const overlays = jsonLoader(PV_OVERLAY_KEY, parseOverlayIndex, EMPTY_OVERLAYS);

export async function loadPv() {
	const [list, extra] = await Promise.all([clips.load(), specials.load()]);
	return mergeSpecials(list, extra);
}

export async function loadOverlays() {
	const [index, extra] = await Promise.all([overlays.load(), specials.load()]);
	return withSpecialOverlays(index, extra);
}

const CHECK_TTL_MS = 5 * 60 * 1000;
const CHECK_PARALLEL = 24;
const HEAD_TIMEOUT_MS = 3000;
const FIRST_WAIT_MS = 4000;
const NONE: ReadonlySet<string> = new Set();

// only a 404 or 410 means the file is gone; a timeout or a 5xx says nothing
export function isGone(status: number): boolean {
	return status === 404 || status === 410;
}

let checked:
	| { key: string; missing: ReadonlySet<string>; until: number }
	| undefined;
let checking: Promise<ReadonlySet<string>> | undefined;

async function probe(list: readonly PvClip[]): Promise<ReadonlySet<string>> {
	const missing = new Set<string>();
	await poolAll([...list], CHECK_PARALLEL, async (clip) => {
		const url = publicObjectUrl(clip.file);
		if (!url) return;
		try {
			const res = await cfFetch(url, {
				method: "HEAD",
				timeoutMs: HEAD_TIMEOUT_MS,
			});
			if (isGone(res.status)) missing.add(clip.id);
		} catch (err) {
			logger.warn(
				`pv ${clip.id} not checked: ${err instanceof Error ? err.message : err}`,
			);
		}
	});
	return missing;
}

function recheck(list: readonly PvClip[], key: string) {
	checking ??= probe(list)
		.then((missing) => {
			checked = { key, missing, until: Date.now() + CHECK_TTL_MS };
			return missing;
		})
		.finally(() => {
			checking = undefined;
		});
	return checking;
}

/** With the API, the bucket listing says which clips exist; without it, HEAD requests on the public domain */
export async function missingClips(
	list: readonly PvClip[],
	waitMs = FIRST_WAIT_MS,
): Promise<ReadonlySet<string>> {
	if (r2WriteReady()) {
		const files = await withTimeout(publicFiles(), waitMs, "pv listing").catch(
			() => undefined,
		);
		if (!files) return NONE;
		return new Set(list.filter((c) => !files.has(c.file)).map((c) => c.id));
	}
	const key = list.map((c) => c.file).join("\n");
	if (checked?.key === key) {
		if (Date.now() >= checked.until && !checking) {
			runInBackground(recheck(list, key));
		}
		return checked.missing;
	}
	return withTimeout(recheck(list, key), waitMs, "pv check").catch(() => NONE);
}

export function resetPvForTest() {
	clips.reset();
	specials.reset();
	overlays.reset();
	checked = undefined;
	checking = undefined;
}
