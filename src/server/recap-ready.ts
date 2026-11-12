import { REVIEW_YEAR } from "@/lib/review-window";
import { wrappedOf } from "@/lib/wrapped";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";
import { catalogLookup } from "./snapshot";

export function hasRecap(
	history: Pick<SaveHistory, "rks" | "scoreHistory">,
	list: readonly ChartSummary[],
	year = REVIEW_YEAR,
): boolean {
	const { constantOf } = catalogLookup(list);
	return (
		wrappedOf({
			year,
			rks: history.rks,
			history: history.scoreHistory,
			constantOf,
		}).status === "ok"
	);
}
