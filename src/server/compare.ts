import {
	type CompareRecord,
	type CompareSide,
	slugFromInput,
} from "@/lib/compare";
import { displayPlayerId } from "@/lib/player-display";
import type { Save } from "@/phi/lib/save";
import { loadBound } from "./bound";
import { getDataHost } from "./data-host";
import { comparableUser } from "./share";

export type SideLoad =
	| { state: "ok"; side: CompareSide; slug?: string }
	| { state: "empty" }
	| { state: "bad" }
	| { state: "signin" }
	| { state: "unavailable" };

export function sideFromSave(save: Save): CompareSide {
	const records: CompareRecord[] = save
		.getRecord()
		.map((r) => [
			r.id,
			r.rank,
			Number(r.acc.toFixed(4)),
			r.score,
			r.fc,
			r.difficulty,
			r.rks,
		]);
	const summary = save.saveInfo.summary;
	return {
		name: displayPlayerId(save.saveInfo.PlayerId),
		rks:
			typeof summary?.rankingScore === "number" ? summary.rankingScore : null,
		challenge: Number(summary?.challengeModeRank) || 0,
		records,
	};
}

export async function loadCompareSide(
	input: string | undefined,
	viewer: string | null,
): Promise<SideLoad> {
	const raw = input?.trim() ?? "";
	if (!raw) return { state: "empty" };
	const host = await getDataHost();
	if (raw === "me") {
		if (!viewer) return { state: "signin" };
		const got = await loadBound(host, viewer, { memo: true });
		return "error" in got
			? { state: "unavailable" }
			: { state: "ok", side: sideFromSave(got.save) };
	}
	const slug = slugFromInput(raw);
	if (!slug) return { state: "bad" };
	const userId = await comparableUser(slug);
	if (!userId) return { state: "unavailable" };
	const got = await loadBound(host, userId, { memo: true });
	return "error" in got
		? { state: "unavailable" }
		: { state: "ok", side: sideFromSave(got.save), slug };
}
