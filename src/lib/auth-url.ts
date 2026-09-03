function splitOrigins(raw: string | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(/[\s,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function toOrigin(raw: string): string | undefined {
	try {
		return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
	} catch {
		return undefined;
	}
}

type AuthOriginStore = { __phiAuthOrigins?: string[] };

function parseAuthOrigins(): string[] {
	const g = globalThis as AuthOriginStore;
	if (g.__phiAuthOrigins) return g.__phiAuthOrigins;
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of [
		...splitOrigins(process.env.AUTH_URLS),
		...splitOrigins(process.env.AUTH_URL),
		...splitOrigins(process.env.NEXTAUTH_URL),
	]) {
		const origin = toOrigin(raw);
		if (!origin) continue;
		const key = origin.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(origin);
	}
	g.__phiAuthOrigins = out;
	return out;
}

const AUTH_ORIGINS = parseAuthOrigins();

export function configuredAuthOrigins(): readonly string[] {
	return AUTH_ORIGINS;
}

/** Auth.js parses AUTH_URL as a single origin. Drop it when several are set. */
export function stripCanonicalAuthUrlIfMany() {
	if (AUTH_ORIGINS.length > 1) {
		delete process.env.AUTH_URL;
		delete process.env.NEXTAUTH_URL;
	}
}

function firstHeader(headers: Headers, name: string): string {
	return (headers.get(name) || "").split(",")[0]?.trim() || "";
}

export function resolveAuthOrigin(headers: Headers): string | undefined {
	const host =
		firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
	const proto =
		firstHeader(headers, "x-forwarded-proto") ||
		(host.startsWith("localhost") || host.startsWith("127.")
			? "http"
			: "https");
	let requestOrigin: string | undefined;
	if (host) {
		try {
			requestOrigin = new URL(`${proto}://${host}`).origin;
		} catch {
			requestOrigin = undefined;
		}
	}
	if (requestOrigin) {
		const match = AUTH_ORIGINS.find(
			(origin) => origin.toLowerCase() === requestOrigin.toLowerCase(),
		);
		if (match) return match;
		if (!AUTH_ORIGINS.length) return requestOrigin;
	}
	return AUTH_ORIGINS[0];
}

function restoreEnv(
	key: "AUTH_URL" | "NEXTAUTH_URL",
	prev: string | undefined,
) {
	if (prev === undefined) delete process.env[key];
	else process.env[key] = prev;
}

export async function withBoundAuthUrl<T>(
	headers: Headers,
	fn: () => T | Promise<T>,
): Promise<T> {
	const origin = resolveAuthOrigin(headers);
	const prevUrl = process.env.AUTH_URL;
	const prevNext = process.env.NEXTAUTH_URL;
	if (origin) {
		process.env.AUTH_URL = origin;
		process.env.NEXTAUTH_URL = origin;
	}
	try {
		return await fn();
	} finally {
		restoreEnv("AUTH_URL", prevUrl);
		restoreEnv("NEXTAUTH_URL", prevNext);
	}
}
