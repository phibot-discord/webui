export function PageSkeleton({
	className,
	label,
	lines = 6,
}: {
	className: string;
	label: string;
	lines?: number;
}) {
	return (
		<main id="content" className={`page ${className}`} aria-busy="true">
			<p className="sr-only" role="status">
				{label}
			</p>
			<div className="page-skeleton" aria-hidden="true">
				<span className="sk sk-title" />
				<span className="sk sk-lede" />
				<div className="sk-lines">
					{[...Array(lines).keys()].map((n) => (
						<span key={n} className="sk sk-line" />
					))}
				</div>
			</div>
		</main>
	);
}
