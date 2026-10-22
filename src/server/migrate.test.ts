import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import JSZip from "jszip";
import { SAVE_ENTRIES } from "@/phi/lib/cloud-save";
import { kvKey } from "@/phi/lib/const";
import { resetSaveBlobMemForTest } from "@/phi/lib/saves";
import { setTapHttpForTest } from "@/phi/lib/tapapi";
import {
	boundAsFrom,
	connectMigrateToken,
	type MigratePreview,
	runMigrate,
	type SlotReady,
} from "./migrate";

const GB_A = "gbA".padEnd(25, "0");
const GB_B = "gbB".padEnd(25, "0");
const CN_A = "cnA".padEnd(25, "0");
const CN_A2 = "cnA2".padEnd(25, "0");
const CN_B = "cnB".padEnd(25, "0");
const GB = "https://kviehlel.cloud.ap-sg.tapapis.com/1.1";
const CN = "https://rak3ffdi.cloud.tds1.tapapis.cn/1.1";
const FILES = "https://files.example.com/saves";

function summary(rank: number, rks: number, gameVersion: number): string {
	const b = Buffer.alloc(1 + 2 + 4 + 1 + 1 + 24);
	b[0] = 6;
	b.writeUInt16LE(rank, 1);
	b.writeFloatLE(rks, 3);
	b[7] = gameVersion;
	b[8] = 0;
	return b.toString("base64");
}

const GB_SUMMARY = summary(548, 15.25, 120);
const CN_SUMMARY = summary(312, 12.5, 118);

type Row = {
	objectId: string;
	summary: string;
	modifiedAt: { iso: string };
	gameFile: { objectId: string; url: string };
};
type Account = { userId: string; nickname: string; rows: Row[] };
type Server = "cn" | "gb";

const kv = new Map<string, string>();
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) kv.delete(k);
		return keys.length;
	},
	keys: async () => [...kv.keys()],
};
const store = {
	...db,
	set: async (key: string, value: string, opts?: { nx?: boolean }) => {
		if (opts?.nx && kv.has(key)) return null;
		kv.set(key, value);
		return "OK";
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store,
	rt: {
		store: {
			getSessionToken: (userId: string) => db.get(kvKey("userToken", userId)),
		},
	},
	lib: {},
});

let cloud: Record<Server, Map<string, Account>>;
let files: Map<string, Buffer>;
let calls: { method: string; url: string; body?: unknown }[] = [];
let gbZip: Buffer;
let cnZip: Buffer;
let writeStatus = 200;
let ignoreWrites = false;
let seq = 0;

function row(id: string, sum: string, file: string, iso: string): Row {
	return {
		objectId: id,
		summary: sum,
		modifiedAt: { iso },
		gameFile: { objectId: file, url: `${FILES}/${file}` },
	};
}

function bind(userId: string, token: string, global?: boolean) {
	kv.set(kvKey("userToken", userId), token);
	kv.set(
		kvKey("save", token),
		JSON.stringify({ session: token, global, saveInfo: {} }),
	);
}

function ok<T extends object>(result: T): Exclude<T, { error: unknown }> {
	assert.ok(!("error" in result), JSON.stringify(result));
	return result as Exclude<T, { error: unknown }>;
}

function previewOf(result: SlotReady | { error: string }): MigratePreview {
	const ready = ok(result);
	assert.ok(ready.preview, "To comes with a preview");
	return ready.preview;
}

function undoOf(userId: string, server: Server, account: string) {
	const raw = kv.get(kvKey("webMigrateUndo", userId, server, account));
	assert.ok(raw, "undo record kept");
	return JSON.parse(raw) as Record<string, unknown>;
}

function saveWrites() {
	return calls.filter(
		(c) => c.method !== "GET" && c.url.includes("/classes/_GameSave"),
	);
}

async function zipOf(tag: string) {
	const zip = new JSZip();
	for (const name of SAVE_ENTRIES)
		zip.file(name, Buffer.from(`${tag}:${name}`));
	return zip.generateAsync({ type: "nodebuffer" });
}

