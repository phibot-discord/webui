import type { CSSProperties } from "react";
import {
	DED_CURSOR,
	DED_INDICATOR,
	DED_LAYERS,
	type DedLayer,
	type DedView,
	levelsGain,
} from "@/lib/deduction";
import { keyed } from "@/lib/texts";

export type DeductionArt = {
	layers: Partial<Record<DedLayer, string>>;
	gradient: string | null;
};

export function DeductionStage({
	art,
	view,
	font,
}: {
	art: DeductionArt;
	view: DedView;
	font?: string;
}) {
	const gain = levelsGain(view.levels);
	return (
		<div
			className="ded-canvas"
			aria-hidden="true"
			style={font ? ({ "--ded-font": font } as CSSProperties) : undefined}
		>
			<div
				className="ded-scene"
				style={gain > 1.0001 ? { filter: `brightness(${gain})` } : undefined}
			>
				{DED_LAYERS.map((id) => {
					const src = art.layers[id];
					const alpha = view.layers[id];
					if (!src) return null;
					return (
						// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
						<img
							key={id}
							className="ded-layer"
							src={src}
							alt=""
							decoding="async"
							draggable={false}
							style={{
								opacity: alpha,
								visibility: alpha > 0 ? undefined : "hidden",
							}}
						/>
					);
				})}
				{art.gradient ? (
					<div
						className="ded-gradient"
						style={{
							opacity: view.gradient,
							backgroundImage: `url(${JSON.stringify(art.gradient)})`,
						}}
					/>
				) : null}
				<div className="ded-text" style={{ opacity: view.group }}>
					<div className="ded-box">
						{keyed(view.lines, (line) => `${view.page}:${line.full}`).map(
							({ key, item: line }) => (
								<div key={key} className="ded-line">
									<span className="ded-ghost">{line.full}</span>
									<span className="ded-shown">
										{line.shown === null ? "" : line.full.slice(0, line.shown)}
										{line.shown !== null && line.shown < line.full.length ? (
											<span
												className="ded-cursor"
												style={
													line.cursor ? undefined : { visibility: "hidden" }
												}
											>
												{DED_CURSOR}
											</span>
										) : null}
									</span>
								</div>
							),
						)}
						<div className="ded-next" style={{ opacity: view.indicator }}>
							{DED_INDICATOR}
						</div>
					</div>
				</div>
			</div>
			{view.levels > 0 ? (
				<div
					className="ded-white"
					style={{ opacity: Math.min(1, view.levels) }}
				/>
			) : null}
		</div>
	);
}
