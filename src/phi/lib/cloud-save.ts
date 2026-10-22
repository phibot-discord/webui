import { createHash } from "node:crypto";
import JSZip from "jszip";
import { logger } from "@/server/logger";
import { cloudRegion } from "./phigros";
import { TAPAPI_SAVE_TIMEOUT_MS, tapFetch } from "./tapapi";

/** The five members every `.save` ZIP from the game holds */
export const SAVE_ENTRIES = [
	"gameKey",
	"gameProgress",
	"gameRecord",
	"settings",
	"user",
] as const;
const SAVE_MAX_BYTES = 8 * 1024 * 1024;
const QINIU_HOST = /(?:^|\.)qiniup\.com$/i;

export class CloudSaveError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "CloudSaveError";
		this.status = status;
	}
}

/** `users/me` turned the session away: it is not an account of this server */
export class CloudSessionError extends CloudSaveError {
	constructor(message: string, status?: number) {
		super(message, status);
		this.name = "CloudSessionError";
	}
}

/** The save row may have been written: LeanCloud did not answer, or answered without the new row */
export class CloudWriteError extends CloudSaveError {
	constructor(message: string) {
		super(message);
		this.name = "CloudWriteError";
	}
}

export type CloudRow = {
	objectId: string;
	name?: string;
	summary: string;
	modifiedAt?: { iso?: string };
	updatedAt?: string;
	gameFile?: { objectId?: string; url?: string };
};

export type CloudSave = {
	userId: string;
	nickname?: string;
	rows: CloudRow[];
};

type FileToken = {
	objectId?: string;
	token?: string;
	key?: string;
	bucket?: string;
	upload_url?: string;
	provider?: string;
	mime_type?: string;
};

function pointer(className: string, objectId: string) {
	return { __type: "Pointer", className, objectId };
}

export function md5Hex(data: Buffer): string {
	return createHash("md5").update(data).digest("hex");
}

async function lcCall<T>(
	global: boolean,
	session: string,
	path: string,
	init: { method?: string; body?: unknown } = {},
): Promise<T> {
	const r = cloudRegion(global);
	const json = init.body !== undefined;
	const res = await tapFetch(`${r.baseUrl}${path}`, {
		method: init.method ?? "GET",
		headers: {
			...r.headers,
			"X-LC-Session": session,
			...(json ? { "Content-Type": "application/json" } : {}),
		},
		body: json ? JSON.stringify(init.body) : undefined,
	});
	const body = (await res.json().catch(() => undefined)) as
		| (T & { error?: string })
		| undefined;
	if (!res.ok) {
		const why = typeof body?.error === "string" ? ` ${body.error}` : "";
		throw new CloudSaveError(`Phigros cloud ${res.status}${why}`, res.status);
	}
	return (body ?? {}) as T;
}

function rowTime(row: CloudRow): number {
	const t = new Date(row.modifiedAt?.iso ?? row.updatedAt ?? 0).getTime();
	return Number.isFinite(t) ? t : 0;
}

/** The row the game reads: the newest one */
export function latestRow(rows: CloudRow[]): CloudRow | undefined {
	return [...rows].sort((a, b) => rowTime(b) - rowTime(a))[0];
}

/** The account and its `_GameSave` rows as LeanCloud stores them; the summary stays base64 */
export async function readCloudSave(
	session: string,
	global: boolean,
): Promise<CloudSave> {
	const me = await lcCall<{ objectId?: string; nickname?: string }>(
		global,
		session,
		"/users/me",
	).catch((err: unknown) => {
		if (
			err instanceof CloudSaveError &&
			err.status != null &&
			err.status >= 400 &&
			err.status < 500
		)
			throw new CloudSessionError(err.message, err.status);
		throw err;
	});
	if (!me.objectId) throw new CloudSaveError("Phigros cloud returned no user");
	const where = encodeURIComponent(
		JSON.stringify({ user: pointer("_User", me.objectId) }),
	);
	const data = await lcCall<{ results?: CloudRow[] }>(
		global,
		session,
		`/gamesaves/?skip=0&limit=100&where=${where}&include=gameFile`,
	);
	const rows = (data.results ?? []).filter(
		(row): row is CloudRow =>
			typeof row?.objectId === "string" && typeof row.summary === "string",
	);
	return { userId: me.objectId, nickname: me.nickname, rows };
}

