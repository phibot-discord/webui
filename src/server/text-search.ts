import { type Locale, localeTag } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { catalogs } from "@/i18n/server";
import { chapterTip } from "@/lib/collection";
import { collectionSearchHref } from "@/lib/files-view";
import type {
	TextAnswer,
	TextHit,
	TextHitGroup,
	TextKind,
} from "@/lib/text-search";
import {
	collectionTextHits,
	type SearchDoc,
	searchDocs,
	storyDocs,
	timelineDocs,
	tipDocs,
} from "@/lib/text-search-kinds";
import { type TextGroup, type TipLists, tipsIn } from "@/lib/texts";
import type { ViewSection, ViewTermGroup } from "@/lib/timeline";
import { buildCollectionSearch, type CollectionSearchData } from "./files-page";
import { loadStoryGroups, loadTips } from "./texts";
import { buildTimelineView } from "./timeline";

export type TextSources = {
	collection: CollectionSearchData | undefined;
	story: readonly TextGroup[];
	tips: TipLists;
	timeline: {
		available: boolean;
		sections: readonly ViewSection[];
		terms: readonly ViewTermGroup[];
	};
};

type LoadSources = (
	m: Messages,
	locale: Locale,
	q: string,
) => Promise<TextSources>;

async function loadSources(
	m: Messages,
	locale: Locale,
	q: string,
): Promise<TextSources> {
	const [collection, story, tips, timeline] = await Promise.all([
		buildCollectionSearch(m, localeTag(locale), q),
		loadStoryGroups(),
		loadTips(),
		buildTimelineView(m, locale, { thread: undefined, community: false }),
	]);
	return { collection, story, tips, timeline };
}

const memo = new Map<
	string,
	{ inputs: readonly unknown[]; docs: readonly SearchDoc[] }
>();

function memoDocs(
	key: string,
	inputs: readonly unknown[],
	build: () => readonly SearchDoc[],
): readonly SearchDoc[] {
	const hit = memo.get(key);
	if (
		hit &&
		hit.inputs.length === inputs.length &&
		hit.inputs.every((input, at) => input === inputs[at])
	) {
		return hit.docs;
	}
	const docs = build();
	memo.set(key, { inputs, docs });
	return docs;
}

export async function searchTexts(
	q: string,
	locale: Locale,
	load: LoadSources = loadSources,
): Promise<TextAnswer> {
	const m = catalogs[locale];
	const lang = localeTag(locale);
	const src = await load(m, locale, q);
	const groups: TextHitGroup[] = [];
	const add = (
		kind: TextKind,
		found: { hits: TextHit[]; total: number },
		more?: string,
	) => {
		if (!found.hits.length) return;
		groups.push({
			kind,
			hits: found.hits,
			total: found.total,
			...(more && found.total > found.hits.length ? { more } : {}),
		});
	};
	const whereOf = new Map(
		(src.collection?.chapters ?? []).map((c) => [c.id, chapterTip(c, "")]),
	);
	if (src.collection) {
		add(
			"collection",
			{
				hits: collectionTextHits(src.collection.hits, whereOf),
				total: src.collection.total,
			},
			collectionSearchHref(q),
		);
	}
	if (whereOf.size) {
		const places = [...whereOf].join("\n");
		const docs = memoDocs(`story|${locale}`, [src.story, places], () =>
			storyDocs(src.story, whereOf, locale, lang),
		);
		add("story", searchDocs(docs, q));
	}
	const tips = tipsIn(src.tips, lang);
	if (tips) {
		const docs = memoDocs(`tips|${tips.lang}`, [tips.tips], () =>
			tipDocs(tips.tips),
		);
		add("tips", searchDocs(docs, q));
	}
	if (src.timeline.available) {
		const { sections, terms } = src.timeline;
		const docs = memoDocs(`timeline|${locale}`, [sections, terms], () =>
			timelineDocs(
				{ sections, terms },
				{
					timeline: m.timeline.tabs.timeline,
					setting: m.timeline.tabs.setting,
					kinds: m.timeline.kinds,
				},
			),
		);
		add("timeline", searchDocs(docs, q));
	}
	return { q, groups };
}
