// Checks the manifest parsers share: a value of the wrong shape gives undefined (or "")

export function text(v: unknown): string {
	return typeof v === "string" ? v : "";
}

export function positiveInt(v: unknown): number | undefined {
	return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

export function nonNegative(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

/** A `{ v: 1, … }` manifest body, or undefined for any other version or shape */
export function v1Body(raw: unknown): Record<string, unknown> | undefined {
	return raw && typeof raw === "object" && (raw as { v?: unknown }).v === 1
		? (raw as Record<string, unknown>)
		: undefined;
}
