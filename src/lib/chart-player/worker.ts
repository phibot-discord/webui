import { transferables } from "./chart";
import { fetchChart } from "./fetch-chart";

type Job = { url: string; pack: boolean };

const scope = self as unknown as {
	onmessage: ((e: MessageEvent<Job>) => void) | null;
	postMessage: (data: unknown, transfer?: Transferable[]) => void;
};

scope.onmessage = async (e) => {
	try {
		const { chart, music } = await fetchChart(e.data.url, e.data.pack);
		scope.postMessage({ ok: true, chart, music }, [
			...transferables(chart),
			...(music ? [music] : []),
		]);
	} catch (err) {
		scope.postMessage({
			ok: false,
			error: err instanceof Error ? err.message : String(err),
		});
	}
};
