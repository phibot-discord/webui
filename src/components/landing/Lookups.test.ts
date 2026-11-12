import assert from "node:assert/strict";
import test from "node:test";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogProvider } from "@/i18n/catalog-context";
import { en } from "@/i18n/messages";
import { LandingLookups } from "./Lookups";

function render(live: boolean): string {
	const provider: ComponentProps<typeof CatalogProvider> = {
		locale: "en",
		messages: en,
		setLocale: () => {},
		children: null,
	};
	return renderToStaticMarkup(
		createElement(
			AppRouterContext.Provider,
			{ value: {} as AppRouterInstance },
			createElement(
				CatalogProvider,
				provider,
				createElement(LandingLookups, { live }),
			),
		),
	);
}

test("the landing page's lookups keep today's signed-out markup", () => {
	const html = render(false);
	assert.ok(!html.includes("session-swap"));
	assert.ok(html.includes(en.home.lookupsSignedOut));
	assert.ok(!html.includes(en.home.lookupsSignedIn));
});

test("the home page's lookups carry both intros, the signed-in one hidden", () => {
	const html = render(true);
	assert.ok(html.includes('class="session-swap intro-swap"'));
	assert.ok(html.includes(en.home.lookupsSignedOut));
	assert.ok(
		html.includes(
			`<div class="session-pane" data-off="true" inert=""><p class="section-intro">${en.home.lookupsSignedIn}</p>`,
		),
	);
});
