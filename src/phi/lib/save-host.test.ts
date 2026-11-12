import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
	checkSaveUrl,
	fetchSaveFile,
	noteSaveHost,
	resetSaveHostsForTest,
	SAVE_REDIRECTS_REFUSED,
	SAVE_URL_REFUSED,
	saveHostAllowlist,
} from "./save-host";
import { setTapHttpForTest } from "./tapapi";

afterEach(() => {
	setTapHttpForTest();
	resetSaveHostsForTest();
});

type Call = { url: string; init: Record<string, unknown> };

function stub(answer: (n: number) => Response): Call[] {
	const calls: Call[] = [];
	setTapHttpForTest(async (url, init = {}) => {
		calls.push({ url: String(url), init });
		return answer(calls.length);
	});
	return calls;
}

function redirect(location: string): Response {
	return new Response(null, { status: 302, headers: { location } });
}

function verdictOf(url: string, allow: readonly string[]): string {
	const verdict = checkSaveUrl(url, allow);
	return verdict.ok ? "ok" : verdict.reason;
}

test("a save URL passes only as https to a DNS host name on the default port without user info", () => {
	const table: [string, string][] = [
		["https://rak3ffdi.tds1.tapfiles.cn/gamesaves/abc/.save", "ok"],
		["https://cdn.example/save.zip?sign=aaa&t=1", "ok"],
		["https://a.example:443/save", "ok"],
		["http://a.example/save", "not https"],
		["ftp://a.example/save", "not https"],
		["https://user:pw@a.example/save", "user info"],
		["https://user@a.example/save", "user info"],
		["https://a.example:8443/save", "port"],
		["https://127.0.0.1/save", "IP address"],
		["https://127.1/save", "IP address"],
		["https://2130706433/save", "IP address"],
		["https://[::1]/save", "IP address"],
		["https://localhost/save", "localhost"],
		["https://a.localhost/save", "localhost"],
		["https://localhost./save", "localhost"],
		["https://intranet/save", "not a host name"],
		["https://a_b.example/save", "not a host name"],
		["not a url", "not a URL"],
		["", "not a URL"],
	];
	for (const [url, want] of table) assert.equal(verdictOf(url, []), want, url);
});

test("the host allowlist matches whole labels", () => {
	const allow = ["tapfiles.cn"];
	assert.equal(verdictOf("https://rak3ffdi.tds1.tapfiles.cn/x", allow), "ok");
	assert.equal(verdictOf("https://tapfiles.cn/x", allow), "ok");
	assert.equal(verdictOf("https://eviltapfiles.cn/x", allow), "not allowed");
	assert.equal(
		verdictOf("https://tapfiles.cn.evil.example/x", allow),
		"not allowed",
	);
});

test("PHI_SAVE_HOSTS is read as trimmed lowercase suffixes", () => {
	assert.deepEqual(saveHostAllowlist(" .TapFiles.cn , ,qiniup.com. "), [
		"tapfiles.cn",
		"qiniup.com",
	]);
	assert.deepEqual(saveHostAllowlist(""), []);
	assert.deepEqual(saveHostAllowlist(undefined), []);
});

test("each host is recorded once per region", () => {
	assert.equal(noteSaveHost("a.example", "cn"), true);
	assert.equal(noteSaveHost("a.example", "cn"), false);
	assert.equal(noteSaveHost("a.example", "gb"), true);
});

test("a refused save URL is never requested", async () => {
	const calls = stub(() => new Response("zip"));
	await assert.rejects(fetchSaveFile("http://a.example/save", false), {
		message: SAVE_URL_REFUSED,
	});
	assert.equal(calls.length, 0);
});

test("a redirect to a refused host is not followed", async () => {
	const calls = stub(() => redirect("https://127.0.0.1/x"));
	await assert.rejects(fetchSaveFile("https://a.example/save", false), {
		message: SAVE_URL_REFUSED,
	});
	assert.equal(calls.length, 1);
	assert.equal(calls[0]!.init.redirect, "manual");
});

test("allowed redirects are followed, relative locations resolve against the hop, and every hop's host is recorded", async () => {
	const answers = [
		redirect("/next?sig=1"),
		redirect("https://b.example/file"),
		new Response("zip"),
	];
	const calls = stub((n) => answers[n - 1]!);
	const res = await fetchSaveFile("https://a.example/save", false);
	assert.equal(res.status, 200);
	assert.equal(await res.text(), "zip");
	assert.deepEqual(
		calls.map((c) => c.url),
		[
			"https://a.example/save",
			"https://a.example/next?sig=1",
			"https://b.example/file",
		],
	);
	assert.equal(noteSaveHost("b.example", "cn"), false);
});

test("redirects stop after three hops", async () => {
	const calls = stub(() => redirect("/again"));
	await assert.rejects(fetchSaveFile("https://a.example/save", false), {
		message: SAVE_REDIRECTS_REFUSED,
	});
	assert.equal(calls.length, 4);
});

test("PHI_SAVE_HOSTS turns on the allowlist", async () => {
	const before = process.env.PHI_SAVE_HOSTS;
	process.env.PHI_SAVE_HOSTS = "tapfiles.cn";
	try {
		const calls = stub(() => new Response("zip"));
		await assert.rejects(fetchSaveFile("https://cdn.example/save.zip", true), {
			message: SAVE_URL_REFUSED,
		});
		assert.equal(calls.length, 0);
		assert.equal(
			checkSaveUrl("https://rak3ffdi.tds1.tapfiles.cn/a.save").ok,
			true,
		);
	} finally {
		if (before === undefined) delete process.env.PHI_SAVE_HOSTS;
		else process.env.PHI_SAVE_HOSTS = before;
	}
});
