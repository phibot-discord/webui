import { EAR_HEAD_BYTES, earAnswerKey, earSeconds } from "@/lib/guess-ear";
import { oggCut } from "@/lib/ogg-cut";
import { evictOldest } from "@/phi/lib/lru";
import { answerFor } from "./guess";
import { logger } from "./logger";
import { publicObjectUrl } from "./r2";

const HEADS_MAX = 6;
const HEAD_TIMEOUT_MS = 15_000;
const heads = new Map<string, Promise<Uint8Array | undefined>>();

export type HeadFetch = (key: string) => Promise<Uint8Array | undefined>;

export async function readCapped(
	res: Response,
	max: number,
): Promise<Uint8Array> {
	const reader = res.body?.getReader();
	if (!reader) return new Uint8Array(0);
	const out = new Uint8Array(max);
	let size = 0;
	try {
		while (size < max) {
			const { done, value } = await reader.read();
			if (done) break;
			const take = Math.min(value.length, max - size);
			out.set(value.subarray(0, take), size);
			size += take;
		}
	} finally {
		void reader.cancel().catch(() => {});
	}
	return size === max ? out : out.slice(0, size);
}

async function fetchHead(key: string): Promise<Uint8Array | undefined> {
	const url = publicObjectUrl(key);
	if (!url) return undefined;
	const res = await fetch(url, {
		headers: { Range: `bytes=0-${EAR_HEAD_BYTES - 1}` },
		signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
	});
	if (!res.ok) {
		void res.body?.cancel().catch(() => {});
		return undefined;
	}
	const bytes = await readCapped(res, EAR_HEAD_BYTES);
	return bytes.length ? bytes : undefined;
}

function headOf(
	stem: string,
	load: HeadFetch,
): Promise<Uint8Array | undefined> {
	const hit = heads.get(stem);
	if (hit) {
		heads.delete(stem);
		heads.set(stem, hit);
		return hit;
	}
	const job = load(`music/${stem}.ogg`).catch((err: unknown) => {
		logger.warn(
			`ear clip head failed: ${err instanceof Error ? err.message : err}`,
		);
		return undefined;
	});
	heads.set(stem, job);
	evictOldest(heads, HEADS_MAX);
	void job.then((bytes) => {
		if (!bytes && heads.get(stem) === job) heads.delete(stem);
	});
	return job;
}

export function earAnswer(puzzle: string) {
	return answerFor(earAnswerKey(puzzle));
}

export async function clipOf(
	stem: string,
	step: number,
	load: HeadFetch = fetchHead,
): Promise<Uint8Array | undefined> {
	const head = await headOf(stem, load);
	if (!head) return undefined;
	const cut = oggCut(head, earSeconds(step));
	return cut ? head.subarray(0, cut.end) : undefined;
}

export async function earClip(
	puzzle: string,
	step: number,
): Promise<Uint8Array | undefined> {
	const answer = await earAnswer(puzzle);
	return answer ? clipOf(answer.stem, step) : undefined;
}

export function resetEarForTest() {
	heads.clear();
}
