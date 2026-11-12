import { createHmac, timingSafeEqual } from "node:crypto";
import {
	type Dare,
	dareExpired,
	dareUntil,
	decodeDare,
	encodeDare,
} from "@/lib/dare";

const SIG_BYTES = 12;
const TOKEN_MAX = 280;

function secret(): string {
	const key = process.env.AUTH_SECRET?.trim();
	if (key) return key;
	if (process.env.NODE_ENV === "production") {
		throw new Error("dare: set AUTH_SECRET");
	}
	return "phibot-dev-dare";
}

function sign(songId: string, payload: string, key = secret()): string {
	return createHmac("sha256", key)
		.update(`dare:${songId}:${payload}`)
		.digest()
		.subarray(0, SIG_BYTES)
		.toString("base64url");
}

export function dareToken(
	songId: string,
	dare: Omit<Dare, "until">,
	now: number = Date.now(),
): string {
	const payload = encodeDare({ ...dare, until: dareUntil(now) });
	return `${payload}.${sign(songId, payload)}`;
}

export function readDare(
	songId: string,
	token: string | undefined,
	now: number = Date.now(),
): Dare | undefined {
	if (!token || token.length > TOKEN_MAX) return undefined;
	const cut = token.lastIndexOf(".");
	if (cut <= 0) return undefined;
	const payload = token.slice(0, cut);
	const got = Buffer.from(token.slice(cut + 1));
	const want = Buffer.from(sign(songId, payload));
	if (got.length !== want.length || !timingSafeEqual(got, want))
		return undefined;
	const dare = decodeDare(payload);
	return dare && !dareExpired(dare.until, now) ? dare : undefined;
}
