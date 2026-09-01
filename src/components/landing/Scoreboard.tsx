const ROWS = [
	{ n: "01", song: "Glaciaxion", rank: "AT", rks: "16.24", phi: true },
	{ n: "02", song: "Crush BETA", rank: "IN", rks: "15.91", phi: true },
	{ n: "03", song: "Another Me", rank: "AT", rks: "15.77", phi: true },
	{ n: "04", song: "PRAGMATISM", rank: "IN", rks: "15.62", phi: false },
	{ n: "05", song: "Snow Desert", rank: "AT", rks: "15.48", phi: false },
	{ n: "06", song: "Spasmodic", rank: "IN", rks: "15.21", phi: false },
	{ n: "07", song: "Chronologika", rank: "AT", rks: "15.04", phi: false },
	{ n: "08", song: "Distorted Fate", rank: "IN", rks: "14.88", phi: false },
	{ n: "09", song: "RIPPER", rank: "AT", rks: "14.71", phi: false },
	{
		n: "10",
		song: "ENERGY SYNERGY MATRIX",
		rank: "IN",
		rks: "14.55",
		phi: false,
	},
	{ n: "11", song: "Re_Nascence", rank: "AT", rks: "14.39", phi: false },
	{ n: "12", song: "Cross†Soul", rank: "IN", rks: "14.12", phi: false },
] as const;

export function LandingScoreboard({
	caption,
	rksLabel,
}: {
	caption: string;
	rksLabel: string;
}) {
	return (
		<div className="scoreboard">
			<div className="scoreboard-head">
				<p className="scoreboard-rks" aria-hidden="true">
					16.248
				</p>
				<p className="scoreboard-meta">
					{caption}
					<span aria-hidden="true">
						{" · "}
						{rksLabel}
						{" · phi 3"}
					</span>
				</p>
			</div>
			<ol className="score-rows" aria-hidden="true">
				{ROWS.map((row, i) => (
					<li
						key={row.n}
						className={row.phi ? "score-row is-phi" : "score-row"}
						style={{ ["--i" as string]: i }}
					>
						<span className="score-n">{row.n}</span>
						<span className="score-song">{row.song}</span>
						<span className={`score-rank is-${row.rank.toLowerCase()}`}>
							{row.rank}
						</span>
						<span className="score-rks">{row.rks}</span>
					</li>
				))}
			</ol>
		</div>
	);
}
