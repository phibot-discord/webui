export class Semaphore {
	private active = 0;
	private readonly wait: Array<() => void> = [];

	constructor(private readonly max: number) {}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		while (this.active >= this.max) {
			await new Promise<void>((resolve) => this.wait.push(resolve));
		}
		this.active += 1;
		try {
			return await fn();
		} finally {
			this.active -= 1;
			this.wait.shift()?.();
		}
	}
}

export function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	label: string,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(
			() => reject(new Error(`${label} timed out after ${ms}ms`)),
			ms,
		);
		promise.then(
			(value) => {
				clearTimeout(t);
				resolve(value);
			},
			(err) => {
				clearTimeout(t);
				reject(err);
			},
		);
	});
}

/** Cap concurrent Takumi rasters in this process. */
export const renderLock = new Semaphore(2);
