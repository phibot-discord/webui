"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { saveBlob } from "@/lib/apk-version";
import { localePath } from "@/lib/locale-path";
import { SITE_ORIGIN } from "@/lib/site";
import {
	autoTiers,
	cleanTitle,
	decodeTiers,
	encodeTiers,
	IMAGE,
	imageLayout,
	type Placed,
	TIER_COLORS,
	TIERS,
	TITLE_MAX,
	type Tier,
	tileSpot,
} from "@/lib/tier-list";
import { fill } from "@/phi/lib/card-i18n";
import type { TierItem } from "@/server/tier-list";

const SETTLE_MS = 400;
const COPIED_MS = 2000;
const FONT = "system-ui, sans-serif";

type Rows = Record<Tier, TierItem[]>;

function tiersPath(
	level: number,
	keys: readonly string[],
	placed: Placed,
	title: string,
): string {
	const q = new URLSearchParams({ l: String(level) });
	const code = encodeTiers(keys, placed);
	if (code) q.set("t", code);
	const name = cleanTitle(title);
	if (name) q.set("n", name);
	return `/tiers?${q}`;
}

function loadJacket(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("jacket"));
		img.src = `${url}${url.includes("?") ? "&" : "?"}cors=1`;
	});
}

function box(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	radius: number,
) {
	if (typeof ctx.roundRect !== "function") {
		ctx.fillRect(x, y, w, h);
		return;
	}
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, radius);
	ctx.fill();
}

