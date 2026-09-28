import {
	existsSync as fsExists,
	mkdirSync as fsMkdir,
	readFileSync as fsRead,
	readdirSync as fsReaddir,
	statSync as fsStat,
} from "node:fs";

const overlay = new Map<string, Uint8Array>();

function norm(p: string): string {
	let s = p.replace(/\\/g, "/");
	if (s.startsWith("file://"))
		s = decodeURIComponent(s.slice("file://".length));
	if (/^[a-zA-Z]:\//.test(s)) s = s.replace(/^([a-zA-Z]:)/, "");
	return s.replace(/\/+/g, "/");
}

function lookup(p: string): Uint8Array | undefined {
	const n = norm(p);
	return overlay.get(n) || overlay.get(n.replace(/^\//, ""));
}

export function mountBytes(absPath: string, data: Uint8Array) {
	overlay.set(norm(absPath), data);
}

export function exists(p: string): boolean {
	if (lookup(p)) return true;
	if (p.startsWith("phi-css://")) return false;
	return fsExists(/*turbopackIgnore: true*/ p);
}

export function readFile(p: string): Buffer;
export function readFile(p: string, encoding: "utf8"): string;
export function readFile(p: string, encoding?: "utf8"): Buffer | string {
	const data = lookup(p);
	if (data) {
		// View over the mounted bytes; callers treat asset buffers as read-only.
		const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
		return encoding === "utf8" ? buf.toString("utf8") : buf;
	}
	return encoding === "utf8"
		? fsRead(/*turbopackIgnore: true*/ p, "utf8")
		: fsRead(/*turbopackIgnore: true*/ p);
}

export function readdir(p: string): string[] {
	return fsReaddir(/*turbopackIgnore: true*/ p);
}

export function stat(p: string): {
	isDirectory(): boolean;
	isFile(): boolean;
	mtimeMs: number;
	size: number;
} {
	const data = lookup(p);
	if (data) {
		return {
			isDirectory: () => false,
			isFile: () => true,
			mtimeMs: 0,
			size: data.byteLength,
		};
	}
	const s = fsStat(/*turbopackIgnore: true*/ p);
	return {
		isDirectory: () => s.isDirectory(),
		isFile: () => s.isFile(),
		mtimeMs: s.mtimeMs,
		size: s.size,
	};
}

export function mkdirp(p: string) {
	fsMkdir(/*turbopackIgnore: true*/ p, { recursive: true });
}

export function hydrateCss(css: Record<string, string>) {
	for (const [name, source] of Object.entries(css)) {
		mountBytes(`phi-css://${name}`, Buffer.from(source, "utf8"));
	}
}
