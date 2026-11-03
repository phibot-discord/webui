import { type CompiledChart, compileChart } from "./chart";

export type Loaded = { chart: CompiledChart; music: ArrayBuffer | null };

export async function fetchChart(url: string, pack: boolean): Promise<Loaded> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`chart ${res.status}`);
	if (!pack) return { chart: compileChart(await res.json()), music: null };
	const { unpack } = await import("./pack");
	const got = await unpack(await res.arrayBuffer());
	return { chart: compileChart(got.chart), music: got.music };
}