beforeEach(async () => {
	kv.clear();
	resetSaveBlobMemForTest();
	calls = [];
	writeStatus = 200;
	ignoreWrites = false;
	seq = 0;
	gbZip = await zipOf("gb");
	cnZip = await zipOf("cn");
	files = new Map([
		["gbFile", gbZip],
		["cnOldFile", cnZip],
		["cnAFile", cnZip],
	]);
	const gbA: Account = {
		userId: "gbUserA",
		nickname: "GB Player",
		rows: [row("gbRowA", GB_SUMMARY, "gbFile", "2026-10-20T00:00:00.000Z")],
	};
	const cnA: Account = {
		userId: "cnUserA",
		nickname: "CN Source",
		rows: [row("cnRowA", CN_SUMMARY, "cnAFile", "2026-09-01T00:00:00.000Z")],
	};
	cloud = {
		gb: new Map([
			[GB_A, gbA],
			[GB_B, { userId: "gbUserB", nickname: "GB Empty", rows: [] }],
		]),
		cn: new Map([
			[CN_A, cnA],
			[CN_A2, cnA],
			[
				CN_B,
				{
					userId: "cnUserB",
					nickname: "CN Player",
					rows: [
						row("cnRowB", CN_SUMMARY, "cnOldFile", "2026-05-01T00:00:00.000Z"),
					],
				},
			],
		]),
	};
	let pendingFile = "";
	setTapHttpForTest(async (url, init = {}) => {
		const u = new URL(String(url));
		const method = String(init.method ?? "GET");
		calls.push({ method, url: u.href, body: init.body });
		const json = (v: unknown, status = 200) =>
			new Response(JSON.stringify(v), { status });
		const server: Server | undefined = u.href.startsWith(`${CN}/`)
			? "cn"
			: u.href.startsWith(`${GB}/`)
				? "gb"
				: undefined;
		if (server) {
			const path = u.href.slice((server === "cn" ? CN : GB).length);
			const session = (init.headers as Record<string, string>)["X-LC-Session"];
			const account = cloud[server].get(session ?? "");
			if (!account)
				return json({ code: 211, error: "Could not find user." }, 400);
			if (path === "/users/me")
				return json({ objectId: account.userId, nickname: account.nickname });
			if (path.startsWith("/gamesaves/?") && method === "GET")
				return json({ results: account.rows });
			if (path === "/fileTokens") {
				pendingFile = `newFile${++seq}`;
				return json({
					objectId: pendingFile,
					token: "up",
					key: `gamesaves/${pendingFile}/.save`,
					bucket: "bkt",
					upload_url: "https://upload.qiniup.com",
					provider: "qiniu",
				});
			}
			if (path === "/fileCallback") return json({});
			if (path.startsWith("/classes/_GameSave")) {
				if (writeStatus !== 200) return json({ error: "down" }, writeStatus);
				const sent = JSON.parse(String(init.body)) as {
					summary: string;
					modifiedAt: { iso: string };
					gameFile: { objectId: string };
				};
				const next = (id: string) =>
					row(id, sent.summary, sent.gameFile.objectId, sent.modifiedAt.iso);
				if (method === "POST" && path === "/classes/_GameSave") {
					const id = `newRow${++seq}`;
					if (!ignoreWrites) account.rows.push(next(id));
					return json({ objectId: id }, 201);
				}
				const id = path.slice("/classes/_GameSave/".length);
				const at = account.rows.findIndex((r) => r.objectId === id);
				if (method === "PUT" && at >= 0) {
					if (!ignoreWrites) account.rows[at] = next(id);
					return json({ updatedAt: sent.modifiedAt.iso });
				}
			}
		}
		if (u.hostname === "upload.qiniup.com") {
			if (method === "PUT") {
				files.set(pendingFile, Buffer.from(init.body as Uint8Array));
				return json({ etag: "e1" });
			}
			if (u.pathname.endsWith("/uploads")) return json({ uploadId: "u1" });
			return json({});
		}
		if (u.href.startsWith(`${FILES}/`)) {
			const bytes = files.get(u.pathname.split("/").at(-1) ?? "");
			if (bytes) return new Response(new Uint8Array(bytes));
		}
		return json({ error: `unexpected ${method} ${u.href}` }, 404);
	});
});

afterEach(() => setTapHttpForTest());

