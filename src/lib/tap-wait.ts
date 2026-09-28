export const TAP_WAIT_PHASE = "taptap";

type TapWaitPayload = {
	error?: string;
	code?: string;
	status?: number | string;
	ok?: boolean;
	lastSynced?: string;
	phase?: string;
	[key: string]: unknown;
};

export function tapWaitFailed(
	res: { ok: boolean },
	data: TapWaitPayload,
): boolean {
	if (typeof data.status === "number" && data.status >= 400) return true;
	if (data.code || data.error) return true;
	if (data.ok === true) return false;
	return !res.ok;
}

export function tapWaitHttpStatus(
	res: { status: number },
	data: TapWaitPayload,
): number {
	return typeof data.status === "number" ? data.status : res.status;
}

export async function readJsonWithTapWait(
	res: Response,
	onTapWait: () => void,
): Promise<{ httpStatus: number; data: TapWaitPayload }> {
	const type = res.headers.get("content-type") || "";
	if (!type.includes("ndjson")) {
		const data = (await res.json().catch(() => ({}))) as TapWaitPayload;
		return { httpStatus: tapWaitHttpStatus(res, data), data };
	}
	if (!res.body) return { httpStatus: res.status, data: {} };
	const reader = res.body.getReader();
	const dec = new TextDecoder();
	let buf = "";
	let data: TapWaitPayload = {};
	for (;;) {
		const { done, value } = await reader.read();
		if (value) buf += dec.decode(value, { stream: true });
		if (done) buf += dec.decode();
		const lines = buf.split("\n");
		buf = done ? "" : (lines.pop() ?? "");
		for (const line of lines) {
			const text = line.trim();
			if (!text) continue;
			let obj: TapWaitPayload;
			try {
				obj = JSON.parse(text) as TapWaitPayload;
			} catch {
				continue;
			}
			if (obj.phase === TAP_WAIT_PHASE) onTapWait();
			else data = obj;
		}
		if (done) break;
	}
	return { httpStatus: tapWaitHttpStatus(res, data), data };
}
