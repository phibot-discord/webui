import { assetsDir } from "./paths";

let boot: Promise<void> | undefined;

export function ensureSongInfo(): Promise<void> {
	if (!boot) {
		boot = import("@/phi/lib/get-info")
			.then(({ getInfo }) => getInfo.init(assetsDir()))
			.catch((err) => {
				boot = undefined;
				throw err;
			});
	}
	return boot;
}
