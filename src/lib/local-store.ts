/** localStorage, or undefined where storage is blocked or missing */
export function readLocal(key: string): string | null | undefined {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return undefined;
	}
}

export function writeLocal(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value);
	} catch {}
}
