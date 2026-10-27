"use client";

import Link from "next/link";
import { signInDiscord } from "@/auth-actions";
import { InviteLink } from "@/components/landing/Invite";
import { SignInButton, SignInStatus } from "@/components/landing/SignIn";
import { useI18n } from "@/i18n/provider";

export function Actions({
	next,
	signedIn,
	secondary,
}: {
	next: string;
	signedIn: boolean;
	secondary: "taptap" | "invite";
}) {
	const { m } = useI18n();
	if (signedIn) {
		return (
			<>
				<Link className="btn btn-primary btn-lg" href="/me/b30">
					{m.home.openDesk}
				</Link>
				<InviteLink className="btn btn-ghost btn-lg" />
			</>
		);
	}
	return (
		<>
			<form action={signInDiscord}>
				<input type="hidden" name="next" value={next} />
				<SignInButton className="btn btn-primary btn-lg" />
				<SignInStatus />
			</form>
			{secondary === "taptap" ? (
				<Link
					className="btn btn-ghost btn-lg"
					href={`/login/taptap?${new URLSearchParams({ next })}`}
				>
					{m.signInTaptap}
				</Link>
			) : (
				<InviteLink className="btn btn-ghost btn-lg" />
			)}
		</>
	);
}

export function AgreeNote() {
	const { m } = useI18n();
	const a = m.legal.agree;
	return (
		<p className="agree-note">
			{a.before}
			<Link href="/tos">{a.terms}</Link>
			{a.and}
			<Link href="/privacy">{a.privacy}</Link>
			{a.after}
		</p>
	);
}
