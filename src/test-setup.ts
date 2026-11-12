import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFIXES = ["CLOUDFLARE_", "AUTH_", "PHI_", "PHIRA_", "TAP_", "STATUS_"];

for (const name of Object.keys(process.env)) {
	if (name === "VERCEL_URL" || PREFIXES.some((p) => name.startsWith(p))) {
		delete process.env[name];
	}
}

process.env.PHI_TEST_SEAMS = "1";

const infoCache = mkdtempSync(join(tmpdir(), "phi-test-"));
const illCache = mkdtempSync(join(tmpdir(), "phi-test-"));
const radarCache = mkdtempSync(join(tmpdir(), "phi-test-"));
process.env.PHI_INFO_CACHE = infoCache;
process.env.PHI_ILL_CACHE = illCache;
process.env.PHI_RADAR_CACHE = radarCache;

process.on("exit", () => {
	for (const dir of [infoCache, illCache, radarCache]) {
		rmSync(dir, { recursive: true, force: true });
	}
});
