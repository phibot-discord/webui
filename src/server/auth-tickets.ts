import { decode, encode } from "next-auth/jwt";

export const TAP_LOGIN_COOKIE = "phi-tap-login";
export const DISCORD_LINK_COOKIE = "phi-link-discord";

export const TAP_TICKET_TTL_S = 120;
export const TAP_LOGIN_COOKIE_MAX_AGE_S = 840 + TAP_TICKET_TTL_S;
export const DISCORD_LINK_TTL_S = 600;

const TAP_TICKET_SALT = "phi-tap-ticket";
const DISCORD_LINK_SALT = "phi-link-discord";

const TAP_USER_PREFIX = "tap:";

export function tapUserId(objectId: string): string {
	return `${TAP_USER_PREFIX}${objectId}`;
}

export function isTapUserId(userId: string | null | undefined): boolean {
	return Boolean(userId?.startsWith(TAP_USER_PREFIX));
}

export function tapObjectId(userId: string): string | undefined {
	if (!isTapUserId(userId)) return;
	return userId.slice(TAP_USER_PREFIX.length) || undefined;
}

export function isLoginId(raw: unknown): raw is string {
	return typeof raw === "string" && /^[\w-]{32}$/.test(raw);
}

export function readCookie(
	headers: Pick<Headers, "get">,
	name: string,
): string | undefined {
	const raw = headers.get("cookie");
	if (!raw) return;
	for (const part of raw.split(";")) {
		const eq = part.indexOf("=");
		if (eq < 0 || part.slice(0, eq).trim() !== name) continue;
		return part.slice(eq + 1).trim() || undefined;
	}
}

export function tapLoginIdFrom(headers: Pick<Headers, "get">) {
	const id = readCookie(headers, TAP_LOGIN_COOKIE);
	return isLoginId(id) ? id : undefined;
}

export function isSecureRequest(headers: Pick<Headers, "get">, url?: string) {
	if (headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https")
		return true;
	return Boolean(url?.startsWith("https:"));
}

export function tapLoginSetCookie(loginId: string, secure: boolean): string {
	return `${TAP_LOGIN_COOKIE}=${loginId}; Path=/; Max-Age=${TAP_LOGIN_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function tapLoginClearCookie(secure: boolean): string {
	return `${TAP_LOGIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function authSecret(): string {
	const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
	if (!secret) throw new Error("AUTH_SECRET is not set");
	return secret;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value ? value : undefined;
}

export type TicketUser = { id: string; name?: string; image?: string };

/** Proof that QR sign-in `loginId` finished as `user`; only that browser's cookie can redeem it */
export function sealTapTicket(
	loginId: string,
	user: TicketUser,
): Promise<string> {
	return encode({
		token: {
			sub: user.id,
			name: user.name,
			picture: user.image,
			login: loginId,
		},
		secret: authSecret(),
		salt: TAP_TICKET_SALT,
		maxAge: TAP_TICKET_TTL_S,
	});
}

export async function openTapTicket(
	ticket: unknown,
	loginId: string | undefined,
): Promise<TicketUser | null> {
	if (typeof ticket !== "string" || !ticket || !loginId) return null;
	try {
		const token = await decode({
			token: ticket,
			secret: authSecret(),
			salt: TAP_TICKET_SALT,
		});
		const id = text(token?.sub);
		if (!token || !id || token.login !== loginId) return null;
		return { id, name: text(token.name), image: text(token.picture) };
	} catch {
		return null;
	}
}

export function sealDiscordLink(tapUser: string): Promise<string> {
	return encode({
		token: { sub: tapUser },
		secret: authSecret(),
		salt: DISCORD_LINK_SALT,
		maxAge: DISCORD_LINK_TTL_S,
	});
}

export async function openDiscordLink(
	sealed: string | undefined,
): Promise<string | null> {
	if (!sealed) return null;
	try {
		const token = await decode({
			token: sealed,
			secret: authSecret(),
			salt: DISCORD_LINK_SALT,
		});
		const sub = text(token?.sub);
		return sub && isTapUserId(sub) ? sub : null;
	} catch {
		return null;
	}
}
