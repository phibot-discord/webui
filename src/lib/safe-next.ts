export const ASKED_PARAM = "asked";

export function bounced(params: { next?: unknown; asked?: unknown }): boolean {
	return params.next !== undefined && params.asked === undefined;
}

export function safeNext(v: unknown): string {
	if (typeof v !== "string" || !v) return "/me";
	if (!v.startsWith("/") || v.startsWith("//")) return "/me";
	if (v.includes("://") || v.includes("\\")) return "/me";
	for (let i = 0; i < v.length; i++) {
		const c = v.charCodeAt(i);
		if (c < 0x20 || c === 0x7f) return "/me";
	}
	try {
		const u = new URL(v, "http://n");
		if (u.origin !== "http://n" || u.pathname.startsWith("//")) return "/me";
	} catch {
		return "/me";
	}
	return v;
}
