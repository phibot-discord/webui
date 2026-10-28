"use client";

import {
	ArrowsClockwise,
	CheckCircle,
	Crown,
	LockSimple,
	XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import type { MpData, MpRoom } from "@/lib/phira-mp";
import { PHIRA_MP_SERVER } from "@/lib/site";

function Room({ room }: { room: MpRoom }) {
	const { m } = useI18n();
	const t = m.mp;
	return (
		<li className="mp-room">
			<div className="mp-room-head">
				<h3>{room.id}</h3>
				<span className="mp-state" data-state={room.state}>
					{t.states[room.state]}
				</span>
			</div>
			{room.locked || room.cycle ? (
				<ul className="mp-tags">
					{room.locked ? (
						<li>
							<LockSimple size={14} weight="bold" aria-hidden />
							{t.locked}
						</li>
					) : null}
					{room.cycle ? (
						<li>
							<ArrowsClockwise size={14} weight="bold" aria-hidden />
							{t.cycle}
						</li>
					) : null}
				</ul>
			) : null}
			<p className="mp-chart">
				<span>{t.chart}</span>
				{room.chart ?? <em>{t.noChart}</em>}
			</p>
			<div className="mp-members">
				<h4>{t.members.replace("{n}", String(room.players.length))}</h4>
				{room.players.length ? (
					<ul className="mp-players">
						{room.players.map((p) => (
							<li key={p.name} data-host={p.host || undefined}>
								{p.host ? (
									<>
										<Crown size={14} weight="fill" aria-hidden />
										<span className="sr-only">{`${t.host}: `}</span>
									</>
								) : null}
								{p.name}
							</li>
						))}
					</ul>
				) : (
					<p className="mp-nobody">{t.noPlayers}</p>
				)}
			</div>
		</li>
	);
}

export function MpBoard({ data }: { data: MpData }) {
	const { locale, m } = useI18n();
	const t = m.mp;
	const router = useRouter();
	const tag = localeTag(locale);
	const count = new Intl.NumberFormat(tag);
	const time = new Intl.DateTimeFormat(tag, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZone: "UTC",
	});

	useEffect(() => {
		const id = window.setInterval(() => router.refresh(), 15_000);
		return () => window.clearInterval(id);
	}, [router]);

	const rooms = data.rooms;
	const playing = rooms?.filter((r) => r.state === "playing").length;
	const Icon = data.up ? CheckCircle : XCircle;

	return (
		<>
			<header className="status-head">
				<h1>{t.title}</h1>
				<p className="lede">{t.lede}</p>
				<p className="mp-address">
					{t.address} <code>{PHIRA_MP_SERVER}</code>
				</p>
			</header>
			<div className={`status-banner ${data.up ? "is-up" : "is-down"}`}>
				<Icon size={22} weight="fill" aria-hidden="true" />
				<p>{data.up ? t.online : t.offline}</p>
				<span className="status-updated">
					{t.updated} {time.format(data.checkedAt)} UTC
				</span>
			</div>
			<dl className="status-stats mp-stats">
				<div>
					<dt>{t.players}</dt>
					<dd>{data.players == null ? "–" : count.format(data.players)}</dd>
				</div>
				<div>
					<dt>{t.rooms}</dt>
					<dd>
						{rooms ? count.format(rooms.length) : "–"}
						{playing != null ? (
							<span className="status-sub">
								{t.playing.replace("{n}", count.format(playing))}
							</span>
						) : null}
					</dd>
				</div>
			</dl>
			<section className="mp-list" aria-labelledby="mp-rooms">
				<h2 id="mp-rooms">{t.roomList}</h2>
				{rooms == null ? (
					<p className="status-empty">{t.roomsFailed}</p>
				) : rooms.length ? (
					<ul className="mp-rooms">
						{rooms.map((room) => (
							<Room key={room.id} room={room} />
						))}
					</ul>
				) : (
					<p className="status-empty">{t.noRooms}</p>
				)}
			</section>
			<p className="status-note">
				<Link href="/status">{t.statusLink}</Link>
			</p>
		</>
	);
}
