const SESSION_COOKIE =
	/^(?:__Secure-|__Host-)?authjs\.session-token(?:\.\d+)?$/;

export function servesStaticLanding(req: {
	method: string;
	bare: string;
	search: URLSearchParams;
	cookies: Iterable<string>;
}): boolean {
	if (req.method !== "GET" && req.method !== "HEAD") return false;
	if (req.bare !== "/") return false;
	for (const key of req.search.keys()) if (key !== "_rsc") return false;
	for (const name of req.cookies) if (SESSION_COOKIE.test(name)) return false;
	return true;
}
