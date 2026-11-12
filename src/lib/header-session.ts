export type HeaderSession = {
	signedIn: boolean;
	name: string | null;
	image: string | null;
};

export const SIGNED_OUT: HeaderSession = {
	signedIn: false,
	name: null,
	image: null,
};

export function needsSessionLoad(
	loadedFor: string | null,
	path: string,
	stale: boolean,
): boolean {
	return loadedFor === null || (loadedFor !== path && stale);
}
