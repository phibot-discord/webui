import assert from "node:assert/strict";
import test from "node:test";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogProvider } from "@/i18n/catalog-context";
import { en } from "@/i18n/messages";
import { type ChartFilters, parseChartQuery } from "@/lib/chart-browse-query";
import { ChartBrowser } from "./ChartBrowser";

test("the search box holds no more text than the address keeps", () => {
	const initial: ChartFilters = {
		q: "",
		levels: ["IN", "AT"],
		cMin: "",
		cMax: "",
		tag: "",
		chapter: "",
		status: "all",
		sort: { key: "c", desc: true },
	};
	const browser = createElement(ChartBrowser, {
		view: { songs: [], charts: [], tags: [], chapters: [] },
		mine: null,
		initial,
	});
	const provider: ComponentProps<typeof CatalogProvider> = {
		locale: "en",
		messages: en,
		setLocale: () => {},
		children: null,
	};
	const html = renderToStaticMarkup(
		createElement(
			AppRouterContext.Provider,
			{ value: {} as AppRouterInstance },
			createElement(
				SearchParamsContext.Provider,
				{ value: new URLSearchParams() },
				createElement(CatalogProvider, provider, browser),
			),
		),
	);
	const kept = parseChartQuery(new URLSearchParams(`q=${"x".repeat(500)}`), {
		tags: [],
		chapters: [],
		scores: false,
	}).q.length;
	const input = html.match(/<input [^>]*type="search"[^>]*>/)?.[0] ?? "";
	assert.equal(kept, 100);
	assert.ok(input.includes(` maxLength="${kept}"`), input);
});
