"use client";

import { useFormStatus } from "react-dom";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

export function SignInButton({
	className = "btn btn-primary btn-skew",
}: {
	className?: string;
}) {
	const { m } = useI18n();
	const { pending } = useFormStatus();
	return (
		<button
			className={className}
			type="submit"
			aria-busy={pending || undefined}
		>
			<span className="skew-steady btn-steady">
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

export function SignInStatus() {
	const { m } = useI18n();
	const { pending } = useFormStatus();
	return <Announce>{pending ? m.home.signingIn : ""}</Announce>;
}
