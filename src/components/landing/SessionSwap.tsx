"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useHeaderSession } from "@/components/useHeaderSession";

const PrefetchOff = createContext(false);

export function usePrefetchOff(): boolean {
	return useContext(PrefetchOff);
}

export function SessionSwap({
	live,
	className,
	signedOut,
	signedIn,
}: {
	live: boolean;
	className: string;
	signedOut: ReactNode;
	signedIn: ReactNode;
}) {
	const session = useHeaderSession();
	if (!live) return signedOut;
	const on = session.signedIn;
	return (
		<div className={`session-swap ${className}`}>
			<div className="session-pane" data-off={on || undefined} inert={on}>
				<PrefetchOff value={true}>{signedOut}</PrefetchOff>
			</div>
			<div className="session-pane" data-off={!on || undefined} inert={!on}>
				<PrefetchOff value={!on}>{signedIn}</PrefetchOff>
			</div>
		</div>
	);
}
