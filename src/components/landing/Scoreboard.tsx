const SAMPLE = "/landing/b30-sample.jpg";

export function LandingScoreboard({
	title,
	lede,
	linkLabel,
}: {
	title: string;
	lede: string;
	linkLabel: string;
}) {
	return (
		<section className="board" aria-labelledby="board-title">
			<div className="board-panel">
				<div className="board-copy">
					<h2 id="board-title">{title}</h2>
					<p className="board-lede">{lede}</p>
					<a
						className="board-link"
						href={SAMPLE}
						target="_blank"
						rel="noopener noreferrer"
					>
						{linkLabel} <span aria-hidden="true">→</span>
					</a>
				</div>
				<figure className="board-shot">
					<div className="board-window">
						{/* biome-ignore lint/performance/noImgElement: static asset, natural aspect ratio */}
						<img
							src={SAMPLE}
							alt="PhiBot B30 render"
							width={2400}
							height={4498}
							loading="lazy"
							decoding="async"
						/>
					</div>
				</figure>
			</div>
		</section>
	);
}
