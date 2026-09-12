import assert from "node:assert/strict";
import test from "node:test";
import { cardFetchUrl, cooldownMsFromServer } from "./save-refresh";

test("cooldownMsFromServer prefers JSON cooldownMs from the backend", () => {
	assert.equal(cooldownMsFromServer({ cooldownMs: 12_500 }), 12_500);
});

test("cooldownMsFromServer uses retryAfter seconds from JSON or the header", () => {
	assert.equal(cooldownMsFromServer({ retryAfter: 9 }), 9_000);
	assert.equal(
		cooldownMsFromServer({}, new Headers({ "retry-after": "42" })),
		42_000,
	);
});

test("cooldownMsFromServer does not invent a frontend duration", () => {
	assert.equal(cooldownMsFromServer({}), 0);
	assert.equal(cooldownMsFromServer({ cooldownMs: -1 }), 0);
});

test("card fetch URL includes locale and reload so a switch is not a cache hit", () => {
	const src = "/api/card/b30?count=33&locale=zh&quality=fast&tags=1";
	assert.equal(
		cardFetchUrl(src, { locale: "zh", _: "99" }),
		"/api/card/b30?count=33&locale=zh&quality=fast&tags=1&_=99",
	);
	assert.equal(cardFetchUrl(src, { locale: "zh" }), src);
	assert.notEqual(
		cardFetchUrl("/api/card/b30?count=33", { locale: "en" }),
		cardFetchUrl("/api/card/b30?count=33", { locale: "zh" }),
	);
	assert.notEqual(
		cardFetchUrl("/api/card/b30?count=33", { tags: "1" }),
		cardFetchUrl("/api/card/b30?count=33", { tags: "0" }),
	);
});
