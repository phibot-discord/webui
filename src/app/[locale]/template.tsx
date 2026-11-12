import { type ReactNode, ViewTransition } from "react";

export default function Template({ children }: { children: ReactNode }) {
	return (
		<ViewTransition enter="page-in" exit="page-out" default="none">
			{children}
		</ViewTransition>
	);
}
