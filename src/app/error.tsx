"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/provider";

export default function RouteError({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	const { m } = useI18n();

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main id="content" className="page status-page">
			<p className="status-code">{m.error.code}</p>
			<h1>{m.error.title}</h1>
			<p className="lede">{m.error.body}</p>
			<div className="status-actions">
				<button
					className="btn btn-primary"
					type="button"
					onClick={() => retry()}
				>
					{m.error.retry}
				</button>
				<Link className="btn btn-ghost" href="/">
					{m.error.home}
				</Link>
			</div>
			{error.digest ? (
				<p className="status-digest">
					{m.error.digest}: {error.digest}
				</p>
			) : null}
		</main>
	);
}
