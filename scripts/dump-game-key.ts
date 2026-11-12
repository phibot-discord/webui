import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { type GameKeyBlock, KEY_TYPES, readGameKey } from "../src/lib/game-key";
import { decryptSaveEntry, PhigrosUser } from "../src/phi/lib/phigros";
import { fetchSaveFile } from "../src/phi/lib/save-host";

const out = resolve(process.argv[2] || "/tmp/phi-game-key.json");
if (out.startsWith(process.cwd())) {
	console.error("write the dump outside the repository");
	process.exit(1);
}
const token = process.env.PHI_DUMP_TOKEN;
if (!token) {
	console.error("PHI_DUMP_TOKEN is not set");
	process.exit(1);
}
const global = process.env.PHI_DUMP_GLOBAL === "1";

const user = new PhigrosUser(token, global);
const info = await user.getSaveInfo();
const res = await fetchSaveFile(new URL(info.gameFile.url), global);
if (!res.ok) {
	console.error(`save download failed ${res.status}`);
	process.exit(1);
}
const zip = await JSZip.loadAsync(await res.arrayBuffer());
const file = zip.file("gameKey");
if (!file) {
	console.error("this save has no gameKey member");
	process.exit(2);
}
const buf = await file.async("nodebuffer");
const version = buf[0];
const plain = decryptSaveEntry(buf.subarray(1));
console.log(`member version: ${version}`);
console.log(`decrypted length: ${plain.length} bytes`);

let block: GameKeyBlock;
try {
	block = readGameKey(plain);
} catch (err) {
	console.log(
		`reader failed: ${err instanceof Error ? err.message : String(err)}`,
	);
	process.exit(1);
}

const { entries, tail } = block;
console.log(`keys: ${entries.length}`);
for (const type of KEY_TYPES) {
	const n = entries.filter((entry) => entry.types.includes(type)).length;
	console.log(`  ${type}: ${n}`);
}
const histogram = new Map<number, number>();
for (const entry of entries) {
	const n = entry.flags.length;
	histogram.set(n, (histogram.get(n) ?? 0) + 1);
}
console.log("flag bytes per key:");
for (const [n, keys] of [...histogram].sort((a, b) => a[0] - b[0])) {
	console.log(`  ${n} ${n === 1 ? "flag" : "flags"}: ${keys}`);
}
console.log(
	`keys with no type: ${entries.filter((entry) => entry.types.length === 0).length}`,
);
console.log(
	`keys whose flag count differs from their type count: ${entries.filter((entry) => entry.flags.length !== entry.types.length).length}`,
);
console.log(`tail: ${tail.length} bytes [${tail.join(", ")}]`);

writeFileSync(out, JSON.stringify({ version, entries, tail }, null, "\t"), {
	mode: 0o600,
});
console.log(`wrote ${out}`);
