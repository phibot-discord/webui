/** Flight, Fizz and Next's buffered writer each pass the shell on with setImmediate; fewer hops than this and a long synchronous render goes out with it */
const FLUSH_HOPS = 4;

/** Resolves once a ready shell has been written, so a heavy page streams its fallback first */
export function afterFlush(): Promise<void> {
	return new Promise((resolve) => {
		let left = FLUSH_HOPS;
		const hop = () => {
			left -= 1;
			if (left > 0) setImmediate(hop);
			else resolve();
		};
		setImmediate(hop);
	});
}
