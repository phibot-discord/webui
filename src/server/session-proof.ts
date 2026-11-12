import { createHash } from "node:crypto";
import { isTapUserId } from "./auth-tickets";
import { logger } from "./logger";

export function tokenProof(sessionToken: string): string {
	return createHash("sha256").update(sessionToken).digest("hex").slice(0, 32);
}

export function proofFor(
	userId: string,
	sessionToken: string,
): string | undefined {
	if (isTapUserId(userId)) return;
	return tokenProof(sessionToken);
}

export async function proofHolds(
	userId: string,
	proof: string,
	boundToken: (userId: string) => Promise<string | null | undefined>,
): Promise<boolean> {
	let token: string | null | undefined;
	try {
		token = await boundToken(userId);
	} catch (err) {
		logger.warn(
			`session proof not checked: ${err instanceof Error ? err.message : err}`,
		);
		return true;
	}
	if (!token) return false;
	return tokenProof(token) === proof;
}
