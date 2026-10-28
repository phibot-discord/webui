"use client";

import { useLinkStatus } from "next/link";
import { type ComponentProps, createContext, useContext } from "react";
import Link from "@/components/LocaleLink";
import type { NavView } from "@/lib/files-view";

export type Pending = { view: NavView; swap: boolean };

export type Go = (
	href: string,
	opts?: { scroll?: boolean; replace?: boolean },
) => boolean;

export const FrameContext = createContext<
	| {
			go: Go;
			pending: Pending | undefined;
			shown: Pending | undefined;
			loading: string;
			register: () => () => void;
	  }
	| undefined
>(undefined);

export function FilesLink({
	href,
	scroll,
	replace,
	prefetch = false,
	...props
}: Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
	href: string;
}) {
	const frame = useContext(FrameContext);
	return (
		<Link
			{...props}
			href={href}
			scroll={scroll}
			replace={replace}
			prefetch={prefetch}
			onNavigate={
				frame
					? (e) => {
							if (frame.go(href, { scroll, replace })) e.preventDefault();
						}
					: undefined
			}
		/>
	);
}

export function ViewPending({
	view,
	className,
}: {
	view: NavView;
	className: string;
}) {
	const { pending } = useLinkStatus();
	const target = useContext(FrameContext)?.pending?.view;
	return pending || target === view ? (
		<span className={className} aria-hidden="true" />
	) : null;
}
