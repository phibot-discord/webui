import { kvKey } from "@/phi/lib/const";
import { nanoid } from "nanoid";
import { getDataHost } from "./data-host";

const SHARE = (slug: string) => kvKey("webShare", slug);
const SHARE_USER = (userId: string) => kvKey("webShareUser", userId);

export async function getShareSlug(
	userId: string,
): Promise<string | undefined> {
	const host = await getDataHost();
	return (await host.db.get(SHARE_USER(userId))) || undefined;
}

export async function userIdForSlug(slug: string): Promise<string | undefined> {
	const host = await getDataHost();
	if (!/^[A-Za-z0-9_-]{8,21}$/.test(slug)) return undefined;
	return (await host.db.get(SHARE(slug))) || undefined;
}

export async function createShare(userId: string): Promise<string> {
	const host = await getDataHost();
	const existing = await host.db.get(SHARE_USER(userId));
	if (existing) return existing;
	const slug = nanoid(12);
	await host.db.set(SHARE(slug), userId);
	await host.db.set(SHARE_USER(userId), slug);
	return slug;
}

export async function revokeShare(userId: string): Promise<void> {
	const host = await getDataHost();
	const slug = await host.db.get(SHARE_USER(userId));
	if (slug) await host.db.del(SHARE(slug));
	await host.db.del(SHARE_USER(userId));
}
