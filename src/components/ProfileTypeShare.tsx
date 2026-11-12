"use client";

import { useEffect, useRef, useState } from "react";

export function ProfileTypeShare({
	text,
	copy,
	copied,
}: {
	text: string;
	copy: string;
	copied: string;
}) {
	const timer = useRef<number | undefined>(undefined);
	const [done, setDone] = useState(false);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function share() {
		window.clearTimeout(timer.current);
		try {
			await navigator.clipboard.writeText(text);
			setDone(true);
			timer.current = window.setTimeout(() => setDone(false), 2000);
		} catch {
			setDone(false);
		}
	}

	return (
		<button
			type="button"
			className="btn btn-ghost"
			onClick={() => void share()}
		>
			{done ? copied : copy}
		</button>
	);
}
