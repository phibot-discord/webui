import { cache } from "react";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { getNotes } from "@/phi/lib/notes";
import { loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { userIdForSlug } from "@/server/share";

export const loadShared = cache(async (slug: string) => {
	const userId = await userIdForSlug(slug);
	if (!userId) return;
	const host = await getDataHost();
	const [got, notes] = await Promise.all([
		loadBound(host, userId),
		getNotes(host.db, userId),
	]);
	if ("error" in got) return;
	return {
		got,
		notes,
		player: displayPlayerId(got.save.saveInfo.PlayerId),
		rks: displayRks(got.save.saveInfo.summary?.rankingScore),
	};
});
