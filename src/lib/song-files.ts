import type { CollectionChapter } from "./collection";
import { groupChapter, groupLabel, type PvClip } from "./pv";

export type SongRef = { id: string; title: string; chapter: string };

const MIN_NAME = 5;
const MIN_LABEL = 3;

const fold = (s: string) =>
	s
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, "");

export function songChapterId(
	chapter: string,
	chapters: readonly Pick<CollectionChapter, "id">[],
): string | undefined {
	const text = chapter.trim();
	const main = /^Chapter\s+(\d+)\b/i.exec(text);
	const side = /^Side\s+Story\s+(\d+)\b/i.exec(text);
	const id = main
		? `c${Number(main[1])}`
		: side
			? `s${Number(side[1])}`
			: /^Extra\s+Story\b/i.test(text)
				? "extra"
				: /^Chapter\s+EX\b/i.test(text)
					? "ex"
					: undefined;
	return id && chapters.some((c) => c.id === id) ? id : undefined;
}

function stemOf(id: string): string {
	return fold(id.replace(/\.0$/, "").split(".")[0] ?? "");
}

function sceneWords(scene: string): string[] {
	const parts = scene.replace(/\.unity$/i, "").split("/");
	return parts.slice(-2).map(fold);
}

export function clipNamesSong(clip: PvClip, song: SongRef): boolean {
	const stem = stemOf(song.id);
	const title = fold(song.title);
	const head = fold(clip.name.split("_")[0] ?? "");
	if (head.length >= MIN_NAME && (head === stem || head === title)) return true;
	if (
		stem.length >= MIN_NAME &&
		sceneWords(clip.scene).some((w) => w.startsWith(stem))
	) {
		return true;
	}
	const label = /Event$/.test(clip.group) ? fold(groupLabel(clip.group)) : "";
	return label.length >= MIN_LABEL && stem.includes(label);
}

function clipChapterId(
	clip: PvClip,
	chapters: readonly CollectionChapter[],
	transcriptChapter: (clip: string) => string | undefined,
): string | undefined {
	return groupChapter(clip.group, chapters)?.id ?? transcriptChapter(clip.id);
}

export function songClips(
	song: SongRef,
	clips: readonly PvClip[],
	chapters: readonly CollectionChapter[],
	transcriptChapter: (clip: string) => string | undefined,
): { own: PvClip[]; chapter: PvClip[]; chapterId: string | undefined } {
	const chapterId = songChapterId(song.chapter, chapters);
	const own = clips.filter((c) => clipNamesSong(c, song));
	const mine = new Set(own.map((c) => c.id));
	const chapter = chapterId
		? clips.filter(
				(c) =>
					!mine.has(c.id) &&
					clipChapterId(c, chapters, transcriptChapter) === chapterId,
			)
		: [];
	return { own, chapter, chapterId };
}
