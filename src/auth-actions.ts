"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { sessionUserId, signIn, signOut } from "@/auth";
import { withBoundAuthUrl } from "@/lib/auth-url";
import { safeNext } from "@/lib/safe-next";
import {
	DISCORD_LINK_COOKIE,
	DISCORD_LINK_TTL_S,
	isSecureRequest,
	isTapUserId,
	sealDiscordLink,
	TAP_LOGIN_COOKIE,
} from "@/server/auth-tickets";

export async function signOutAction() {
	await withBoundAuthUrl(await headers(), () => signOut({ redirectTo: "/" }));
}

export async function signInDiscord(formData: FormData) {
	await withBoundAuthUrl(await headers(), () =>
		signIn("discord", {
			redirectTo: safeNext(String(formData.get("next") || "")),
		}),
	);
}

export type TapSignInState = { failed: boolean };

export async function signInTaptap(
	_prev: TapSignInState,
	formData: FormData,
): Promise<TapSignInState> {
	const jar = await cookies();
	try {
		await withBoundAuthUrl(await headers(), () =>
			signIn("taptap", {
				ticket: String(formData.get("ticket") || ""),
				redirectTo: safeNext(String(formData.get("next") || "")),
			}),
		);
	} catch (err) {
		if (!(err instanceof AuthError)) throw err;
		return { failed: true };
	} finally {
		jar.delete(TAP_LOGIN_COOKIE);
	}
	return { failed: false };
}

/** A TapTap account links Discord: Discord OAuth comes back to the `signIn` callback, which merges */
export async function linkDiscord() {
	const userId = await sessionUserId();
	if (!userId) redirect("/?next=/account");
	if (!isTapUserId(userId)) redirect("/account");
	const hdrs = await headers();
	const jar = await cookies();
	jar.set(DISCORD_LINK_COOKIE, await sealDiscordLink(userId), {
		path: "/",
		maxAge: DISCORD_LINK_TTL_S,
		httpOnly: true,
		sameSite: "lax",
		secure: isSecureRequest(hdrs),
	});
	await withBoundAuthUrl(hdrs, () =>
		signIn("discord", { redirectTo: "/account?linked=discord" }),
	);
}
