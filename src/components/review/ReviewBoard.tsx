"use client";

import { type CSSProperties, useRef } from "react";
import { ArrowUp } from "@/components/icons";
import { useI18n } from "@/i18n/provider";
import { type DeckCard, tileCard } from "@/lib/review-deck";
import type { WrappedTile } from "@/lib/wrapped";
import { Roll } from "./DeckParts";
import { useEnter } from "./useEnter";

const NUMERIC = /^[\d.,\s→+-]+$/;
const WHOLE = /^\d+$/;

export function ReviewBoard({
	tiles,
	cards,
	onShow,
}: {
	tiles: readonly WrappedTile[];
	cards: readonly DeckCard[] | null;
	onShow: (card: DeckCard) => void;
}) {
	const { m } = useI18n();
	const board = useRef<HTMLDListElement>(null);
	const enter = useEnter(board);
	return (
		<div className="rb">
			<dl ref={board} className="review-facts" data-enter={enter ?? undefined}>
				{tiles.map((tile, i) => {
					const card = tileCard(i);
					const thin = tile.value === "—";
					const shown = card !== null && !thin && cards?.includes(card);
					return (
						<div
							key={tile.label}
							className="rb-tile"
							data-card={card ?? undefined}
							data-thin={thin ? "" : undefined}
							style={{ "--i": i } as CSSProperties}
						>
							<dt>{tile.label}</dt>
							<dd>
								<span
									className="rb-value"
									data-num={NUMERIC.test(tile.value) ? "" : undefined}
								>
									{WHOLE.test(tile.value) ? (
										<Roll value={Number(tile.value)} active={enter === "in"} />
									) : (
										tile.value
									)}
								</span>
								{tile.sub ? <span className="rb-sub">{tile.sub}</span> : null}
								{shown && card ? (
									<span className="rb-act">
										<button
											type="button"
											className="btn btn-ghost btn-sm rb-show"
											onClick={() => onShow(card)}
										>
											<ArrowUp size={12} weight="bold" aria-hidden />
											{m.wrapped.deck.show}
										</button>
									</span>
								) : null}
							</dd>
						</div>
					);
				})}
			</dl>
		</div>
	);
}
