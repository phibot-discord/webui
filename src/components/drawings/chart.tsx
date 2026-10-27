"use client";

import { DrawingInk } from "@/components/DrawingInk";
import sheet from "@/drawings/chart.json";

export function ChartDrawing({ view }: { view: string }) {
	return <DrawingInk name="chart" sheet={sheet} view={view} />;
}
