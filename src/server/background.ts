import { after } from "next/server";

export function runInBackground(
	work: Promise<unknown>,
	onError?: (err: unknown) => void,
): void {
	const settled = work.then(
		() => undefined,
		(err) => onError?.(err),
	);
	try {
		after(() => settled);
	} catch {
		/* no request scope */
	}
}
