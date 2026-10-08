import { cookies } from "next/headers";
import { kvKey } from "@/phi/lib/const";
import { forgetBound, getToken } from "@/phi/lib/saves";
import {
	DISCORD_LINK_COOKIE,
	isTapUserId,
	openDiscordLink,
	tapObjectId,
	tapUserId,
} from "./auth-tickets";
import { type DataHost, getDataHost } from "./data-host";
import { logger, withDiscordUid } from "./logger";
import { leaveManualMode } from "./manual";
import { moveShare } from "./share";

const TAP_LINK = (objectId: string) => kvKey("webTapLink", objectId);
const DISCORD_TAP = (discordId: string) => kvKey("webDiscordTap", discordId);
/** Session token → the Discord user that bound it last; the bot writes it too */
const TOKEN_USER = (token: string) => kvKey("tokenUser", token);

const NOTES = (userId: string) => kvKey("notes", userId);
const HISB30 = (userId: string) => kvKey("hisb30", userId);
const MANUAL = (userId: string) => kvKey("manualSave", userId);

export type LinkError = "discord_taken" | "link_failed" | "link_expired";

export async function noteTokenUser(userId: string, token: string) {
	if (isTapUserId(userId)) return;
	try {
		const host = await getDataHost();
		await host.db.set(TOKEN_USER(token), userId);
	} catch (err) {
		logger.warn(
			`token user not saved: ${err instanceof Error ? err.message : err}`,
		);
	}
}

async function tokenHolder(host: DataHost, token: string) {
	const userId = await host.db.get(TOKEN_USER(token));
	if (!userId || isTapUserId(userId)) return undefined;
	return (await getToken(host.rt, userId)) === token ? userId : undefined;
}

export async function tapSignInUser(
	objectId: string,
	token: string,
): Promise<string> {
	const host = await getDataHost();
	const linked = await host.db.get(TAP_LINK(objectId));
	if (linked) {
		const held = await getToken(host.rt, linked);
		if (!held || held === token) return linked;
		logger.info("tap link dropped: the Discord user holds another save");
		await host.db.del(TAP_LINK(objectId));
		if ((await host.db.get(DISCORD_TAP(linked))) === objectId)
			await host.db.del(DISCORD_TAP(linked));
	}
	const holder = await tokenHolder(host, token);
	if (holder) {
		const result = await linkTapToDiscord(tapUserId(objectId), holder);
		if ("ok" in result) return holder;
		logger.warn(
			`tap sign-in kept apart from its Discord user: ${result.error}`,
		);
	}
	return tapUserId(objectId);
}

/** A bound save nobody claims yet (bound before tokenUser existed, or only refreshed here) is claimed now */
export async function tapSignInOpens(discordId: string): Promise<boolean> {
	const host = await getDataHost();
	if (await host.db.get(DISCORD_TAP(discordId))) return true;
	const token = await getToken(host.rt, discordId);
	if (!token) return false;
	const holder = await tokenHolder(host, token);
	if (holder) return holder === discordId;
	await noteTokenUser(discordId, token);
	return true;
}

async function carry(
	db: Awaited<ReturnType<typeof getDataHost>>["db"],
	key: (userId: string) => string,
	from: string,
	to: string,
) {
	const value = await db.get(key(from));
	if (value && !(await db.get(key(to)))) await db.set(key(to), value);
}

/** The bot reads these keys too. Everything is copied before the TapTap user is deleted, so a failed link can run again */
export async function linkTapToDiscord(
	tapUser: string,
	discordId: string,
): Promise<{ ok: true } | { error: LinkError }> {
	const objectId = tapObjectId(tapUser);
	if (!objectId || !/^\d{5,25}$/.test(discordId))
		return { error: "link_failed" };
	const host = await getDataHost();
	const [tapToken, discordToken] = await Promise.all([
		getToken(host.rt, tapUser),
		getToken(host.rt, discordId),
	]);
	if (tapToken && discordToken && tapToken !== discordToken)
		return { error: "discord_taken" };

	if (tapToken && !discordToken) {
		await host.rt.store.setSessionToken(discordId, tapToken);
		forgetBound(discordId);
		// A real bind replaces a manual profile, as on the bind page
		await leaveManualMode(discordId);
	}
	await carry(host.db, NOTES, tapUser, discordId);
	await carry(host.db, HISB30, tapUser, discordId);
	if (!tapToken && !discordToken)
		await carry(host.db, MANUAL, tapUser, discordId);
	await moveShare(tapUser, discordId);

	const previous = await host.db.get(DISCORD_TAP(discordId));
	if (
		previous &&
		previous !== objectId &&
		(await host.db.get(TAP_LINK(previous))) === discordId
	)
		await host.db.del(TAP_LINK(previous));
	await host.db.set(TAP_LINK(objectId), discordId);
	await host.db.set(DISCORD_TAP(discordId), objectId);

	// Only its binding goes: the token-keyed save is Discord's now
	await host.rt.store.clearLocalCredentials(tapUser);
	forgetBound(tapUser);
	for (const key of [NOTES, HISB30, MANUAL]) await host.db.del(key(tapUser));
	logger.ok(`linked tap account ${objectId} to discord ${discordId}`);
	return { ok: true };
}

/** Auth.js `signIn` callback: `true` lets the Discord session start; a path keeps the TapTap session and shows the error */
export async function finishDiscordLink(
	discordId: string,
): Promise<true | string> {
	const jar = await cookies();
	const sealed = jar.get(DISCORD_LINK_COOKIE)?.value;
	if (!sealed) return true;
	jar.delete(DISCORD_LINK_COOKIE);
	const tapUser = await openDiscordLink(sealed);
	const failed = (error: LinkError) => `/account?link=${error}`;
	if (!tapUser) return failed("link_expired");
	return withDiscordUid(discordId, async () => {
		try {
			const result = await linkTapToDiscord(tapUser, discordId);
			return "error" in result ? failed(result.error) : true;
		} catch (err) {
			logger.error("discord link failed", err);
			return failed("link_failed");
		}
	});
}
