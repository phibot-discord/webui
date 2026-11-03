import JSZip from "jszip";

function field(info: string, name: string): string | undefined {
	return new RegExp(`^${name}:\\s*(.+)$`, "m").exec(info)?.[1]?.trim();
}

export async function unpack(
	data: ArrayBuffer,
): Promise<{ chart: unknown; music: ArrayBuffer | null }> {
	const zip = await JSZip.loadAsync(data);
	const names = Object.keys(zip.files);
	const info = await zip.file("info.txt")?.async("string");
	const chartName =
		(info && field(info, "Chart")) ?? names.find((n) => n.endsWith(".json"));
	const musicName =
		(info && field(info, "Song")) ??
		names.find((n) => /\.(ogg|mp3|wav)$/i.test(n));
	const chartFile = chartName ? zip.file(chartName) : null;
	if (!chartFile) throw new Error("pack: no chart");
	const chart = JSON.parse(await chartFile.async("string"));
	const musicFile = musicName ? zip.file(musicName) : null;
	return {
		chart,
		music: musicFile ? await musicFile.async("arraybuffer") : null,
	};
}
