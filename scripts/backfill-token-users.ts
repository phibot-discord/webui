// One-off: index Discord binds made before `phi:tokenUser` existed; a token already indexed is left alone
//   node --env-file=.env.local --import tsx scripts/backfill-token-users.ts [--dry-run]
const { kvKey } = await import("../src/phi/lib/const");
const { loadWebConfig } = await import("../src/server/config");
const { connectKv } = await import("../src/server/kv");

const dryRun = process.argv.includes("--dry-run");
// Cloudflare allows 1200 API calls per 5 minutes, and the live site shares the token
const GAP_MS = 750;
const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

const { db } = await connectKv(loadWebConfig().kv);
const prefix = kvKey("userToken", "");
const keys = await db.keys(prefix);
console.log(`${keys.length} binds${dryRun ? " (dry run)" : ""}`);

let indexed = 0;
let kept = 0;
let skipped = 0;
for (const [i, key] of keys.entries()) {
	const userId = key.slice(prefix.length);
	// `tap:` users never hold the index
	if (!/^\d{5,25}$/.test(userId)) {
		skipped += 1;
		continue;
	}
	await pause();
	const token = (await db.get(key))?.replace(/\s/g, "");
	if (!token || !/^[a-zA-Z0-9]{25}$/.test(token)) {
		skipped += 1;
		continue;
	}
	await pause();
	if (await db.get(kvKey("tokenUser", token))) {
		kept += 1;
		continue;
	}
	if (!dryRun) {
		await pause();
		await db.set(kvKey("tokenUser", token), userId);
	}
	indexed += 1;
	if ((i + 1) % 100 === 0) console.log(`${i + 1}/${keys.length}`);
}
console.log(
	`${dryRun ? "would index" : "indexed"} ${indexed}, already indexed ${kept}, skipped ${skipped}`,
);
