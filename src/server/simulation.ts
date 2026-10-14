import { displayPlayerId } from "@/lib/player-display";
import { isLevelKind } from "@/phi/lib/manual-score";
import type { SimBase, SimBaseRecord } from "@/phi/lib/simulation";
import { type BoundErr, lastSyncedIso, loadBound, saveRevision } from "./bound";
import type { DataHost } from "./data-host";

/** Every played chart of the save the site holds now, plus an id that changes whenever that save does */
export async function loadSimBase(
	host: DataHost,
	userId: string,
): Promise<{ base: SimBase; playerId: string } | BoundErr> {
	// Not memoised: Sync must see a save that was updated a moment ago
	const got = await loadBound(host, userId);
	if ("error" in got) return got;
	const { save } = got;
	const records: SimBaseRecord[] = [];
	for (const r of save.getRecord()) {
		if (
			!isLevelKind(r.rank) ||
			!Number.isFinite(r.acc) ||
			!(r.difficulty > 0)
		) {
			continue;
		}
		records.push([r.id, r.rank, r.acc, r.difficulty, r.score]);
	}
	return {
		base: {
			rev: saveRevision(save),
			lastSynced: lastSyncedIso(save),
			records,
		},
		playerId: displayPlayerId(save.saveInfo.PlayerId),
	};
}
