import { sessionUserId } from "@/auth";
import { localizedError } from "./i18n-http";
import { withDiscordUid } from "./logger";

export async function authed(
	fn: (userId: string) => Response | Promise<Response>,
): Promise<Response> {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	return await withDiscordUid(userId, () => fn(userId));
}
