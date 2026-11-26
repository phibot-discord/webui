import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	ERROR_PAGES,
	ERROR_PAGES_DIR,
	readErrorPageAssets,
	renderErrorPage,
} from "../src/lib/cf-error-pages";

const assets = readErrorPageAssets();
mkdirSync(ERROR_PAGES_DIR, { recursive: true });
for (const page of ERROR_PAGES) {
	const html = renderErrorPage(page, assets);
	writeFileSync(join(ERROR_PAGES_DIR, page.file), html);
	console.log(
		`${page.type}: ${ERROR_PAGES_DIR}/${page.file} (${Buffer.byteLength(html)} bytes)`,
	);
}
