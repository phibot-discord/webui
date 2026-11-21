import { postGuess } from "@/server/guess-game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return postGuess(request, "jacket");
}
