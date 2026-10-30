import { nanoid } from "nanoid";
import { kvKey } from "@/phi/lib/const";
import { getDataHost } from "./data-host";

const SHARE = (slug: string) => kvKey("webShare", slug);
const SHARE_USER = (userId: string) => kvKey("webShareUser", userId);
const COMPARE = (slug: string) => kvKey("webCompare", slug);

const slugMem = new Map<string, { userId: string; at: number }>();
const SLUG_MEMO_MS = 60_000;
const SLUG_MEM_MAX = 2_000;

function rememberSlug(slug: string, userId: string) {
	slugMem.delete(slug);
	slugMem.set(slug, { userId, at: Date.now() });
	while (slugMem.size > SLUG_MEM_MAX) {
		const oldest = slugMem.keys().next().value;
		if (oldest === undefined) break;
		slugMem.delete(oldest);
	}
}

export function resetShareMemForTest() {
	slugMem.clear();
}

export async function getShareSlug(
	userId: string,
): Promise<string | undefined> {
	const host = await getDataHost();
	return (await host.db.get(SHARE_USER(userId))) || undefined;
}

export async function userIdForSlug(slug: string): Promise<string | undefined> {
	if (!/^[A-Za-z0-9_-]{8,21}$/.test(slug)) return undefined;
	const hot = slugMem.get(slug);
	if (hot && Date.now() - hot.at < SLUG_MEMO_MS) return hot.userId;
	const host = await getDataHost();
	const userId = (await host.db.get(SHARE(slug))) || undefined;
	if (userId) rememberSlug(slug, userId);
	else slugMem.delete(slug);
	return userId;
}

export async function createShare(userId: string): Promise<string> {
	const host = await getDataHost();
	const existing = await host.db.get(SHARE_USER(userId));
	if (existing) return existing;
	const slug = nanoid(12);
	await host.db.set(SHARE(slug), userId);
	await host.db.set(SHARE_USER(userId), slug);
	rememberSlug(slug, userId);
	return slug;
}

export async function revokeShare(userId: string): Promise<void> {
	const host = await getDataHost();
	const slug = await host.db.get(SHARE_USER(userId));
	if (slug) {
		slugMem.delete(slug);
		await host.db.del(SHARE(slug));
		await host.db.del(COMPARE(slug));
	}
	for (const [s, hit] of slugMem) if (hit.userId === userId) slugMem.delete(s);
	await host.db.del(SHARE_USER(userId));
}

export async function moveShare(from: string, to: string): Promise<void> {
	const host = await getDataHost();
	const slug = await host.db.get(SHARE_USER(from));
	if (!slug) return;
	if (await host.db.get(SHARE_USER(to))) return revokeShare(from);
	await host.db.set(SHARE(slug), to);
	await host.db.set(SHARE_USER(to), slug);
	await host.db.del(SHARE_USER(from));
	rememberSlug(slug, to);
}

export async function getCompareOptIn(userId: string): Promise<boolean> {
	const slug = await getShareSlug(userId);
	if (!slug) return false;
	const host = await getDataHost();
	return (await host.db.get(COMPARE(slug))) === "1";
}

export async function setCompareOptIn(
	userId: string,
	on: boolean,
): Promise<"ok" | "no_share"> {
	const slug = await getShareSlug(userId);
	if (!slug) return "no_share";
	const host = await getDataHost();
	if (on) await host.db.set(COMPARE(slug), "1");
	else await host.db.del(COMPARE(slug));
	return "ok";
}

export async function disableCompare(userId: string): Promise<void> {
	await setCompareOptIn(userId, false);
}

export async function comparableUser(
	slug: string,
): Promise<string | undefined> {
	const userId = await userIdForSlug(slug);
	if (!userId) return undefined;
	const host = await getDataHost();
	return (await host.db.get(COMPARE(slug))) === "1" ? userId : undefined;
}
