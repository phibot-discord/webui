export type ChartStatus = "ap" | "fc" | "clear" | "played" | "none";

export const STATUS_ORDER: ChartStatus[] = [
	"ap",
	"fc",
	"clear",
	"played",
	"none",
];

export function chartStatus(
	rec: { score: number; fc: boolean } | null | undefined,
): ChartStatus {
	if (!rec || !(rec.score > 0)) return "none";
	if (rec.score >= 1_000_000) return "ap";
	if (rec.fc) return "fc";
	if (rec.score >= 700_000) return "clear";
	return "played";
}
