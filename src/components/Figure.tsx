import { Drawing, type DrawingName, drawingTags } from "@/components/Drawing";
import { FigureFrame } from "@/components/FigureFrame";

export type FigurePart = { name: string; note?: string };

export function Figure({
	name,
	view = "exploded",
	label,
	caption,
	parts,
	className,
}: {
	name: DrawingName;
	view?: string;
	label: string;
	caption: string;
	parts?: Record<string, FigurePart>;
	className?: string;
}) {
	const tags = parts ? drawingTags(name, view) : [];
	return (
		<FigureFrame className={`fig${className ? ` ${className}` : ""}`}>
			<Drawing name={name} view={view} />
			<figcaption className="fig-caption">
				<p className="fig-title">
					<span className="fig-label caps-label">{label}</span>
					<span>{caption}</span>
				</p>
				{tags.length ? (
					<ol className="fig-parts">
						{tags.map((t) => {
							const part = parts?.[t.id];
							if (!part) return null;
							return (
								<li key={t.id} data-part={t.id}>
									<span className="fig-n" aria-hidden="true">
										{t.n}
									</span>
									<span className="fig-name">{part.name}</span>
									{part.note ? (
										<span className="fig-note">{part.note}</span>
									) : null}
								</li>
							);
						})}
					</ol>
				) : null}
			</figcaption>
		</FigureFrame>
	);
}
