export function shownVersion(version: string): string {
	return version.replace(/-(\d+)$/, " ($1)");
}

export function versionSpan(versions: readonly string[]): string {
	const first = shownVersion(versions[0] ?? "");
	const last = shownVersion(versions.at(-1) ?? "") || first;
	return first === last ? first : `${first} – ${last}`;
}

export function saveBlob(blob: Blob, file: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = file;
	document.body.append(a);
	a.click();
	a.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
