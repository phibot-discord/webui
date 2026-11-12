import assert from "node:assert/strict";
import test from "node:test";
import { sessionUserId, setSessionForTest } from "@/auth";
import { getRequestLocale, setRequestLocaleForTest } from "@/i18n/server";

test("the seams do nothing without the test flag", async () => {
	delete process.env.PHI_TEST_SEAMS;
	try {
		setSessionForTest("u1");
		setRequestLocaleForTest("ja");
		assert.notEqual(await sessionUserId().catch(() => "threw"), "u1");
		assert.notEqual(await getRequestLocale().catch(() => "threw"), "ja");
	} finally {
		process.env.PHI_TEST_SEAMS = "1";
	}
});
