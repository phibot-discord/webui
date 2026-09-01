export function safeNext(v: string | undefined | null): string {
	if (!v) return "/me";
	if (!v.startsWith("/") || v.startsWith("//")) return "/me";
	if (v.includes("://") || v.includes("\\")) return "/me";
	return v;
}
