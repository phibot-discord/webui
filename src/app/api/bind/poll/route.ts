import { sessionUserId } from "@/auth";
import { catalogs, getRequestLocale } from "@/i18n/server";
import { pollQrBind } from "@/server/bind";
import { localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");

	const result = await pollQrBind(userId);
	if ("error" in result) {
		if (result.detail) {
			const locale = await getRequestLocale();
			const message = catalogs[locale].errors[result.error];
			return Response.json(
				{ error: `${message} ${result.detail}`, code: result.error },
				{ status: result.status },
			);
		}
		return localizedError(result.status, result.error);
	}
	if ("status" in result) return Response.json(result);
	return Response.json({ status: "bound", ...result });
}
