export type NotePost = (body: object) => Promise<boolean>;

export function createNoteSaves(
	post: NotePost,
): (body: object) => Promise<boolean> {
	let tail: Promise<unknown> = Promise.resolve();
	return (body) => {
		const run = tail.then(() => post(body)).catch(() => false);
		tail = run;
		return run;
	};
}
