/** Runs `fn` over `items` with at most `limit` in flight; items are taken in index order */
export async function poolAll<T>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<void>,
) {
	if (!items.length) return;
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			for (;;) {
				const i = next++;
				if (i >= items.length) return;
				await fn(items[i]!, i);
			}
		}),
	);
}
