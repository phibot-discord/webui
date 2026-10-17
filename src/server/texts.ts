import type { Locale } from "@/i18n/config";
import type { CollectionLang } from "@/lib/collection";
import {
	linesIn,
	NO_TEXTS_INDEX,
	NO_TIPS,
	parseTextsIndex,
	parseTextsSection,
	parseTips,
	STORY_KEY,
	TEXTS_INDEX_KEY,
	type TextGroup,
	TIPS_KEY,
	type ViewTextGroup,
} from "@/lib/texts";
import type { ObjectUrl } from "./asset-links";
import { jsonLoader } from "./manifest";

const tips = jsonLoader(TIPS_KEY, parseTips, NO_TIPS);
const index = jsonLoader(TEXTS_INDEX_KEY, parseTextsIndex, NO_TEXTS_INDEX);
const story = jsonLoader(STORY_KEY, parseTextsSection, [] as TextGroup[]);

export function loadTips() {
	return tips.load();
}

export function loadTextsIndex() {
	return index.load();
}

export function loadStoryGroups() {
	return story.load();
}

export function viewTextGroups(
	groups: readonly TextGroup[],
	locale: Locale,
	lang: CollectionLang,
	link: ObjectUrl,
): ViewTextGroup[] {
	return groups.map((group) => ({
		id: group.id,
		title: group.title[locale],
		note: group.note?.[locale],
		lines: linesIn(group.lines, lang),
		images: group.images.flatMap((image) => {
			const src = link(image.file);
			return src ? [{ src, width: image.width, height: image.height }] : [];
		}),
	}));
}
