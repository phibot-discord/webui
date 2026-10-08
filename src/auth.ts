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
			// Discord sends `iss` on the callback (RFC 9207); without it Auth.js fails with "unexpected iss"
			issuer: "https://discord.com",
			authorization: { params: { scope: "identify" } },
		}),
		// Only the browser that started the TapTap QR sign-in can redeem its ticket
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
		jwt({ token, account, profile }) {
			// A Discord snowflake, or the user a TapTap ticket names (`tap:…` or a linked snowflake)
			const id =
				account?.providerAccountId ||
				(profile && "id" in profile ? String(profile.id) : "");
			if (id) token.id = id;
			return token;
		},
		session({ session, token }) {
			if (session.user) session.user.id = String(token.id || token.sub || "");
			return session;
		},
	},
});

export const { handlers, auth, signIn, signOut } = nextAuth;

export async function sessionUserId(): Promise<string | null> {
	const session = await auth();
	const id = session?.user?.id;
	return id || null;
}
