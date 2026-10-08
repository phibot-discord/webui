import {
	isSecureRequest,
	tapLoginIdFrom,
	tapLoginSetCookie,
} from "@/server/auth-tickets";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { clearTapLogin, newLoginId, startTapLogin } from "@/server/tap-login";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
	const limited = rateLimit({ ip: clientIp(request.headers) });
	if (!limited.ok) return localizedError(429, "rate_limit");

	const body = (await request.json().catch(() => ({}))) as {
		server?: string;
		global?: boolean;
	};
	const previous = tapLoginIdFrom(request.headers);
	const loginId = newLoginId();
	const res = tapWaitNdjson(
		"-",
		async () => {
			if (previous) await clearTapLogin(previous);
			const result = await startTapLogin(loginId, body.server, body.global);
			if ("error" in result) return localizedErrorBody(result);
			return result;
		},
		{ error: "bind_failed", code: "bind_failed", status: 502 },
	);
	res.headers.append(
		"Set-Cookie",
		tapLoginSetCookie(loginId, isSecureRequest(request.headers, request.url)),
	);
	return res;
}