export async function checkSaveZip(zip: Buffer): Promise<void> {
	if (!zip.length || zip.length > SAVE_MAX_BYTES)
		throw new CloudSaveError(`save is ${zip.length} bytes`);
	let archive: JSZip;
	try {
		archive = await JSZip.loadAsync(zip);
	} catch {
		throw new CloudSaveError("save is not a ZIP");
	}
	const missing = SAVE_ENTRIES.filter((name) => !archive.file(name));
	if (missing.length)
		throw new CloudSaveError(`save is missing ${missing.join(", ")}`);
}

export async function downloadSaveZip(url: string): Promise<Buffer> {
	const res = await tapFetch(url, {}, TAPAPI_SAVE_TIMEOUT_MS);
	if (!res.ok)
		throw new CloudSaveError(`save download ${res.status}`, res.status);
	const zip = Buffer.from(await res.arrayBuffer());
	await checkSaveZip(zip);
	return zip;
}

/** Qiniu keeps the `=` padding that `base64url` drops */
export function qiniuObjectName(key: string): string {
	return Buffer.from(key, "utf8")
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_");
}

function qiniuOrigin(raw: string): string {
	let url: URL;
	try {
		url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
	} catch {
		throw new CloudSaveError("upload host is not a URL");
	}
	if (url.protocol !== "https:" || !QINIU_HOST.test(url.hostname))
		throw new CloudSaveError(`upload host ${url.hostname} is not Qiniu`);
	return url.origin;
}

async function qiniuCall<T>(
	url: string,
	init: RequestInit,
	timeoutMs?: number,
): Promise<T> {
	const res = await tapFetch(url, init, timeoutMs);
	const body = (await res.json().catch(() => undefined)) as
		| (T & { error?: string })
		| undefined;
	if (!res.ok) {
		const why = typeof body?.error === "string" ? ` ${body.error}` : "";
		throw new CloudSaveError(`Qiniu ${res.status}${why}`, res.status);
	}
	return (body ?? {}) as T;
}

/** Resumable upload v2 in one part, as the game sends it */
async function qiniuPut(
	file: { token: string; key: string; bucket: string; upload_url: string },
	zip: Buffer,
) {
	const object = `${qiniuOrigin(file.upload_url)}/buckets/${encodeURIComponent(file.bucket)}/objects/${qiniuObjectName(file.key)}/uploads`;
	const auth = { Authorization: `UpToken ${file.token}` };
	const init = await qiniuCall<{ uploadId?: string }>(object, {
		method: "POST",
		headers: auth,
	});
	if (!init.uploadId) throw new CloudSaveError("Qiniu returned no uploadId");
	const upload = `${object}/${encodeURIComponent(init.uploadId)}`;
	const part = await qiniuCall<{ etag?: string }>(
		`${upload}/1`,
		{
			method: "PUT",
			headers: { ...auth, "Content-Type": "application/octet-stream" },
			body: new Uint8Array(zip),
		},
		TAPAPI_SAVE_TIMEOUT_MS,
	);
	if (!part.etag) throw new CloudSaveError("Qiniu returned no part etag");
	await qiniuCall(upload, {
		method: "POST",
		headers: { ...auth, "Content-Type": "application/json" },
		body: JSON.stringify({ parts: [{ partNumber: 1, etag: part.etag }] }),
	});
}

/** A presigned PUT, as the LeanCloud SDKs send to S3; not seen from Phigros itself */
async function s3Put(raw: string, mime: string | undefined, zip: Buffer) {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new CloudSaveError("upload URL is not a URL");
	}
	if (url.protocol !== "https:")
		throw new CloudSaveError("upload URL is not https");
	const res = await tapFetch(
		url,
		{
			method: "PUT",
			headers: { "Content-Type": mime || "application/octet-stream" },
			body: new Uint8Array(zip),
		},
		TAPAPI_SAVE_TIMEOUT_MS,
	);
	if (!res.ok) throw new CloudSaveError(`S3 ${res.status}`, res.status);
}

