import { cookies } from "next/headers";
import { REFRESH_COOKIE, refreshToken } from "@/lib/asset-refresh";
import { ensureAssetVersions } from "./assets";
import { publicObjectUrl } from "./r2";

export type ObjectUrl = (key: string) => string | undefined;

async function visitorToken(): Promise<string | undefined> {
	try {
		return refreshToken((await cookies()).get(REFRESH_COOKIE)?.value);
	} catch {
		return undefined;
	}
}

/** Links for the page being rendered: each with its file's `?v=` and the visitor's Refresh files token */
export async function objectUrls(): Promise<ObjectUrl> {
	const [, token] = await Promise.all([ensureAssetVersions(), visitorToken()]);
	return (key) => publicObjectUrl(key, undefined, token);
}
