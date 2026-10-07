import assert from "node:assert/strict";
import test from "node:test";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { en } from "@/i18n/messages";
import { I18nProvider } from "@/i18n/provider";
import { ChartSearch, comboboxKey } from "./ChartSearch";

const OPEN = { expanded: true, active: 1, count: 4, hasQuery: true };
const CLOSED = { expanded: false, active: -1, count: 4, hasQuery: true };

test("arrow keys open the list and wrap around the options", () => {
	assert.deepEqual(comboboxKey("ArrowDown", false, CLOSED), {
		open: true,
		active: 0,
	});
	assert.deepEqual(comboboxKey("ArrowDown", true, CLOSED), {
		open: true,
		active: -1,
	});
	assert.deepEqual(comboboxKey("ArrowUp", false, CLOSED), {
		open: true,
		active: 3,
	});
	assert.deepEqual(comboboxKey("ArrowDown", false, OPEN), { active: 2 });
	assert.deepEqual(comboboxKey("ArrowDown", false, { ...OPEN, active: 3 }), {
		active: 0,
	});
	assert.deepEqual(comboboxKey("ArrowUp", false, { ...OPEN, active: 0 }), {
		active: 3,
	});
	assert.deepEqual(comboboxKey("ArrowDown", true, OPEN), {});
});

test("Home, End and Enter act only on an active option", () => {
	assert.deepEqual(comboboxKey("Home", false, OPEN), { active: 0 });
	assert.deepEqual(comboboxKey("End", false, OPEN), { active: 3 });
	assert.deepEqual(comboboxKey("Enter", false, OPEN), { pick: true });
	const none = { ...OPEN, active: -1 };
	assert.equal(comboboxKey("Home", false, none), undefined);
	assert.equal(comboboxKey("Enter", false, none), undefined);
	assert.equal(comboboxKey("Enter", false, CLOSED), undefined);
});

test("Escape closes first, then clears", () => {
	assert.deepEqual(comboboxKey("Escape", false, OPEN), {
		open: false,
		active: -1,
	});
	assert.deepEqual(comboboxKey("Escape", false, CLOSED), { clear: true });
	assert.equal(
		comboboxKey("Escape", false, { ...CLOSED, hasQuery: false }),
		undefined,
	);
});

test("Tab closes the list and still moves focus", () => {
	assert.deepEqual(comboboxKey("Tab", false, OPEN), {
		open: false,
		active: -1,
		keepDefault: true,
	});
	assert.equal(comboboxKey("a", false, OPEN), undefined);
});

test("the listbox is not a Tab stop and is wired to the input", () => {
	const search = createElement(ChartSearch, {
		catalog: { status: "ready", list: [] },
		placeholder: "Song",
		onPick: () => {},
	});
	// children come in as the third argument
	const provider = { locale: "en", m: en } as ComponentProps<
		typeof I18nProvider
	>;
	const html = renderToStaticMarkup(
		createElement(
			AppRouterContext.Provider,
			{ value: {} as AppRouterInstance },
			createElement(I18nProvider, provider, search),
		),
	);
	const list = html.match(/<ul [^>]*>/)?.[0] ?? "";
	assert.match(list, /role="listbox"/);
	assert.match(list, /tabindex="-1"/);
	const id = list.match(/id="([^"]+)"/)?.[1];
	assert.ok(id);
	const input = html.match(/<input [^>]*>/)?.[0] ?? "";
	assert.match(input, /role="combobox"/);
	assert.ok(input.includes(`aria-controls="${id}"`));
	assert.match(input, /aria-label="Search songs"/);
});
