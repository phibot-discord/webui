import type { Metadata } from "next";
import { auth } from "@/auth";
import {
	SongLookup,
	type SongLookupExample,
	type SongLookupInitial,
} from "@/components/SongLookup";
import { getMessages } from "@/i18n/server";
import { rankSongs } from "@/lib/song-search";
import { ALIAS_MAX_LEN } from "@/server/aliases";
import { chartCatalog } from "@/server/charts";

export const dynamic = "force-dynamic";

/** Results on screen at once, here and while typing */
const SHOWN = 20;
/** The empty page's suggestions: a Chinese nickname, an abbreviation, a shared one */
const EXAMPLES = ["无限光", "ASA", "Ad"];

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.songs.title, description: m.songs.lede };
}

/**
 * Renders the first results from the same ranking the browser runs over
 * `/api/charts`, so `/songs?q=` works without JavaScript and as a shared link
 */
export default async function SongsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string | string[] }>;
}) {
	const raw = (await searchParams).q;
	const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, ALIAS_MAX_LEN);
	const session = await auth();
	let initial: SongLookupInitial;
	let examples: SongLookupExample[] = EXAMPLES.map((text) => ({
		q: text,
		songs: [],
	}));
	try {
		const { list } = await chartCatalog();
		const all = q ? rankSongs(list, q, { limit: list.length }) : [];
		initial = { q: q ?? "", total: all.length, hits: all.slice(0, SHOWN) };
		examples = EXAMPLES.map((text) => ({
			q: text,
			songs: rankSongs(list, text, { exact: true }).map((hit) => hit.song.song),
		}));
	} catch {
		initial = { q: q ?? "", total: 0, hits: [], failed: true };
	}
	return (
		<main id="content" className="page songs-page">
			<SongLookup
				initial={initial}
				examples={examples}
				shown={SHOWN}
				maxLength={ALIAS_MAX_LEN}
				signedIn={Boolean(session?.user?.id)}
			/>
		</main>
	);
}
