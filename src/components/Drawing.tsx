import { B30Drawing } from "@/components/drawings/b30";
import { ChartDrawing } from "@/components/drawings/chart";
import { PezDrawing } from "@/components/drawings/pez";
import b30 from "@/drawings/b30.json";
import chart from "@/drawings/chart.json";
import pez from "@/drawings/pez.json";

export type DrawingName = "b30" | "chart" | "pez";

type Tag = { id: string; n: number; x: number; y: number };
type View = { viewBox: string; ratio: number; svg: string; tags: Tag[] };
export type Sheet = { views: Record<string, View> };

const SHEETS = { b30, chart, pez } as unknown as Record<DrawingName, Sheet>;
const INK = { b30: B30Drawing, chart: ChartDrawing, pez: PezDrawing };

export function drawingTags(name: DrawingName, view: string): Tag[] {
	return SHEETS[name].views[view]?.tags ?? [];
}

export function Drawing({ name, view }: { name: DrawingName; view: string }) {
	const Ink = INK[name];
	return <Ink view={view} />;
}
