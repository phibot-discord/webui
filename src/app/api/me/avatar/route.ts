import { auth } from "@/auth";
import { avatarImage, rememberDiscordAvatar } from "@/server/avatar";
import { runInBackground } from "@/server/background";
import { withDiscordUid } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's avatar, served from here (`?v=` only versions it) */
export async function GET() {
	const session = await auth();
	const userId = session?.user?.id;
	const src = session?.user?.image;
	if (!userId || !src) return new Response(null, { status: 404 });
	return withDiscordUid(userId, async () => {
		// A Discord session from before Discord avatars were kept fills the gap
		runInBackground(rememberDiscordAvatar(userId, src, { replace: false }));
		const image = await avatarImage(src);
		if (!image)
			return new Response(null, {
				status: 404,
				headers: { "Cache-Control": "no-store" },
			});
		return new Response(new Uint8Array(image.body), {
			headers: {
				"Content-Type": image.type,
				"Cache-Control": "private, max-age=2592000, immutable",
				"X-Content-Type-Options": "nosniff",
			},
		});
	});
}
