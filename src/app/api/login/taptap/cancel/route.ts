import {
	isSecureRequest,
	tapLoginClearCookie,
	tapLoginIdFrom,
} from "@/server/auth-tickets";
import { clearTapLogin } from "@/server/tap-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const loginId = tapLoginIdFrom(request.headers);
	if (loginId) await clearTapLogin(loginId);
	const res = Response.json({ ok: true });
	res.headers.append(
		"Set-Cookie",
		tapLoginClearCookie(isSecureRequest(request.headers, request.url)),
	);
	return res;
}
