import type { CSSProperties } from "react";
import type { DrawingName, Sheet } from "@/components/Drawing";

export function DrawingInk({
	name,
	sheet,
	view,
}: {
	name: DrawingName;
	sheet: object;
	view: string;
}) {
	const drawn = (sheet as Sheet).views[view];
	if (!drawn) return null;
	return (
		<div
			className="drawing"
			data-drawing={name}
			style={{ "--ratio": drawn.ratio } as CSSProperties}
			aria-hidden="true"
		>
			<svg
				viewBox={drawn.viewBox}
				focusable="false"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: ink generated at build time by tools/drawings
				dangerouslySetInnerHTML={{ __html: drawn.svg }}
			/>
			{drawn.tags.map((t) => (
				<span
					key={t.id}
					className="drawing-tag"
					data-part={t.id}
					style={{ left: `${t.x}%`, top: `${t.y}%` }}
				>
					{t.n}
				</span>
			))}
		</div>
	);
}
