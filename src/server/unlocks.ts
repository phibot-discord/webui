import { parseUnlocks, type UnlocksReply, unlocksReply } from "@/lib/unlocks";
import { loadBound } from "./bound";
import { loadCollectionIndex } from "./collection";
import type { DataHost } from "./data-host";

export async function unlocksFor(
	host: DataHost,
	userId: string,
): Promise<UnlocksReply> {
	const got = await loadBound(host, userId, { memo: true });
	if ("error" in got) return { state: "none" };
	if (got.manual) return { state: "manual" };
	const unlocks = parseUnlocks(got.save.unlocks);
	if (!unlocks) return { state: "refresh" };
	if ("error" in unlocks) return { state: "unreadable" };
	return unlocksReply(unlocks, await loadCollectionIndex());
}
