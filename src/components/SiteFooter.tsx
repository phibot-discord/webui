import { Heart } from "@phosphor-icons/react/ssr";
import type { Messages } from "@/i18n/messages";

const GITHUB = "https://github.com/YueMiyuki";

export function SiteFooter({ m }: { m: Messages }) {
	return (
		<footer className="site-foot">
			<p>
				{m.credit.before}
				<Heart
					className="site-foot-heart"
					weight="fill"
					size={14}
					aria-label={m.credit.heart}
				/>
				{m.credit.after}
				<a href={GITHUB} rel="noopener noreferrer" target="_blank">
					{m.credit.name}
				</a>
			</p>
		</footer>
	);
}