test("the bound Global save replaces a CN account's save", async () => {
	bind("u1", GB_A, true);
	const from = ok(await boundAsFrom("u1"));
	assert.equal(from.side.server, "gb");
	assert.equal(from.side.player, "GB Player");
	assert.equal(from.side.rks, 15.25);
	assert.equal(from.side.challengeModeRank, 548);
	assert.equal(from.preview, undefined);

	const ready = await connectMigrateToken("u1", "to", CN_B, "cn");
	const view = previewOf(ready);
	assert.equal(view.from.player, "GB Player");
	assert.equal(view.to.server, "cn");
	assert.equal(view.to.player, "CN Player");
	assert.equal(view.to.hasSave, true);
	assert.equal(view.to.challengeModeRank, 312);
	assert.equal(view.newer, true);
	assert.equal(view.toIsBound, false);
	assert.deepEqual(ok(ready).side, view.to);
	for (const token of [GB_A, CN_B])
		assert.ok(
			!JSON.stringify([from, ready]).includes(token),
			"tokens stay server-side",
		);

	const done = ok(await runMigrate("u1"));
	assert.equal(done.status, "done");
	assert.equal(done.to.server, "cn");
	assert.equal(done.to.rks, 15.25);
	assert.equal(done.toIsBound, false);
	const writes = saveWrites();
	assert.deepEqual(
		writes.map((c) => `${c.method} ${c.url}`),
		[`PUT ${CN}/classes/_GameSave/cnRowB`],
	);
	const sent = JSON.parse(String(writes[0]?.body)) as Record<string, unknown>;
	assert.equal(sent.summary, GB_SUMMARY);
	assert.deepEqual(sent.user, {
		__type: "Pointer",
		className: "_User",
		objectId: "cnUserB",
	});
	const part = calls.find(
		(c) => c.method === "PUT" && c.url.includes("qiniup.com"),
	);
	assert.deepEqual(Buffer.from(part?.body as Uint8Array), gbZip);
	assert.ok(
		!calls.some((c) => c.method !== "GET" && c.url.startsWith(GB)),
		"Global is only read",
	);
	const undo = undoOf("u1", "cn", "cnUserB");
	assert.equal(undo.row, "cnRowB");
	assert.equal(undo.gameFile, "cnOldFile");
	assert.equal(undo.summary, CN_SUMMARY);
	assert.equal(kv.has(kvKey("webMigrate", "u1")), false, "tokens dropped");
	assert.equal(kv.has(kvKey("webMigrateLock", "u1")), false);
});

test("a bound save without a region is tried on CN, then Global", async () => {
	bind("u1b", GB_A);
	const from = ok(await boundAsFrom("u1b"));
	assert.equal(from.side.server, "gb");
	assert.ok(calls.some((c) => c.url === `${CN}/users/me`));
});

test("boundAsFrom needs a bound account", async () => {
	assert.deepEqual(await boundAsFrom("nobody"), {
		error: "not_bound",
		status: 409,
	});
});

test("another account as From, and a To with no save gets a new row", async () => {
	bind("u2", GB_A, true);
	const from = ok(await connectMigrateToken("u2", "from", CN_A, "cn"));
	assert.equal(from.side.server, "cn");
	assert.equal(from.side.player, "CN Source");

	const view = previewOf(await connectMigrateToken("u2", "to", GB_B, "gb"));
	assert.equal(view.from.server, "cn");
	assert.equal(view.to.server, "gb");
	assert.equal(view.to.hasSave, false);
	assert.equal(view.to.modifiedAt, undefined);
	assert.equal(view.newer, false);

	const done = ok(await runMigrate("u2"));
	assert.equal(done.to.hasSave, true);
	assert.equal(done.to.rks, 12.5);
	assert.deepEqual(
		saveWrites().map((c) => `${c.method} ${c.url}`),
		[`POST ${GB}/classes/_GameSave`],
	);
	const made = cloud.gb.get(GB_B)?.rows ?? [];
	assert.equal(made.length, 1);
	assert.equal(made[0]?.summary, CN_SUMMARY);
	assert.deepEqual(files.get(made[0]?.gameFile.objectId ?? ""), cnZip);
	const undo = undoOf("u2", "gb", "gbUserB");
	assert.equal(undo.row, null);
	assert.equal(undo.gameFile, undefined);
});

test("the bound account as To is flagged", async () => {
	bind("u2b", GB_A, true);
	ok(await connectMigrateToken("u2b", "from", CN_A, "cn"));
	const view = previewOf(await connectMigrateToken("u2b", "to", GB_A, "gb"));
	assert.equal(view.toIsBound, true);
	assert.equal(ok(await runMigrate("u2b")).toIsBound, true);
});

test("the same account on both sides is refused", async () => {
	ok(await connectMigrateToken("u3", "from", CN_A, "cn"));
	assert.deepEqual(await connectMigrateToken("u3", "to", CN_A2, "cn"), {
		error: "migrate_same_account",
		status: 409,
	});
	assert.deepEqual(await runMigrate("u3"), {
		error: "migrate_expired",
		status: 410,
	});
});

test("a session the picked server does not know is rejected", async () => {
	assert.deepEqual(await connectMigrateToken("u4", "from", CN_A, "gb"), {
		error: "migrate_rejected",
		status: 400,
	});
	ok(await connectMigrateToken("u4", "from", CN_A, "cn"));
	assert.deepEqual(await connectMigrateToken("u4", "to", CN_B, "gb"), {
		error: "migrate_rejected",
		status: 400,
	});
	assert.equal(saveWrites().length, 0);
});