async function drawPicture(
	heading: string,
	mark: string,
	rows: Rows,
): Promise<Blob | null> {
	const layout = imageLayout(TIERS.map((tier) => rows[tier].length));
	const canvas = document.createElement("canvas");
	canvas.width = IMAGE.width;
	canvas.height = layout.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const urls = [
		...new Set(
			TIERS.flatMap((tier) => rows[tier].flatMap((i) => i.jacket ?? [])),
		),
	];
	const settled = await Promise.allSettled(urls.map(loadJacket));
	const jackets = new Map<string, HTMLImageElement>();
	settled.forEach((got, i) => {
		const url = urls[i];
		if (url && got.status === "fulfilled") jackets.set(url, got.value);
	});
	ctx.fillStyle = "#14161a";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#ffffff";
	ctx.font = `bold 44px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(heading, IMAGE.pad, 64, IMAGE.width - IMAGE.pad * 2);
	TIERS.forEach((tier, r) => {
		const row = layout.rows[r];
		if (!row) return;
		const labelW = IMAGE.label - IMAGE.gap;
		ctx.fillStyle = "#1d2026";
		box(
			ctx,
			IMAGE.pad + IMAGE.label,
			row.y,
			IMAGE.width - IMAGE.pad * 2 - IMAGE.label,
			row.height,
			8,
		);
		ctx.fillStyle = TIER_COLORS[tier];
		box(ctx, IMAGE.pad, row.y, labelW, row.height, 8);
		ctx.fillStyle = "#14161a";
		ctx.font = `bold 56px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tier, IMAGE.pad + labelW / 2, row.y + row.height / 2);
		rows[tier].forEach((item, i) => {
			const { x, y } = tileSpot(layout, r, i);
			const img = item.jacket ? jackets.get(item.jacket) : undefined;
			if (img) {
				ctx.drawImage(img, x, y, IMAGE.tileW, IMAGE.tileH);
			} else {
				ctx.fillStyle = "#2a2e36";
				ctx.fillRect(x, y, IMAGE.tileW, IMAGE.tileH);
				ctx.fillStyle = "#ffffff";
				ctx.font = `16px ${FONT}`;
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillText(item.title, x + 6, y + 8, IMAGE.tileW - 12);
			}
			ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
			ctx.fillRect(x, y + IMAGE.tileH - 22, IMAGE.tileW, 22);
			ctx.fillStyle = "#ffffff";
			ctx.font = `14px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(
				`${item.rank} ${item.c.toFixed(1)}`,
				x + 6,
				y + IMAGE.tileH - 11,
				IMAGE.tileW - 12,
			);
		});
	});
	ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
	ctx.font = `20px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(mark, IMAGE.pad, layout.height - 20);
	return new Promise((resolve, reject) => {
		try {
			canvas.toBlob(resolve, "image/png");
		} catch (err) {
			reject(err);
		}
	});
}

export function TierList({
	level,
	items,
	mine,
	initial,
}: {
	level: number;
	items: TierItem[];
	mine: Record<string, number> | null;
	initial: { tiers: string; title: string };
}) {
	const { m, locale } = useI18n();
	const t = m.tiers;
	const nameId = useId();
	const keys = useMemo(() => items.map((i) => i.key), [items]);
	const [placed, setPlaced] = useState<Placed>(() =>
		decodeTiers(keys, initial.tiers),
	);
	const [held, setHeld] = useState<Set<string>>(() => new Set());
	const [title, setTitle] = useState(initial.title);
	const [copied, setCopied] = useState(false);
	const [picture, setPicture] = useState<"idle" | "busy" | "failed">("idle");
	const path = tiersPath(level, keys, placed, title);
	const written = useRef(path);
	const copiedTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (path === written.current) return;
		const timer = window.setTimeout(() => {
			written.current = path;
			window.history.replaceState(null, "", localePath(path, locale));
		}, SETTLE_MS);
		return () => window.clearTimeout(timer);
	}, [path, locale]);

	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

	const board = useMemo(() => {
		const rows = Object.fromEntries(
			TIERS.map((tier) => [tier, [] as TierItem[]]),
		) as Rows;
		const loose: TierItem[] = [];
		for (const item of items) {
			const tier = placed[item.key];
			if (tier) rows[tier].push(item);
			else loose.push(item);
		}
		return { rows, loose };
	}, [items, placed]);

	function toggle(key: string) {
		setHeld((prev) => {
			const next = new Set(prev);
			if (!next.delete(key)) next.add(key);
			return next;
		});
	}

	function place(tier: Tier) {
		if (!held.size) return;
		setPlaced((prev) => {
			const next = { ...prev };
			for (const key of held) next[key] = tier;
			return next;
		});
		setHeld(new Set());
	}

	function unplace() {
		if (!held.size) return;
		setPlaced(
			(prev) =>
				Object.fromEntries(
					Object.entries(prev).filter(([key]) => !held.has(key)),
				) as Placed,
		);
		setHeld(new Set());
	}

	function fillMine() {
		if (!mine) return;
		setPlaced(
			autoTiers(items.map((i) => ({ key: i.key, acc: mine[i.key] ?? null }))),
		);
	}

	function clear() {
		setPlaced({});
		setHeld(new Set());
	}

	async function copy() {
		window.clearTimeout(copiedTimer.current);
		written.current = path;
		window.history.replaceState(null, "", localePath(path, locale));
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			copiedTimer.current = window.setTimeout(
				() => setCopied(false),
				COPIED_MS,
			);
		} catch {
			setCopied(false);
		}
	}

	async function download() {
		setPicture("busy");
		try {
			const blob = await drawPicture(
				cleanTitle(title) || `${t.level} ${level}`,
				fill(t.mark, { host: new URL(SITE_ORIGIN).host }),
				board.rows,
			);
			if (!blob) {
				setPicture("failed");
				return;
			}
			saveBlob(blob, `tier-list-${level}.png`);
			setPicture("idle");
		} catch {
			setPicture("failed");
		}
	}

	const tile = (item: TierItem) => (
		<li key={item.key}>
			<button
				type="button"
				className="tier-tile"
				aria-pressed={held.has(item.key)}
				title={fill(t.tile, {
					title: item.title,
					level: item.rank,
					c: item.c.toFixed(1),
				})}
				onClick={() => toggle(item.key)}
			>
				{item.jacket ? (
					// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
					<img
						src={item.jacket}
						alt=""
						loading="lazy"
						decoding="async"
						width={128}
						height={68}
					/>
				) : null}
				<span className="tier-name">{item.title}</span>
				<span className="tier-meta">
					<span className={`chart-level chart-level-${item.rank}`}>
						{item.rank}
					</span>{" "}
					{item.c.toFixed(1)}
				</span>
			</button>
		</li>
	);

	const note = [
		copied ? t.copied : "",
		picture === "busy"
			? t.imageBusy
			: picture === "failed"
				? t.imageFailed
				: "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="tier-board">
			<div className="field field-col">
				<label className="field-label" htmlFor={nameId}>
					{t.name}
				</label>
				<input
					id={nameId}
					className="input"
					maxLength={TITLE_MAX}
					placeholder={t.namePlaceholder}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</div>
			<p className="field-hint">{t.how}</p>
			{held.size ? (
				<p className="field-hint" role="status">
					{fill(t.held, { n: held.size })}
				</p>
			) : null}
			{TIERS.map((tier) => (
				<section key={tier} className="tier-row" data-tier={tier}>
					<button
						type="button"
						className="tier-label"
						disabled={!held.size}
						aria-label={fill(t.moveTo, { tier })}
						title={fill(t.moveTo, { tier })}
						onClick={() => place(tier)}
					>
						{tier}
					</button>
					<ul className="tier-tiles">
						{board.rows[tier].length ? (
							board.rows[tier].map(tile)
						) : (
							<li className="muted">{t.rowEmpty}</li>
						)}
					</ul>
				</section>
			))}
			<section className="tier-tray">
				<div className="tier-tray-head">
					<h2>{t.unsorted}</h2>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						disabled={!held.size}
						onClick={unplace}
					>
						{t.moveBack}
					</button>
				</div>
				{board.loose.length ? (
					<ul className="tier-tiles">{board.loose.map(tile)}</ul>
				) : (
					<p className="field-hint">{t.unsortedEmpty}</p>
				)}
			</section>
			<div className="tier-actions">
				{mine ? (
					<button
						type="button"
						className="btn btn-ghost"
						title={t.fillHint}
						onClick={fillMine}
					>
						{t.fill}
					</button>
				) : null}
				<button type="button" className="btn btn-ghost" onClick={clear}>
					{t.clear}
				</button>
				<button
					type="button"
					className="btn btn-ghost"
					onClick={() => void copy()}
				>
					{t.copy}
				</button>
				<button
					type="button"
					className="btn btn-primary"
					disabled={picture === "busy"}
					onClick={() => void download()}
				>
					{t.image}
				</button>
			</div>
			<p className="field-hint" role="status">
				{note}
			</p>
		</div>
	);
}
