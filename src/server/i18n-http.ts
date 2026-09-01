import type { Messages } from "@/i18n/messages";
import { catalogs, getRequestLocale } from "@/i18n/server";
import type { ErrorCode } from "./bound";
import { jsonError, retryAfter } from "./http";

type ErrorKey = keyof Messages["errors"];

function asErrorKey(code: string): ErrorKey | undefined {
	return code in catalogs.en.errors ? (code as ErrorKey) : undefined;
}

export async function localizedError(status: number, key: ErrorKey) {
	const locale = await getRequestLocale();
	return jsonError(status, catalogs[locale].errors[key], key);
}

export async function localizedRetryAfter(seconds: number, key: ErrorKey) {
	const locale = await getRequestLocale();
	return retryAfter(seconds, catalogs[locale].errors[key], key);
}

export async function localizedRenderError(err: {
	error: ErrorCode;
	status: number;
	retryAfter?: number;
	detail?: string;
}) {
	const locale = await getRequestLocale();
	const key = asErrorKey(err.error);
	const message = key ? catalogs[locale].errors[key] : err.error;
	const body =
		err.detail && key === "refresh_failed"
			? `${message} ${err.detail}`
			: message;
	if (err.status === 429)
		return retryAfter(err.retryAfter || 120, body, err.error);
	return jsonError(err.status, body, err.error);
}
