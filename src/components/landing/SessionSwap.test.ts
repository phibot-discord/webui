import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionSwap, usePrefetchOff } from "./SessionSwap";

function Probe({ id }: { id: string }) {
	return createElement("p", null, `${id} ${usePrefetchOff()}`);
}

const OUT = createElement(Probe, { id: "out" });
const IN = createElement(Probe, { id: "in" });

test("without live the signed-out version renders alone", () => {
	const html = renderToStaticMarkup(
		createElement(SessionSwap, {
			live: false,
			className: "x",
			signedOut: OUT,
			signedIn: IN,
		}),
	);
	assert.equal(html, "<p>out false</p>");
});

test("the static page shows the signed-out version, keeps the signed-in one hidden in the same cell, and stops both from prefetching", () => {
	const html = renderToStaticMarkup(
		createElement(SessionSwap, {
			live: true,
			className: "x",
			signedOut: OUT,
			signedIn: IN,
		}),
	);
	assert.equal(
		html,
		'<div class="session-swap x"><div class="session-pane"><p>out true</p></div><div class="session-pane" data-off="true" inert=""><p>in true</p></div></div>',
	);
});