function putFile(file: FileToken, zip: Buffer): Promise<void> {
	const provider = file.provider || "qiniu";
	if (provider === "qiniu") {
		const { token, key, bucket, upload_url } = file;
		if (!token || !key || !bucket || !upload_url)
			throw new CloudSaveError("fileTokens returned no Qiniu target");
		return qiniuPut({ token, key, bucket, upload_url }, zip);
	}
	if (provider === "s3") {
		if (!file.upload_url)
			throw new CloudSaveError("fileTokens returned no S3 URL");
		return s3Put(file.upload_url, file.mime_type, zip);
	}
	throw new CloudSaveError(`upload provider ${provider} is not supported`);
}

function hostOf(raw: string | undefined): string {
	try {
		return raw ? new URL(raw).host : "-";
	} catch {
		return "?";
	}
}

export type SaveUpload = {
	userId: string;
	/** Absent: the account has no `_GameSave` row yet, so one is created */
	rowId?: string;
	/** Required by `_GameSave` when a row is created; the game's own rows say "save" */
	name?: string;
	zip: Buffer;
	summary: string;
};

/** Uploads the ZIP as a new `_File`, then points the `_GameSave` row at it; only that last write changes the save */
export async function uploadCloudSave(
	session: string,
	global: boolean,
	save: SaveUpload,
	now = new Date(),
): Promise<{ fileId: string; rowId: string }> {
	const acl = { [save.userId]: { read: true, write: true } };
	const file = await lcCall<FileToken>(global, session, "/fileTokens", {
		method: "POST",
		body: {
			name: ".save",
			__type: "File",
			prefix: "gamesaves",
			ACL: acl,
			metaData: {
				size: save.zip.length,
				_checksum: md5Hex(save.zip),
				prefix: "gamesaves",
			},
		},
	});
	logger.info(
		`fileTokens ${global ? "gb" : "cn"} provider=${file.provider ?? "-"} host=${hostOf(file.upload_url)} keys=${Object.keys(file).sort().join(",")}`,
	);
	const fileId = file.objectId;
	if (!fileId) throw new CloudSaveError("fileTokens returned no file");
	const callback = (result: boolean) =>
		file.token
			? lcCall(global, session, "/fileCallback", {
					method: "POST",
					body: { result, token: file.token },
				})
			: Promise.resolve();
	try {
		await putFile(file, save.zip);
	} catch (err) {
		await callback(false).catch(() => undefined);
		throw err;
	}
	await callback(true);
	const row = {
		summary: save.summary,
		modifiedAt: { __type: "Date", iso: now.toISOString() },
		gameFile: pointer("_File", fileId),
		user: pointer("_User", save.userId),
		ACL: acl,
	};
	try {
		if (save.rowId) {
			await lcCall(
				global,
				session,
				`/classes/_GameSave/${encodeURIComponent(save.rowId)}`,
				{ method: "PUT", body: row },
			);
			return { fileId, rowId: save.rowId };
		}
		const created = await lcCall<{ objectId?: string }>(
			global,
			session,
			"/classes/_GameSave",
			{ method: "POST", body: { name: save.name || "save", ...row } },
		);
		if (!created.objectId)
			throw new CloudWriteError("the new cloud save has no objectId");
		return { fileId, rowId: created.objectId };
	} catch (err) {
		if (err instanceof CloudSaveError) throw err;
		throw new CloudWriteError(
			`the save write got no answer: ${err instanceof Error ? err.message : err}`,
		);
	}
}

/** The row must point at the upload; its file is compared byte for byte when it downloads at all */
export async function verifyCloudSave(
	session: string,
	global: boolean,
	written: { fileId: string; rowId: string },
	save: SaveUpload,
): Promise<CloudRow> {
	const after = await readCloudSave(session, global);
	const row = after.rows.find((r) => r.objectId === written.rowId);
	if (!row || row.gameFile?.objectId !== written.fileId)
		throw new CloudSaveError("the cloud save does not point at the upload");
	if (row.summary !== save.summary)
		throw new CloudSaveError("the cloud save summary differs");
	const url = row.gameFile.url;
	const res = url
		? await tapFetch(url, {}, TAPAPI_SAVE_TIMEOUT_MS).catch(() => undefined)
		: undefined;
	if (!res?.ok) {
		logger.warn(`uploaded save not re-read: ${res?.status ?? "no response"}`);
		return row;
	}
	if (md5Hex(Buffer.from(await res.arrayBuffer())) !== md5Hex(save.zip))
		throw new CloudSaveError("the uploaded save differs");
	return row;
}
