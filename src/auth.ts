import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { stripCanonicalAuthUrlIfMany } from "@/lib/auth-url";

stripCanonicalAuthUrlIfMany();

const nextAuth = NextAuth({
	trustHost: true,
	session: { strategy: "jwt" },
	providers: [
		Discord({
			authorization: { params: { scope: "identify" } },
		}),
	],
	callbacks: {
		jwt({ token, account, profile }) {
			const snowflake =
				account?.providerAccountId ||
				(profile && "id" in profile ? String(profile.id) : "");
			if (snowflake) token.id = snowflake;
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
