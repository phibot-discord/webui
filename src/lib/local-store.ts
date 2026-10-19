type Area = "localStorage" | "sessionStorage";

/** The stored value, or undefined where storage is blocked or missing */
function read(area: Area, key: string): string | null | undefined {
	try {
		return window[area].getItem(key);
	} catch {
		return undefined;
	}
}

function write(area: Area, key: string, value: string): void {
	try {
		window[area].setItem(key, value);
	} catch {}
}

export const readLocal = (key: string) => read("localStorage", key);
export const writeLocal = (key: string, value: string) =>
	write("localStorage", key, value);
export const readSession = (key: string) => read("sessionStorage", key);
export const writeSession = (key: string, value: string) =>
	write("sessionStorage", key, value);
