import type { CardKind } from "@/server/card-kinds";
import type { PhiLocale } from "../card-i18n";
import type { Catalog } from "../catalog";
import type { PhiRuntime } from "../runtime";

export type CardData = Record<string, unknown>;

export type VariantContext = {
	kind: CardKind;
	locale: PhiLocale;
	catalog: Catalog;
	rt?: PhiRuntime;
};

export type CardVariant = {
	tpl: string;
	width: number;
	maxRatio?: number;
	prepare?: (
		data: CardData,
		ctx: VariantContext,
	) => CardData | Promise<CardData>;
};
