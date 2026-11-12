import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { stripCanonicalAuthUrlIfMany } from "@/lib/auth-url";
import {
	openTapTicket,
	readCookie,
	TAP_LOGIN_COOKIE,
} from "@/server/auth-tickets";

stripCanonicalAuthUrlIfMany();

const nextAuth = NextAuth({
	trustHost: true,
	session: { strategy: "jwt" },
	providers: [
		Discord({
			issuer: "https://discord.com",
			authorization: { params: { scope: "identify" } },
		}),
		Credentials({
			id: "taptap",
			name: "TapTap",
			credentials: { ticket: {} },
			authorize: (credentials, request) =>
				openTapTicket(
					credentials.ticket,
					readCookie(request.headers, TAP_LOGIN_COOKIE),
				),
		}),
	],
	callbacks: {
		async signIn({ account, user }) {
			if (account?.provider !== "discord") return true;
			// Loaded here only: the link reaches KV and the Phigros runtime
			const [{ finishDiscordLink }, { rememberDiscordAvatar }] =
				await Promise.all([
					import("@/server/account-link"),
					import("@/server/avatar"),
				]);
			// Independent KV writes; rememberDiscordAvatar never throws
			const [result] = await Promise.all([
				finishDiscordLink(account.providerAccountId),
				rememberDiscordAvatar(account.providerAccountId, user.image),
			]);
			return result;
		},
		jwt({ token, user, account, profile }) {
			// A Discord snowflake, or the user a TapTap ticket names (`tap:…` or a linked snowflake)
			const id =
				account?.providerAccountId ||
				(profile && "id" in profile ? String(profile.id) : "");
			if (id) token.id = id;
			if (account?.provider === "taptap") {
				if (user && "proof" in user && typeof user.proof === "string")
					token.tp = user.proof;
			} else if (account?.provider === "discord") delete token.tp;
			return token;
		},
		async session({ session, token }) {
			let id = String(token.id || token.sub || "");
			if (typeof token.tp === "string" && id) {
				try {
					const [{ proofHolds }, { getDataHost }] = await Promise.all([
						import("@/server/session-proof"),
						import("@/server/data-host"),
					]);
					const host = await getDataHost();
					const ok = await proofHolds(id, token.tp, (u) =>
						host.lib.getBoundToken(host.rt, u),
					);
					if (!ok) id = "";
				} catch {}
			}
			if (session.user) session.user.id = id;
			return session;
		},
	},
});

export const { handlers, auth, signIn, signOut } = nextAuth;

let sessionOverride: string | null | undefined;

export function setSessionForTest(userId?: string | null): void {
	if (process.env.PHI_TEST_SEAMS !== "1") return;
	sessionOverride = userId;
}

export async function sessionUserId(): Promise<string | null> {
	if (sessionOverride !== undefined) return sessionOverride;
	const session = await auth();
	const id = session?.user?.id;
	return id || null;
}
