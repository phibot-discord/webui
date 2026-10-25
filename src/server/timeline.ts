import { type Locale, localeTag } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { catalogs } from "@/i18n/server";
import { chapterHeading, chapterShort } from "@/lib/collection";
import { clipTitle } from "@/lib/pv";
import {
	buildTimeline,
	type ChapterInfo,
	detailsIndex,
	type EventDetails,
	parseTimelineData,
	type StoryInfo,
	type TermDetails,
	type ThreadDetails,
	TIMELINE_KEY,
	type TimelineData,
} from "@/lib/timeline";
import { loadCollectionIndex, loadCollectionText } from "./collection";
import { jsonLoader } from "./manifest";
import { loadPv } from "./pv";
import { loadStoryGroups } from "./texts";

const EMPTY: TimelineData = {
	eras: [],
	threads: [],
	worlds: [],
	chapters: [],
	chapterWorlds: new Map(),
	events: [],
	terms: [],
};

/** Built views kept per locale, thread and community; a full one is several MB */
const MEMO_MAX = 6;

const timeline = jsonLoader(TIMELINE_KEY, parseTimelineData, EMPTY);

function loadInputs(locale: Locale) {
	const lang = localeTag(locale);
	return Promise.all([
		timeline.load(),
		loadCollectionIndex(),
		loadCollectionText(lang),
		lang === "zh-CN" ? undefined : loadCollectionText("zh-CN"),
		loadStoryGroups(),
		loadPv().catch(() => []),
	]);
}

type Inputs = Awaited<ReturnType<typeof loadInputs>>;

function viewOf(
	m: Messages,
	locale: Locale,
	thread: string | undefined,
	community: boolean,
	[data, index, text, original, stories, clips]: Inputs,
) {
	const lang = localeTag(locale);
	const chapters = new Map<string, ChapterInfo>(
		index.chapters.map((c) => [
			c.id,
			{
				short: chapterShort(c, m.collection.extraShort),
				name: chapterHeading(c, lang).name,
			},
		]),
	);
	const storyInfo = new Map<string, StoryInfo>(
		stories.flatMap((g) =>
			g.chapter ? [[g.id, { chapter: g.chapter, title: g.title[locale] }]] : [],
		),
	);
	const built = buildTimeline(
		data,
		{
			index,
			text,
			original,
			chapters,
			stories: storyInfo,
			clips: new Map(clips.map((c) => [c.id, clipTitle(c.name)])),
		},
		{ locale, thread, community },
		m.timeline,
	);
	return {
		...built,
		available: data.events.length > 0,
		thread,
		community,
	};
}

type View = ReturnType<typeof viewOf>;

type Entry = {
	m: Messages;
	inputs: Inputs;
	view: View;
	details?: ReturnType<typeof detailsIndex>;
};

const memo = new Map<string, Entry>();

async function memoView(
	m: Messages,
	locale: Locale,
	asked: { thread: string | undefined; community: boolean },
): Promise<Entry> {
	const inputs = await loadInputs(locale);
	const thread = inputs[0].threads.some((t) => t.id === asked.thread)
		? asked.thread
		: undefined;
	const key = `${locale}|${thread ?? ""}|${asked.community}`;
	const hit = memo.get(key);
	memo.delete(key);
	if (
		hit &&
		hit.m === m &&
		hit.inputs.every((input, at) => input === inputs[at])
	) {
		memo.set(key, hit);
		return hit;
	}
	const entry: Entry = {
		m,
		inputs,
		view: viewOf(m, locale, thread, asked.community, inputs),
	};
	memo.set(key, entry);
	for (const old of memo.keys()) {
		if (memo.size <= MEMO_MAX) break;
		memo.delete(old);
	}
	return entry;
}

export async function buildTimelineView(
	m: Messages,
	locale: Locale,
	asked: { thread: string | undefined; community: boolean },
): Promise<View> {
	return (await memoView(m, locale, asked)).view;
}

export async function timelineDetails(
	locale: Locale,
	community: boolean,
	asked: { kind: "event" | "term" | "thread"; id: string },
): Promise<EventDetails | TermDetails | ThreadDetails | undefined> {
	const entry = await memoView(catalogs[locale], locale, {
		thread: undefined,
		community,
	});
	entry.details ??= detailsIndex(entry.view.sections, entry.view.terms);
	const { events, terms, threads } = entry.details;
	if (asked.kind === "event") return events.get(asked.id);
	return (asked.kind === "term" ? terms : threads).get(asked.id);
}
