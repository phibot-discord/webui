import assert from "node:assert/strict";
import test from "node:test";
import { redirect } from "next/navigation";
import { isRedirectSignal } from "./redirect-signal";

test("only Next's redirect signal counts as a redirect", () => {
	assert.equal(
		isRedirectSignal(
			Object.assign(new Error("NEXT_REDIRECT"), {
				digest: "NEXT_REDIRECT;push;/zh;303;",
			}),
		),
		true,
	);
	assert.equal(isRedirectSignal(new Error("boom")), false);
	assert.equal(
		isRedirectSignal(
			Object.assign(new Error("x"), {
				digest: "NEXT_HTTP_ERROR_FALLBACK;404",
			}),
		),
		false,
	);
	assert.equal(isRedirectSignal({ digest: 7 }), false);
	assert.equal(isRedirectSignal(null), false);
	assert.equal(isRedirectSignal("NEXT_REDIRECT"), false);
	let caught: unknown;
	try {
		redirect("/x");
	} catch (err) {
		caught = err;
	}
	assert.equal(isRedirectSignal(caught), true);
});
