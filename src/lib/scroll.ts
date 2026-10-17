export function revealDelta(
	box: { top: number; bottom: number },
	target: { top: number; bottom: number },
	pad = 8,
): number {
	if (target.top < box.top + pad) return target.top - box.top - pad;
	if (target.bottom > box.bottom - pad) return target.bottom - box.bottom + pad;
	return 0;
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function revealIn(
	container: HTMLElement,
	target: HTMLElement,
	smooth = true,
) {
	if (container.scrollHeight <= container.clientHeight) return;
	const delta = revealDelta(
		container.getBoundingClientRect(),
		target.getBoundingClientRect(),
	);
	if (!delta) return;
	container.scrollBy({
		top: delta,
		behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
	});
}

export type RowFade = "none" | "start" | "end" | "both";

export function rowFade(left: number, max: number): RowFade {
	const start = left > 1;
	const end = left < max - 1;
	return start && end ? "both" : start ? "start" : end ? "end" : "none";
}

export function revealInRow(row: HTMLElement, target: HTMLElement, pad = 32) {
	if (row.scrollWidth <= row.clientWidth) return;
	const box = row.getBoundingClientRect();
	const r = target.getBoundingClientRect();
	const delta = revealDelta(
		{ top: box.left, bottom: box.right },
		{ top: r.left, bottom: r.right },
		pad,
	);
	if (delta) row.scrollLeft += delta;
}