test("a From account without a cloud save is refused", async () => {
	assert.deepEqual(await connectMigrateToken("u5", "from", GB_B, "gb"), {
		error: "migrate_no_source_save",
		status: 409,
	});
	assert.equal(kv.has(kvKey("webMigrate", "u5")), false);
});

test("connecting From again drops the To sign-in", async () => {
	ok(await connectMigrateToken("u5b", "from", GB_A, "gb"));
	previewOf(await connectMigrateToken("u5b", "to", CN_B, "cn"));
	ok(await connectMigrateToken("u5b", "from", CN_A, "cn"));
	assert.deepEqual(await runMigrate("u5b"), {
		error: "migrate_expired",
		status: 410,
	});
});

test("a To save that changed after the preview is not overwritten", async () => {
	ok(await connectMigrateToken("u6", "from", GB_A, "gb"));
	previewOf(await connectMigrateToken("u6", "to", CN_B, "cn"));
	const target = cloud.cn.get(CN_B)?.rows[0];
	assert.ok(target);
	target.modifiedAt = { iso: "2026-10-21T00:00:00.000Z" };

	const changed = await runMigrate("u6");
	assert.ok("error" in changed && changed.error === "migrate_changed");
	assert.equal(changed.preview?.to.modifiedAt, "2026-10-21T00:00:00.000Z");
	assert.ok(!calls.some((c) => c.url.includes("/fileTokens")));
	assert.equal(ok(await runMigrate("u6")).status, "done");
});

test("a row that appears on a To without a save is not overwritten", async () => {
	ok(await connectMigrateToken("u7", "from", CN_A, "cn"));
	const view = previewOf(await connectMigrateToken("u7", "to", GB_B, "gb"));
	assert.equal(view.to.hasSave, false);
	cloud.gb
		.get(GB_B)
		?.rows.push(
			row("gbRowB", GB_SUMMARY, "gbFile", "2026-10-21T00:00:00.000Z"),
		);

	const changed = await runMigrate("u7");
	assert.ok("error" in changed && changed.error === "migrate_changed");
	assert.equal(changed.preview?.to.hasSave, true);
	assert.ok(!calls.some((c) => c.url.includes("/fileTokens")));
	assert.equal(saveWrites().length, 0);

	assert.equal(ok(await runMigrate("u7")).status, "done");
	assert.deepEqual(
		saveWrites().map((c) => `${c.method} ${c.url}`),
		[`PUT ${GB}/classes/_GameSave/gbRowB`],
	);
});

test("the undo record keeps the To save from before the first copy", async () => {
	ok(await connectMigrateToken("u8", "from", GB_A, "gb"));
	previewOf(await connectMigrateToken("u8", "to", CN_B, "cn"));
	ok(await runMigrate("u8"));
	const first = undoOf("u8", "cn", "cnUserB");
	assert.equal(first.gameFile, "cnOldFile");

	ok(await connectMigrateToken("u8", "from", GB_A, "gb"));
	const again = previewOf(await connectMigrateToken("u8", "to", CN_B, "cn"));
	assert.equal(again.to.rks, 15.25);
	ok(await runMigrate("u8"));
	assert.equal(saveWrites().length, 2);
	assert.deepEqual(undoOf("u8", "cn", "cnUserB"), first);
});

test("a save write with no answer is unverified", async () => {
	ok(await connectMigrateToken("u9", "from", GB_A, "gb"));
	previewOf(await connectMigrateToken("u9", "to", CN_B, "cn"));
	writeStatus = 503;
	const result = await runMigrate("u9");
	assert.ok("error" in result && result.error === "migrate_unverified");
	assert.equal(result.status, 502);
	assert.equal(saveWrites().length, 1);
	assert.ok(kv.has(kvKey("webMigrateUndo", "u9", "cn", "cnUserB")));
	assert.equal(kv.has(kvKey("webMigrateLock", "u9")), false);
});

test("a save the re-read does not show is unverified", async () => {
	ok(await connectMigrateToken("u10", "from", CN_A, "cn"));
	previewOf(await connectMigrateToken("u10", "to", GB_B, "gb"));
	ignoreWrites = true;
	const result = await runMigrate("u10");
	assert.ok("error" in result && result.error === "migrate_unverified");
	assert.match(result.detail ?? "", /does not point at the upload/);
	assert.ok(kv.has(kvKey("webMigrate", "u10")), "sign-ins kept");
});

test("one copy runs at a time", async () => {
	ok(await connectMigrateToken("u11", "from", GB_A, "gb"));
	previewOf(await connectMigrateToken("u11", "to", CN_B, "cn"));
	kv.set(kvKey("webMigrateLock", "u11"), "1");
	assert.deepEqual(await runMigrate("u11"), {
		error: "migrate_busy",
		status: 409,
	});
});
