import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import {
	checkSaveZip,
	latestRow,
	md5Hex,
	qiniuObjectName,
	readCloudSave,
	SAVE_ENTRIES,
	uploadCloudSave,
	verifyCloudSave,
} from "./cloud-save";
import { setTapHttpForTest } from "./tapapi";

const CN = "https://rak3ffdi.cloud.tds1.tapapis.cn/1.1";
const KEY = "gamesaves/AbCdEf/.save";
const NEW_URL = "https://rak3ffdi.tds1.tapfiles.cn/gamesaves/AbCdEf/.save";

async function saveZip(skip?: string): Promise<Buffer> {
	const zip = new JSZip();
	for (const name of SAVE_ENTRIES) {
		if (name !== skip) zip.file(name, Buffer.from([1, 2, 3, name.length]));
	}
	return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

type Call = {
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: unknown;
};

type Row = {
	objectId: string;
	summary: string;
	modifiedAt: { iso: string };
	gameFile: { objectId: string; url: string };
};

function fakeCloud(
	zip: Buffer,
	opts: {
		qiniuFails?: boolean;
		host?: string;
		provider?: string;
		noRow?: boolean;
	},
) {
	const calls: Call[] = [];
	let row: Row | undefined = opts.noRow
		? undefined
		: {
				objectId: "row1",
				summary: "old-summary",
				modifiedAt: { iso: "2026-01-01T00:00:00.000Z" },
				gameFile: { objectId: "oldFile", url: "https://x.tapfiles.cn/old" },
			};
	setTapHttpForTest(async (url, init = {}) => {
		const u = new URL(String(url));
		const method = String(init.method ?? "GET");
		const headers = { ...(init.headers as Record<string, string>) };
		const body = init.body;
		calls.push({ method, url: u.href, headers, body });
		const json = (v: unknown, status = 200) =>
			new Response(JSON.stringify(v), { status });
		if (u.href === `${CN}/users/me`)
			return json({ objectId: "cnUser", nickname: "CN Player" });
		if (u.pathname === "/1.1/gamesaves/" && method === "GET")
			return json({ results: row ? [row] : [] });
		if (u.pathname === "/1.1/fileTokens")
			return json({
				objectId: "newFile",
				token: "up-token",
				key: KEY,
				bucket: "bkt",
				upload_url: opts.host ?? "https://upload.qiniup.com",
				provider: opts.provider ?? "qiniu",
			});
		if (u.hostname === "upload.qiniup.com") {
			if (opts.qiniuFails) return json({ error: "bad token" }, 401);
			if (method === "PUT") return json({ etag: "etag-1", md5: "x" });
			if (u.pathname.endsWith("/uploads")) return json({ uploadId: "up/1" });
			return json({ key: KEY, hash: "h" });
		}
		if (u.pathname === "/1.1/fileCallback") return json({});
		if (
			(row &&
				u.pathname === `/1.1/classes/_GameSave/${row.objectId}` &&
				method === "PUT") ||
			(!row && u.pathname === "/1.1/classes/_GameSave" && method === "POST")
		) {
			const sent = JSON.parse(String(body)) as {
				name?: string;
				summary: string;
			};
			if (method === "POST" && !sent.name)
				return json(
					{ code: 142, error: "Field 'name' is required for _GameSave" },
					400,
				);
			row = {
				objectId: row?.objectId ?? "row2",
				summary: sent.summary,
				modifiedAt: { iso: "2026-10-22T00:00:00.000Z" },
				gameFile: { objectId: "newFile", url: NEW_URL },
			};
			return method === "POST"
				? json({ objectId: row.objectId, createdAt: row.modifiedAt.iso }, 201)
				: json({ updatedAt: row.modifiedAt.iso });
		}
		if (u.href === NEW_URL) return new Response(new Uint8Array(zip));
		return json({ error: "unexpected" }, 404);
	});
	return calls;
}

test("Qiniu object names keep base64 padding and are URL-safe", () => {
	assert.equal(qiniuObjectName("a"), "YQ==");
	assert.equal(qiniuObjectName("?>?>"), "Pz4_Pg==");
	assert.equal(qiniuObjectName(">>>"), "Pj4-");
	assert.equal(
		qiniuObjectName(KEY),
		Buffer.from(KEY).toString("base64").replaceAll("/", "_"),
	);
});

test("checkSaveZip wants every member of a game save", async () => {
	await checkSaveZip(await saveZip());
	await assert.rejects(checkSaveZip(await saveZip("gameRecord")), /gameRecord/);
	await assert.rejects(checkSaveZip(Buffer.from("nope")), /not a ZIP/);
	await assert.rejects(checkSaveZip(Buffer.alloc(0)), /0 bytes/);
});

test("latestRow is the newest modifiedAt", () => {
	const rows = [
		{ objectId: "a", summary: "", modifiedAt: { iso: "2026-01-01" } },
		{ objectId: "b", summary: "", modifiedAt: { iso: "2026-03-01" } },
		{ objectId: "c", summary: "", updatedAt: "2026-02-01" },
	];
	assert.equal(latestRow(rows)?.objectId, "b");
	assert.equal(latestRow([]), undefined);
});

test("readCloudSave queries the session's own _GameSave rows", async () => {
	const calls = fakeCloud(await saveZip(), {});
	try {
		const save = await readCloudSave("cnSession", false);
		assert.equal(save.userId, "cnUser");
		assert.equal(save.rows[0]?.summary, "old-summary");
		const query = new URL(calls[1]!.url);
		assert.deepEqual(JSON.parse(query.searchParams.get("where") ?? ""), {
			user: { __type: "Pointer", className: "_User", objectId: "cnUser" },
		});
		assert.equal(query.searchParams.get("include"), "gameFile");
		for (const call of calls) {
			assert.equal(call.headers["X-LC-Session"], "cnSession");
			assert.equal(call.headers["X-LC-Id"], "rAK3FfdieFob2Nn8Am");
		}
	} finally {
		setTapHttpForTest();
	}
});

test("uploadCloudSave sends the ZIP and summary verbatim, then points the row at it", async () => {
	const zip = await saveZip();
	const calls = fakeCloud(zip, {});
	const upload = {
		userId: "cnUser",
		rowId: "row1",
		zip,
		summary: "Z2Itc3VtbWFyeQ==",
	};
	try {
		const written = await uploadCloudSave(
			"cnSession",
			false,
			upload,
			new Date("2026-10-22T08:00:00.000Z"),
		);
		assert.deepEqual(written, { fileId: "newFile", rowId: "row1" });
		const object = `https://upload.qiniup.com/buckets/bkt/objects/${qiniuObjectName(KEY)}/uploads`;
		assert.deepEqual(
			calls.map((c) => `${c.method} ${c.url}`),
			[
				`POST ${CN}/fileTokens`,
				`POST ${object}`,
				`PUT ${object}/up%2F1/1`,
				`POST ${object}/up%2F1`,
				`POST ${CN}/fileCallback`,
				`PUT ${CN}/classes/_GameSave/row1`,
			],
		);
		const acl = { cnUser: { read: true, write: true } };
		assert.deepEqual(JSON.parse(String(calls[0]!.body)), {
			name: ".save",
			__type: "File",
			prefix: "gamesaves",
			ACL: acl,
			metaData: {
				size: zip.length,
				_checksum: md5Hex(zip),
				prefix: "gamesaves",
			},
		});
		for (const call of calls.slice(1, 4))
			assert.equal(call.headers.Authorization, "UpToken up-token");
		assert.equal(calls[2]!.headers["Content-Type"], "application/octet-stream");
		assert.deepEqual(Buffer.from(calls[2]!.body as Uint8Array), zip);
		assert.deepEqual(JSON.parse(String(calls[3]!.body)), {
			parts: [{ partNumber: 1, etag: "etag-1" }],
		});
		assert.deepEqual(JSON.parse(String(calls[4]!.body)), {
			result: true,
			token: "up-token",
		});
		assert.deepEqual(JSON.parse(String(calls[5]!.body)), {
			summary: "Z2Itc3VtbWFyeQ==",
			modifiedAt: { __type: "Date", iso: "2026-10-22T08:00:00.000Z" },
			gameFile: { __type: "Pointer", className: "_File", objectId: "newFile" },
			user: { __type: "Pointer", className: "_User", objectId: "cnUser" },
			ACL: acl,
		});
		const row = await verifyCloudSave("cnSession", false, written, upload);
		assert.equal(row.gameFile?.objectId, "newFile");
	} finally {
		setTapHttpForTest();
	}
});

test("an account without a save row gets one POSTed with the same body and a name", async () => {
	const zip = await saveZip();
	const now = new Date("2026-10-22T08:00:00.000Z");
	const upload = { userId: "cnUser", zip, summary: "Z2Itc3VtbWFyeQ==" };
	try {
		const put = fakeCloud(zip, {});
		await uploadCloudSave(
			"cnSession",
			false,
			{ ...upload, rowId: "row1" },
			now,
		);
		const putBody = put.find(
			(c) => c.method === "PUT" && c.url.includes("/_GameSave/"),
		)?.body;
		assert.ok(putBody);

		const calls = fakeCloud(zip, { noRow: true });
		const written = await uploadCloudSave("cnSession", false, upload, now);
		assert.deepEqual(written, { fileId: "newFile", rowId: "row2" });
		const saves = calls.filter((c) => c.url.includes("/classes/_GameSave"));
		assert.deepEqual(
			saves.map((c) => `${c.method} ${c.url}`),
			[`POST ${CN}/classes/_GameSave`],
		);
		assert.deepEqual(JSON.parse(String(saves[0]!.body)), {
			name: "save",
			...JSON.parse(String(putBody)),
		});
		assert.equal(JSON.parse(String(putBody)).name, undefined);
		const row = await verifyCloudSave("cnSession", false, written, upload);
		assert.equal(row.objectId, "row2");
		assert.equal(row.gameFile?.objectId, "newFile");
	} finally {
		setTapHttpForTest();
	}
});

test("an unsupported storage provider stops before the save row and releases the file token", async () => {
	const zip = await saveZip();
	const calls = fakeCloud(zip, { provider: "cos" });
	try {
		await assert.rejects(
			uploadCloudSave("cnSession", false, {
				userId: "cnUser",
				rowId: "row1",
				zip,
				summary: "s",
			}),
			/provider cos is not supported/,
		);
		assert.deepEqual(
			calls.map((c) => `${c.method} ${c.url}`),
			[`POST ${CN}/fileTokens`, `POST ${CN}/fileCallback`],
		);
		assert.deepEqual(JSON.parse(String(calls[1]!.body)), {
			result: false,
			token: "up-token",
		});
	} finally {
		setTapHttpForTest();
	}
});

test("a failed Qiniu upload releases the file token and never touches the save row", async () => {
	const zip = await saveZip();
	const calls = fakeCloud(zip, { qiniuFails: true });
	try {
		await assert.rejects(
			uploadCloudSave("cnSession", false, {
				userId: "cnUser",
				rowId: "row1",
				zip,
				summary: "s",
			}),
			/Qiniu 401 bad token/,
		);
		const last = calls.at(-1)!;
		assert.equal(last.url, `${CN}/fileCallback`);
		assert.deepEqual(JSON.parse(String(last.body)), {
			result: false,
			token: "up-token",
		});
		assert.ok(!calls.some((c) => c.url.includes("/classes/_GameSave/")));
	} finally {
		setTapHttpForTest();
	}
});

test("an upload host outside Qiniu never gets the token", async () => {
	const zip = await saveZip();
	const calls = fakeCloud(zip, { host: "https://evil.example.com" });
	try {
		await assert.rejects(
			uploadCloudSave("cnSession", false, {
				userId: "cnUser",
				rowId: "row1",
				zip,
				summary: "s",
			}),
			/not Qiniu/,
		);
		assert.ok(!calls.some((c) => c.url.includes("example.com")));
		assert.ok(!calls.some((c) => c.url.includes("/classes/_GameSave/")));
	} finally {
		setTapHttpForTest();
	}
});

test("verifyCloudSave fails when the row still points at the old file", async () => {
	const zip = await saveZip();
	fakeCloud(zip, {});
	try {
		await assert.rejects(
			verifyCloudSave(
				"cnSession",
				false,
				{ fileId: "newFile", rowId: "row1" },
				{ userId: "cnUser", rowId: "row1", zip, summary: "s" },
			),
			/does not point at the upload/,
		);
	} finally {
		setTapHttpForTest();
	}
});
