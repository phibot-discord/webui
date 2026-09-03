export const TAPAPI_TIMEOUT_MS = 15_000;
export const TAPAPI_SAVE_TIMEOUT_MS = 25_000;

export class TapApiError extends Error {
	readonly timeout: boolean;

	constructor(message: string, timeout = false) {
		super(message);
		this.name = "TapApiError";
		this.timeout = timeout;
	}
}

export function isTimeoutError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	if (err.name === "TimeoutError" || err.name === "AbortError") return true;
	return /timeout|timed out|aborted/i.test(err.message);
}

export function toTapApiError(err: unknown): TapApiError {
	if (err instanceof TapApiError) return err;
	const timeout = isTimeoutError(err);
	const message = err instanceof Error ? err.message : "TapAPI request failed";
	return new TapApiError(timeout ? "TapAPI timed out" : message, timeout);
}

export function isTapApiFailure(err: unknown): boolean {
	return err instanceof TapApiError || isTimeoutError(err);
}

function withTimeout(
	signal: AbortSignal | null | undefined,
	timeoutMs: number,
) {
	const timeout = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function tapFetch(
	url: string | URL,
	init: RequestInit = {},
	timeoutMs = TAPAPI_TIMEOUT_MS,
): Promise<Response> {
	try {
		const res = await fetch(url, {
			...init,
			signal: withTimeout(init.signal, timeoutMs),
		});
		if (res.status >= 500) {
			throw new TapApiError(`TapAPI ${res.status} ${res.statusText}`);
		}
		return res;
	} catch (err) {
		throw toTapApiError(err);
	}
}
