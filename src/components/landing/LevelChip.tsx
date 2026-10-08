export function LevelChip({
	rank,
	level,
}: {
	rank: "EZ" | "HD" | "IN" | "AT";
	level: string;
}) {
	return (
		<span
			className={`chart-level chart-level-${rank} level-chip`}
			aria-hidden="true"
		>
			{rank}
			<span>{level}</span>
		</span>
	);
}
