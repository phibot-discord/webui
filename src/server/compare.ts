import { cache } from "react";
import {
	type CompareRecord,
	type CompareSide,
	slugFromInput,
} from "@/lib/compare";
import {
	dayEndMs,
	historyDays,
	parsePastInput,
	recordsAt,
	valueAt,
} from "@/lib/past-self";
import { displayPlayerId } from "@/lib/player-display";
import { loadSaveHistory } from "@/phi/lib/history";
import type { Save } from "@/phi/lib/save";
import type { SaveHistory } from "@/phi/lib/save-history";
import { loadBound } from "./bound";
import { chartCell } from "./charts";
import { getDataHost } from "./data-host";
import { comparableUser } from "./share";

export type SideLoad =
	| { state: "ok"; side: CompareSide; slug?: string; day?: string }
	| { state: "empty" }
	| { state: "bad" }
	| { state: "signin" }
	| { state: "unavailable" }
	| { state: "nohistory" };

function sideFromSave(save: Save): CompareSide {
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

function sideAtDay(
	save: Save,
	history: Pick<SaveHistory, "scoreHistory" | "rks" | "challengeModeRank">,
	day: string,
): CompareSide | undefined {
	const cutoff = dayEndMs(day);
	if (cutoff === undefined) return undefined;
	const records = recordsAt(
		history.scoreHistory,
		cutoff,
		(id, rank) => chartCell(id, rank)?.[0],
	);
	if (!records.length) return undefined;
	return {
		name: displayPlayerId(save.saveInfo.PlayerId),
		rks: valueAt(history.rks, cutoff),
		challenge: valueAt(history.challengeModeRank, cutoff) ?? 0,
		records,
	};
}

const boundOf = cache(async (userId: string) =>
	loadBound(await getDataHost(), userId, { memo: true }),
);

const historyOf = cache(async (token: string) => {
	const host = await getDataHost();
	return loadSaveHistory(host.rt, host.db, token);
});

export async function pastDays(viewer: string | null): Promise<string[]> {
	if (!viewer) return [];
	const got = await boundOf(viewer);
	if ("error" in got || !got.token) return [];
	const history = await historyOf(got.token);
	return historyDays(history.rks, history.scoreHistory);
}

export async function loadCompareSide(
	input: string | undefined,
	viewer: string | null,
): Promise<SideLoad> {
	const raw = input?.trim() ?? "";
	if (!raw) return { state: "empty" };
	const day = parsePastInput(raw);
	if (day) {
		if (!viewer) return { state: "signin" };
		const got = await boundOf(viewer);
		if ("error" in got) return { state: "unavailable" };
		if (!got.token) return { state: "nohistory" };
		const history = await historyOf(got.token);
		const side = sideAtDay(got.save, history, day);
		return side ? { state: "ok", side, day } : { state: "nohistory" };
	}
	if (raw === "me") {
		if (!viewer) return { state: "signin" };
		const got = await boundOf(viewer);
		return "error" in got
			? { state: "unavailable" }
			: { state: "ok", side: sideFromSave(got.save) };
	}
	const slug = slugFromInput(raw);
	if (!slug) return { state: "bad" };
	const userId = await comparableUser(slug);
	if (!userId) return { state: "unavailable" };
	const got = await boundOf(userId);
	return "error" in got
		? { state: "unavailable" }
		: { state: "ok", side: sideFromSave(got.save), slug };
}
