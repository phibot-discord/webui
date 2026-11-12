import assert from "node:assert/strict";
import test from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { CARD_PROGRESS_HEADER } from "@/lib/card-progress";
import { GET } from "./route";

test("a render that throws answers with the localized text, never the exception message", async () => {
	const failing = Promise.reject(new Error("ENOENT /srv/secret/x"));
	failing.catch(() => undefined);
	(globalThis as Record<string, unknown>).__phiDataHost = failing;
	setSessionForTest("u1");
	setRequestLocaleForTest("en");
	try {
		const res = await GET(
			new Request("http://localhost/api/card/b30", {
				headers: { [CARD_PROGRESS_HEADER]: "1" },
			}),
			{ params: Promise.resolve({ kind: "b30" }) },
		);
		assert.equal(res.status, 500);
		const text = await res.text();
		assert.doesNotMatch(text, /secret/);
		assert.deepEqual(JSON.parse(text), {
			error: "Could not render this card.",
			code: "render_failed",
		});
	} finally {
		delete (globalThis as Record<string, unknown>).__phiDataHost;
		setSessionForTest();
		setRequestLocaleForTest();
	}
});

test("an unknown card kind is refused with a sentence in every language", async () => {
	setSessionForTest("u1");
	try {
		for (const [locale, error] of [
			["en", "This card is not available."],
			["zh", "这张成绩图不可用"],
			["ja", "このカードは利用できません。"],
		] as const) {
			setRequestLocaleForTest(locale);
			const res = await GET(new Request("http://localhost/api/card/nope"), {
				params: Promise.resolve({ kind: "nope" }),
			});
			assert.equal(res.status, 404);
			assert.deepEqual(await res.json(), { error, code: "unknown_card" });
		}
	} finally {
		setSessionForTest();
		setRequestLocaleForTest();
	}
});
