"use client";

import { useFormStatus } from "react-dom";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

/**
 * Submit button of a signInDiscord form. The label switches while the action
 * runs; both labels size the button so it keeps its width
 */
export function SignInButton() {
	const { m } = useI18n();
	const { pending } = useFormStatus();
	return (
		<button
			className="btn btn-primary btn-skew"
			type="submit"
			aria-busy={pending || undefined}
		>
			<span className="skew-steady">
				<span className="btn-steady-sizer" aria-hidden="true">
					<span>{m.signIn}</span>
					<span>{m.home.signingIn}</span>
				</span>
				<span className="btn-steady-live">
					{pending ? m.home.signingIn : m.signIn}
				</span>
			</span>
		</button>
	);
}

/** Says "Opening Discord…" while the enclosing sign-in form submits */
export function SignInStatus() {
	const { m } = useI18n();
	const { pending } = useFormStatus();
	return <Announce>{pending ? m.home.signingIn : ""}</Announce>;
}
