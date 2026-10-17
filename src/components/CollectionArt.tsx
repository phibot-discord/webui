"use client";

import { ArrowsOut } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { ViewArt } from "@/lib/collection-art";
import { CardLightbox } from "./CardLightbox";

export function CollectionArt({
	art,
	title,
	eager = false,
}: {
	art: ViewArt;
	title: string;
	eager?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const opener = useRef<HTMLButtonElement>(null);
	return (
		<figure className="coll-art" data-layout={art.layout}>
			<button
				ref={opener}
				type="button"
				className="coll-art-open"
				aria-label={art.open}
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
			>
				{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
				<img
					src={art.src}
					alt={art.alt}
					width={art.width}
					height={art.height}
					loading={eager ? "eager" : "lazy"}
					fetchPriority={eager ? "high" : undefined}
					decoding="async"
					draggable={false}
				/>
				<span className="coll-art-badge" aria-hidden="true">
					<ArrowsOut size={18} />
				</span>
			</button>
			{open ? (
				<CardLightbox
					url={art.src}
					fullUrl={art.full}
					alt={art.alt}
					title={title}
					width={art.width}
					height={art.height}
					areaLabel={art.area}
					onClose={() => {
						setOpen(false);
						opener.current?.focus({ preventScroll: true });
					}}
				/>
			) : null}
		</figure>
	);
}
