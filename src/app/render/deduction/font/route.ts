import { readFile } from "node:fs/promises";

export const dynamic = "force-dynamic";

export async function GET() {
	const path = process.env.PHI_RENDER_FONT;
	if (process.env.PHI_RENDER !== "1" || !path) {
		return new Response("Not found", { status: 404 });
	}
	return new Response(new Uint8Array(await readFile(path)), {
		headers: { "content-type": "font/ttf", "cache-control": "no-store" },
	});
}
