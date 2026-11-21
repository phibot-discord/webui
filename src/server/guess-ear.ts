import { dailyId, dayKey, puzzleKind } from "@/lib/guess";
import { EAR_HEAD_BYTES, earAnswerKey, earSeconds } from "@/lib/guess-ear";
import { oggCut, oggReserial, oggSerial } from "@/lib/ogg-cut";
import { evictOldest } from "@/phi/lib/lru";
import {
	answerFor,
	clueToken,
	clueTokenOk,
	guessPool,
	pickAnswer,
	seedBytes,
} from "./guess";
import { logger } from "./logger";
import { publicObjectUrl } from "./r2";

const HEADS_MAX = 6;
const HEAD_TIMEOUT_MS = 15_000;
const PROBE_SECONDS = 0.5;
const heads = new Map<string, Promise<Uint8Array | undefined>>();
let headLoad: HeadFetch | undefined;

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

async function headClip(
	stem: string,
	seconds: number,
	load: HeadFetch,
): Promise<Uint8Array | undefined> {
	const head = await headOf(stem, load);
	if (!head) return undefined;
	const cut = oggCut(head, seconds);
	return cut ? head.subarray(0, cut.end) : undefined;
}

export function clipOf(
	stem: string,
	step: number,
	load: HeadFetch = headLoad ?? fetchHead,
): Promise<Uint8Array | undefined> {
	return headClip(stem, earSeconds(step), load);
}

export function earSerial(puzzle: string, key?: string): number {
	return seedBytes(`serial:${earAnswerKey(puzzle)}`, key).readUInt32LE(0);
}

export function disguise(
	clip: Uint8Array,
	puzzle: string,
	key?: string,
): Uint8Array | undefined {
	const want = earSerial(puzzle, key);
	return oggReserial(clip, want === oggSerial(clip) ? (want ^ 1) >>> 0 : want);
}

export async function earClip(
	puzzle: string,
	step: number,
): Promise<Uint8Array | undefined> {
	const answer = await earAnswer(puzzle);
	const clip = answer ? await clipOf(answer.stem, step) : undefined;
	return clip && puzzleKind(puzzle) === "daily" ? disguise(clip, puzzle) : clip;
}

export async function earProbe(
	today: string = dayKey(),
): Promise<Uint8Array | undefined> {
	const [pool, answer] = await Promise.all([
		guessPool(),
		earAnswer(dailyId(today)),
	]);
	const song = pickAnswer(
		`probe:${today}`,
		pool.filter((s) => s.id !== answer?.id),
	);
	return song
		? headClip(song.stem, PROBE_SECONDS, headLoad ?? fetchHead)
		: undefined;
}

export function earClueToken(
	puzzle: string,
	step: number,
	key?: string,
): string {
	return clueToken(earAnswerKey(puzzle), step, key);
}

export function earClueTokenOk(
	puzzle: string,
	step: number,
	token: string,
	key?: string,
): boolean {
	return clueTokenOk(earAnswerKey(puzzle), step, token, key);
}

export function earClueUrl(puzzle: string, step: number): string {
	return `/api/guess/ear?${new URLSearchParams({
		p: puzzle,
		s: String(step),
		k: earClueToken(puzzle, step),
	})}`;
}

export function setEarHeadForTest(load?: HeadFetch) {
	if (process.env.PHI_TEST_SEAMS !== "1") return;
	headLoad = load;
}

export function resetEarForTest() {
	heads.clear();
}
