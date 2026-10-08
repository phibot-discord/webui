import { variant as b19Portrait } from "./b19-portrait";
import { variant as b19Table } from "./b19-table";
import { variant as infoClassic } from "./info-classic";
import { variant as infoPortrait } from "./info-portrait";
import { variant as infoTable } from "./info-table";
import { variant as song } from "./song";
import type { CardVariant } from "./types";
import { variant as updateSummary } from "./update-summary";
import { variant as updateTimeline } from "./update-timeline";

export type { CardData, CardVariant, VariantContext } from "./types";

const VARIANTS: CardVariant[] = [
	b19Table,
	b19Portrait,
	updateTimeline,
	updateSummary,
	song,
	infoClassic,
	infoTable,
	infoPortrait,
];

const byTpl = new Map(VARIANTS.map((v) => [v.tpl, v]));

export function cardVariant(tpl: string): CardVariant | undefined {
	return byTpl.get(tpl);
}
