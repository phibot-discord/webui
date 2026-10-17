"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { RevealCurrent } from "./RevealCurrent";

export type TocItem = { id: string; title: string };

type TocState = { items: TocItem[]; active: string | undefined };

const TocContext = createContext<TocState>({ items: [], active: undefined });

export function TocProvider({
	items,
	children,
}: {
	items: TocItem[];
	children: ReactNode;
}) {
	const [active, setActive] = useState(items[0]?.id);

	useEffect(() => {
		const nodes = items
			.map((item) => document.getElementById(item.id))
			.filter((node): node is HTMLElement => node !== null);
		if (!nodes.length) return;
		let frame = 0;
		const update = () => {
			frame = 0;
			const atEnd =
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - 2;
			const line = Math.max(120, window.innerHeight * 0.3);
			let current = atEnd ? nodes[nodes.length - 1] : nodes[0];
			if (!atEnd) {
				for (const node of nodes) {
					if (node.getBoundingClientRect().top > line) break;
					current = node;
				}
			}
			if (current) setActive(current.id);
		};
		const onMove = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onMove, { passive: true });
		window.addEventListener("resize", onMove);
		return () => {
			window.removeEventListener("scroll", onMove);
			window.removeEventListener("resize", onMove);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [items]);

	const value = useMemo(() => ({ items, active }), [items, active]);
	return <TocContext.Provider value={value}>{children}</TocContext.Provider>;
}

export function CollectionToc({
	label,
	variant,
}: {
	label: string;
	variant: "aside" | "popover";
}) {
	const { items, active } = useContext(TocContext);
	const popover = useRef<HTMLDetailsElement>(null);

	if (!items.length) return null;

	const list = (
		<ul>
			{items.map((item) => (
				<li key={item.id}>
					<a
						href={`#${item.id}`}
						aria-current={item.id === active ? "location" : undefined}
						onClick={() => {
							if (popover.current) popover.current.open = false;
						}}
					>
						{item.title}
					</a>
				</li>
			))}
		</ul>
	);
	const reveal = (
		<RevealCurrent
			current={active}
			within={variant === "aside" ? ".files-toc" : ".toc-pop .toc"}
		/>
	);

	if (variant === "popover") {
		const current = items.find((item) => item.id === active);
		return (
			<details className="toc-pop" ref={popover}>
				<summary>
					<span className="toc-pop-label">{label}</span>
					<span className="toc-pop-current">{current?.title}</span>
				</summary>
				<nav className="toc" aria-label={label}>
					{reveal}
					{list}
				</nav>
			</details>
		);
	}

	return (
		<nav className="toc" aria-label={label}>
			<p className="toc-title">{label}</p>
			{reveal}
			{list}
		</nav>
	);
}
