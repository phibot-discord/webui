import {
	existsSync as fsExists,
	mkdirSync as fsMkdir,
	readFileSync as fsRead,
	readdirSync as fsReaddir,
	statSync as fsStat,
} from "node:fs";
import { dirname } from "node:path";

const overlay = new Map<string, Uint8Array>();
let root = "";

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

export function vfsRoot(): string {
	return root;
}

export function mountDisk(dir: string) {
	root = norm(dir);
	overlay.clear();
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
		const buf = Buffer.from(data);
		return encoding === "utf8" ? buf.toString("utf8") : buf;
	}
	return encoding === "utf8"
		? fsRead(/*turbopackIgnore: true*/ p, "utf8")
		: Buffer.from(fsRead(/*turbopackIgnore: true*/ p));
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

export function mkdirpParent(file: string) {
	fsMkdir(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
}

export function hydrateCss(css: Record<string, string>) {
	for (const [name, source] of Object.entries(css)) {
		mountBytes(`phi-css://${name}`, Buffer.from(source, "utf8"));
	}
}
