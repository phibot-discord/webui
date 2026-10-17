import type { DeductionView } from "@/components/Deduction";
import {
	DED_LAYERS,
	DED_SOUNDS,
	DEDUCTION_KEY,
	type DedLayer,
	type DedSoundId,
	type Deduction,
	parseDeduction,
} from "@/lib/deduction";
import type { ObjectUrl } from "./asset-links";
import { jsonLoader } from "./manifest";

const manifest = jsonLoader(
	DEDUCTION_KEY,
	parseDeduction,
	null as Deduction | null,
);

/** The replay with its files as public URLs; undefined when the manifest or the first picture is missing */
export async function buildDeduction(
	link: ObjectUrl,
): Promise<DeductionView | undefined> {
	const data = await manifest.load();
	if (!data) return undefined;
	const url = (key: string | undefined) => (key && link(key)) || undefined;
	const layers: Partial<Record<DedLayer, string>> = {};
	for (const id of DED_LAYERS) {
		const src = url(data.layers[id]?.file);
		if (src) layers[id] = src;
	}
	if (!layers.img1) return undefined;
	const sounds: Partial<Record<DedSoundId, string>> = {};
	for (const id of DED_SOUNDS) {
		const src = url(data.sounds[id]?.file);
		if (src) sounds[id] = src;
	}
	return {
		data,
		art: { layers, gradient: url(data.gradient?.file) ?? null },
		sounds,
		typing: url(data.typing[0]?.file) ?? null,
	};
}
