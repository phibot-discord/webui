// Dev only: print a NextAuth session cookie for the PHI_LOCAL_DATA user, so the
// signed-in pages can be opened without Discord. Pair with `pnpm dev:local`
//
//   node --env-file=.env.local --import tsx scripts/dev-session.ts [uid]
import { encode } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;
if (!secret)
	throw new Error("AUTH_SECRET is not set (use --env-file=.env.local)");
const uid = process.argv[2] || process.env.PHI_LOCAL_UID || "local-dev";
const name = "authjs.session-token";
const value = await encode({
	token: { sub: uid, id: uid, name: "Local Dev" },
	secret,
	salt: name,
	maxAge: 7 * 24 * 3600,
});
console.log(`${name}=${value}`);
