"use client";

import { DrawingInk } from "@/components/DrawingInk";
import sheet from "@/drawings/pez.json";

export function PezDrawing({ view }: { view: string }) {
	return <DrawingInk name="pez" sheet={sheet} view={view} />;
}
