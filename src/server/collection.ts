import {
	COLLECTION_INDEX_KEY,
	type CollectionLang,
	type CollectionText,
	EMPTY_COLLECTION,
	EMPTY_TEXT,
	parseCollectionIndex,
	parseCollectionText,
} from "@/lib/collection";
import {
	type ArtIndex,
	type ArtRow,
	artIndexOf,
	artRows,
	COLLECTION_ART_KEY,
	COLLECTION_ART_SPECIALS_KEY,
	mergeArtRows,
} from "@/lib/collection-art";
import { type JsonLoader, jsonLoader } from "./manifest";

const index = jsonLoader(
	COLLECTION_INDEX_KEY,
	parseCollectionIndex,
	EMPTY_COLLECTION,
);
const arts = jsonLoader(COLLECTION_ART_KEY, artRows, [] as ArtRow[]);
const specials = jsonLoader(
	COLLECTION_ART_SPECIALS_KEY,
	artRows,
	[] as ArtRow[],
);
const texts = new Map<CollectionLang, JsonLoader<CollectionText>>();

export function loadCollectionIndex() {
	return index.load();
}

let merged:
	| { rows: readonly ArtRow[]; extra: readonly ArtRow[]; index: ArtIndex }
	| undefined;

/** phi-unpackd's manifest with phi-specials' overlay laid over it; without the overlay, the manifest alone */
export async function loadCollectionArt(): Promise<ArtIndex> {
	const [rows, extra] = await Promise.all([arts.load(), specials.load()]);
	if (merged?.rows !== rows || merged.extra !== extra) {
		merged = { rows, extra, index: artIndexOf(mergeArtRows(rows, extra)) };
	}
	return merged.index;
}

export function loadCollectionText(lang: CollectionLang) {
	let loader = texts.get(lang);
	if (!loader) {
		loader = jsonLoader(
			`collection/text/${lang}.json`,
			parseCollectionText,
			EMPTY_TEXT,
		);
		texts.set(lang, loader);
	}
	return loader.load();
}
