import {
	type PracticeItem,
	parsePracticeList,
	withoutPracticeItem,
	withPracticeItem,
} from "@/lib/practice-list";
import { kvKey } from "@/phi/lib/const";
import { getDataHost } from "./data-host";

export const PRACTICE_LIST = (userId: string) =>
	kvKey("webPracticeList", userId);

export async function getPracticeList(userId: string): Promise<PracticeItem[]> {
	const host = await getDataHost();
	return parsePracticeList(await host.db.get(PRACTICE_LIST(userId)));
}

async function write(userId: string, items: readonly PracticeItem[]) {
	const host = await getDataHost();
	if (items.length)
		await host.db.set(PRACTICE_LIST(userId), JSON.stringify({ v: 1, items }));
	else await host.db.del(PRACTICE_LIST(userId));
}

export async function keepPracticeItem(
	userId: string,
	item: PracticeItem,
): Promise<"ok" | "full"> {
	const next = withPracticeItem(await getPracticeList(userId), item);
	if (next === "full") return "full";
	await write(userId, next);
	return "ok";
}

export async function dropPracticeItem(
	userId: string,
	id: string,
	rank: string,
): Promise<void> {
	const list = await getPracticeList(userId);
	const next = withoutPracticeItem(list, id, rank);
	if (next.length !== list.length) await write(userId, next);
}

export async function clearPracticeList(userId: string): Promise<void> {
	const host = await getDataHost();
	await host.db.del(PRACTICE_LIST(userId));
}
