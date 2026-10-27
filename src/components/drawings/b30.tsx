"use client";

import { DrawingInk } from "@/components/DrawingInk";
import sheet from "@/drawings/b30.json";

export function B30Drawing({ view }: { view: string }) {
	return <DrawingInk name="b30" sheet={sheet} view={view} />;
}
