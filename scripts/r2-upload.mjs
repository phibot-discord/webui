// Uploads a directory tree to R2, every index.json last; .cache directories are skipped
//   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… CLOUDFLARE_R2_BUCKET=… node r2-upload.mjs <dir> [--dry-run]
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const TYPES = {
	json: "application/json",
	png: "image/png",
	jpg: "image/jpeg",
	ogg: "audio/ogg",
	mp4: "video/mp4",
	pez: "application/octet-stream",
};
const CONCURRENCY = 6;
const TRIES = 4;

const [dir, ...flags] = process.argv.slice(2);
const dry = flags.includes("--dry-run");
const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } =
	process.env;
const bucket = process.env.CLOUDFLARE_R2_BUCKET;
if (!dir || (!dry && (!account || !token || !bucket))) {
	console.error(
		"usage: CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… CLOUDFLARE_R2_BUCKET=… node r2-upload.mjs <dir> [--dry-run]",
	);
	process.exit(1);
}

async function walk(at) {
	const out = [];
	for (const e of await readdir(at, { withFileTypes: true })) {
		if (e.name === ".cache") continue;
		const path = join(at, e.name);
		if (e.isDirectory()) out.push(...(await walk(path)));
		else if (e.isFile()) out.push(path);
	}
	return out;
}

async function put(path) {
	const key = relative(dir, path).split(sep).join("/");
	const ext = key.split(".").pop()?.toLowerCase() ?? "";
	const type = TYPES[ext] ?? "application/octet-stream";
	if (dry) return console.log(`would upload ${key} (${type})`);
	const body = await readFile(path);
	const url = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, {
				method: "PUT",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": type },
				body,
				signal: AbortSignal.timeout(10 * 60 * 1000),
			});
			if (res.ok) return console.log(`uploaded ${key} ${body.byteLength}`);
			const retry = res.status === 429 || res.status >= 500;
			if (!retry || attempt >= TRIES)
				throw new Error(`${key}: HTTP ${res.status} ${await res.text()}`);
		} catch (err) {
			if (attempt >= TRIES) throw err;
		}
		await new Promise((r) => setTimeout(r, 2000 * attempt));
	}
}

async function pool(paths) {
	let next = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (next < paths.length) await put(paths[next++]);
		}),
	);
}

const all = await walk(dir);
const last = all.filter((p) => p.endsWith(`${sep}index.json`));
await pool(all.filter((p) => !last.includes(p)));
await pool(last);
console.log(`${all.length} files ${dry ? "listed" : "uploaded"}`);
