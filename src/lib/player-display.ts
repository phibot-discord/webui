export function displayPlayerId(raw: unknown): string {
	return String(raw || "player")
		.replace(/<[^>]+>/g, "")
		.trim();
}

export function displayRks(rks: unknown): string {
	return typeof rks === "number" ? rks.toFixed(4) : "-";
}
