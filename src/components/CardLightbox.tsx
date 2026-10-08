"use client";

import { ArrowSquareOut, X } from "@phosphor-icons/react";
import {
	type MouseEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useI18n } from "@/i18n/provider";

type Zoom = "screen" | "width" | "actual";
type Anchor = { fx: number; fy: number; x: number; y: number };

export function CardLightbox({
	url,
	alt,
	title,
	width,
	height,
	onClose,
}: {
	url: string;
	alt: string;
	title: string;
	width?: number;
	height?: number;
	onClose: () => void;
}) {
	const { m } = useI18n();
	const dialog = useRef<HTMLDialogElement>(null);
	const scroller = useRef<HTMLElement>(null);
	const image = useRef<HTMLImageElement>(null);
	const anchor = useRef<Anchor>(undefined);
	const titleId = useId();
	const hintId = useId();
	const [zoom, setZoom] = useState<Zoom>(() =>
		typeof window !== "undefined" && window.innerWidth > window.innerHeight
			? "screen"
			: "width",
	);
	const fit = useRef<Exclude<Zoom, "actual">>(
		zoom === "actual" ? "width" : zoom,
	);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		const node = dialog.current;
		if (!node) return;
		if (!node.open) node.showModal();
		scroller.current?.focus({ preventScroll: true });
		const closed = () => {
			if (!node.open) onCloseRef.current();
		};
		node.addEventListener("close", closed);
		return () => {
			node.removeEventListener("close", closed);
			if (node.open) node.close();
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs after each zoom change
	useLayoutEffect(() => {
		const box = scroller.current;
		const img = image.current;
		const at = anchor.current;
		anchor.current = undefined;
		if (!box || !img) return;
		if (!at) {
			box.scrollTo({ left: 0, top: 0 });
			return;
		}
		const b = box.getBoundingClientRect();
		const r = img.getBoundingClientRect();
		box.scrollLeft = r.left - b.left + box.scrollLeft + at.fx * r.width - at.x;
		box.scrollTop = r.top - b.top + box.scrollTop + at.fy * r.height - at.y;
	}, [zoom]);

	const switchTo = (next: Zoom, x?: number, y?: number) => {
		const box = scroller.current;
		const img = image.current;
		if (next === zoom) return;
		if (box && img) {
			const b = box.getBoundingClientRect();
			const r = img.getBoundingClientRect();
			const px = x ?? box.clientWidth / 2;
			const py = y ?? box.clientHeight / 2;
			const clamp = (n: number) => Math.min(1, Math.max(0, n));
			anchor.current = {
				fx: clamp((b.left + px - r.left) / r.width),
				fy: clamp((b.top + py - r.top) / r.height),
				x: px,
				y: py,
			};
		}
		if (next !== "actual") fit.current = next;
		setZoom(next);
	};

	const zoomAt = (e: MouseEvent<HTMLElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		switchTo(
			zoom === "actual" ? fit.current : "actual",
			e.clientX - rect.left,
			e.clientY - rect.top,
		);
	};

	const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	const nativeWidth = width ? Math.round(width / dpr) : undefined;
	const modes: [Zoom, string][] = [
		["screen", m.card.zoomScreen],
		["width", m.card.zoomFit],
		["actual", m.card.zoomActual],
	];

	return (
		<dialog
			ref={dialog}
			className="lightbox"
			aria-labelledby={titleId}
			data-zoom={zoom}
		>
			<div className="lightbox-bar">
				<h2 className="lightbox-title" id={titleId}>
					{title}
				</h2>
				<div className="lightbox-actions">
					{/* biome-ignore lint/a11y/useSemanticElements: toggle buttons, a group label is enough */}
					<div className="lightbox-zoom" role="group" aria-label={m.card.zoom}>
						{modes.map(([mode, label]) => (
							<button
								key={mode}
								type="button"
								className="btn btn-ghost btn-sm"
								aria-pressed={zoom === mode}
								onClick={() => switchTo(mode)}
							>
								{label}
							</button>
						))}
					</div>
					<a
						className="btn btn-ghost btn-sm lightbox-open"
						href={url}
						target="_blank"
						rel="noopener"
					>
						<ArrowSquareOut aria-hidden="true" size={16} />
						<span className="lightbox-label">{m.card.openFull}</span>
					</a>
					<button
						type="button"
						className="btn btn-ghost btn-icon btn-sm lightbox-close"
						aria-label={m.card.close}
						onClick={() => dialog.current?.close()}
					>
						<X aria-hidden="true" size={18} />
					</button>
				</div>
			</div>
			<section
				ref={scroller}
				className="lightbox-scroll"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll area must be focusable to pan with the keyboard
				tabIndex={0}
				aria-label={m.card.zoomArea}
				aria-describedby={hintId}
				onDoubleClick={zoomAt}
			>
				<img
					ref={image}
					src={url}
					alt={alt}
					width={width}
					height={height}
					draggable={false}
					style={
						zoom === "actual" && nativeWidth
							? { width: nativeWidth }
							: undefined
					}
				/>
			</section>
			<p className="lightbox-hint" id={hintId}>
				<span className="lightbox-hint-touch">{m.card.zoomHint}</span>
				<span className="lightbox-hint-mouse">{m.card.zoomHintMouse}</span>
			</p>
		</dialog>
	);
}
