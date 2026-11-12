export function isRedirectSignal(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const digest = (err as { digest?: unknown }).digest;
	return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
