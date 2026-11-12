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

type AuthOriginStore = {
	__phiAuthOrigins?: string[];
	__phiAuthUrlBase?: { value: string | undefined };
	__phiAuthUrlTail?: Promise<void>;
};

function envOrigins(): string[] {
	return [
		...splitOrigins(process.env.AUTH_URLS),
		...splitOrigins(process.env.AUTH_URL),
	];
}

function parseAuthOrigins(): string[] {
	const g = globalThis as AuthOriginStore;
	if (g.__phiAuthOrigins) return g.__phiAuthOrigins;
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of envOrigins()) {
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

export function resetAuthOriginsForTest(
	env: Record<string, string | undefined> = {},
) {
	const keys = ["AUTH_URLS", "AUTH_URL"] as const;
	for (const key of keys) {
		const value = env[key];
		if (value) process.env[key] = value;
		else delete process.env[key];
	}
	const g = globalThis as AuthOriginStore;
	delete g.__phiAuthOrigins;
	delete g.__phiAuthUrlBase;
	delete g.__phiAuthUrlTail;
}

export function configuredAuthOrigins(): readonly string[] {
	return parseAuthOrigins();
}

/** Auth.js parses AUTH_URL as a single origin. Drop it when several are set */
export function stripCanonicalAuthUrlIfMany() {
	const g = globalThis as AuthOriginStore;
	if (g.__phiAuthUrlBase) return;
	if (parseAuthOrigins().length > 1) delete process.env.AUTH_URL;
	g.__phiAuthUrlBase = { value: process.env.AUTH_URL };
}

function firstHeader(headers: Headers, name: string): string {
	return (headers.get(name) || "").split(",")[0]?.trim() || "";
}

export function requestHost(headers: Headers): string {
	return (
		firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host")
	);
}

export function resolveAuthOrigin(headers: Headers): string | undefined {
	const host = requestHost(headers);
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
		const origins = parseAuthOrigins();
		const match = origins.find(
			(origin) => origin.toLowerCase() === requestOrigin.toLowerCase(),
		);
		if (match) return match;
		if (!origins.length) return requestOrigin;
	}
	return parseAuthOrigins()[0];
}

export const AUTH_URL_WAIT_MS = 5_000;

function waitAtMost(prior: Promise<void>, ms: number): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<void>((resolve) => {
		timer = setTimeout(resolve, ms);
	});
	return Promise.race([prior, timeout]).finally(() => clearTimeout(timer));
}

export async function withBoundAuthUrl<T>(
	headers: Headers,
	fn: () => T | Promise<T>,
	waitMs = AUTH_URL_WAIT_MS,
): Promise<T> {
	stripCanonicalAuthUrlIfMany();
	const g = globalThis as AuthOriginStore;
	const base = g.__phiAuthUrlBase?.value;
	const prior = g.__phiAuthUrlTail ?? Promise.resolve();
	const { promise: done, resolve: release } = Promise.withResolvers<void>();
	g.__phiAuthUrlTail = done;
	await waitAtMost(prior, waitMs);
	try {
		const origin = resolveAuthOrigin(headers);
		if (origin) process.env.AUTH_URL = origin;
		return await fn();
	} finally {
		if (base === undefined) delete process.env.AUTH_URL;
		else process.env.AUTH_URL = base;
		release();
	}
}
