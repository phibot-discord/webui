export function apiErrorText(
	res: Response,
	data: { error?: string; code?: string },
	tapapi: string,
	fallback: string,
): string {
	if (data.code === "tapapi_unavailable") return data.error || tapapi;
	if (res.status === 502 && !data.code) return tapapi;
	return data.error || fallback;
}
