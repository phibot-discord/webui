import { songSearchResponse } from "./search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/songs/search?q=<1-64>&limit=<1-25>&exact=<0|1>`: title, id, composer and nickname lookup */
export function GET(request: Request) {
	return songSearchResponse(request);
}
