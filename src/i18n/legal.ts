import type { Locale } from "@/i18n/config";

export type LegalSection = {
	id: string;
	title: string;
	tldr: string;
	body: (string | string[])[];
};
export type LegalDoc = {
	title: string;
	lede: string;
	sections: LegalSection[];
};

export const LEGAL_UPDATED = "2026-10-31";

const GITHUB = "https://github.com/phibot-discord/webui";

export const terms: Record<Locale, LegalDoc> = {
	en: {
		title: "Terms of use",
		lede: "The rules for using PhiBot, the website and the Discord bot. Short on purpose.",
		sections: [
			{
				id: "about",
				title: "What PhiBot is",
				tldr: "A free, unofficial fan tool that draws Phigros score cards.",
				body: [
					"PhiBot draws Phigros score cards (B30, history, player info and more) from your Phigros cloud save, on this website and in Discord. It is a free fan project run by MiyukiYue.",
					"PhiBot is not made, endorsed or supported by Pigeon Games (the developer of Phigros), TapTap or Discord.",
				],
			},
			{
				id: "agree",
				title: "Agreeing to these terms",
				tldr: "Using PhiBot means you accept these terms and the privacy policy.",
				body: [
					"By signing in, binding a save or adding the bot to a Discord server, you agree to these terms and to the [privacy policy](/privacy). If you do not agree, do not use PhiBot.",
					"Some pages, such as nicknames and tags, work without signing in. These terms apply to them too.",
				],
			},
			{
				id: "account",
				title: "Your account and your save",
				tldr: "Bind only your own save; PhiBot reads it, never changes it, and you can unbind any time.",
				body: [
					[
						"You sign in with Discord or TapTap. Keep that account secure: what happens under it is your responsibility.",
						"Bind only a Phigros save that is yours. Binding stores a session token that lets PhiBot read the save; the privacy policy explains what is kept.",
						"PhiBot reads your save to draw cards. It does not change your save.",
						"You can unbind at any time. Unbinding deletes the stored token.",
						"Scores you type in by hand are drawn as you typed them. You can clear them at any time.",
					],
				],
			},
			{
				id: "fair-use",
				title: "Fair use",
				tldr: "Don't misuse other people's saves, flood the service or probe its security.",
				body: [
					"Please do not:",
					[
						"read, bind or publish a save that is not yours;",
						"flood PhiBot with requests, scrape it, or get around its rate limits;",
						"look for or use security holes, or try to reach other people's data;",
						"use PhiBot for anything unlawful, or to harass other players.",
					],
					"Access can be limited, suspended or ended for anyone who breaks these rules or puts the service at risk.",
				],
			},
			{
				id: "sharing",
				title: "Share links",
				tldr: "Share links, comparing and the badge show your scores to others, and only when you turn them on.",
				body: [
					"A share link lets anyone who has it see your B30, History and Info cards. Share only what you are happy to show.",
					"**Allow compare** is a separate switch in the Share link menu, off until you turn it on. With it on, anyone with your link can compare every score in your save with theirs, chart by chart.",
					"The **RKS badge** is an image of your player name, RKS and Challenge level that works through your share link. Anyone who sees the image sees those.",
					"You can turn sharing off at any time. The link, the badge and comparing all stop working at once.",
				],
			},
			{
				id: "content",
				title: "Game content and your cards",
				tldr: "Game art belongs to its owners; the cards PhiBot draws for you are yours to share.",
				body: [
					"Song titles, jacket art, illustrations and other Phigros material belong to Pigeon Games and the artists. PhiBot shows them only to draw your cards and to help players, free of charge. If you own some of this material and want it removed, say so on [GitHub](" +
						GITHUB +
						").",
					"The cards PhiBot draws for you are yours to save and share.",
					"PhiBot's source code is open under the GNU GPL v3.0. These terms cover the hosted service, not your rights under that licence.",
				],
			},
			{
				id: "guess",
				title: "Guess the song",
				tldr: "The leaderboard is for fun: no bots, no scripts, no shared answers.",
				body: [
					"The daily leaderboard ranks players who solved the puzzle by tries, then by time. Play it yourself: do not automate guesses, script requests, or pass answers around to climb it.",
					"Entries that look automated or abusive may be removed. Times and ranks can be wrong, and there is nothing to win.",
				],
			},
			{
				id: "no-guarantees",
				title: "No guarantees",
				tldr: "Free and as is: it can break, be wrong or shut down.",
				body: [
					"PhiBot is provided as is, for free. It may be slow or down, lose data, or show wrong numbers. RKS, rankings and estimates are worked out by PhiBot or come from third parties such as phib19.top, and can differ from the game.",
					"Binding uses the same cloud login as the game. PhiBot only reads your save, but nobody can promise how Pigeon Games or TapTap treat third-party tools.",
					"Features can change or stop at any time, the whole service included.",
				],
			},
			{
				id: "liability",
				title: "Liability",
				tldr: "As far as the law allows, the operator isn't liable for losses from using PhiBot.",
				body: [
					"As far as the law allows, the operator is not liable for any loss or damage from using PhiBot or from not being able to use it, including lost scores, lost accounts or decisions made from a card. Nothing here takes away rights that the law says cannot be taken away.",
				],
			},
			{
				id: "changes",
				title: "Changes to these terms",
				tldr: "These terms can change; the date at the top says when they last did.",
				body: [
					"These terms may change. The date at the top shows the latest version. If you keep using PhiBot after a change, you accept the new terms.",
				],
			},
			{
				id: "contact",
				title: "Contact",
				tldr: "Reach MiyukiYue on GitHub or by email.",
				body: [
					"Questions, removal requests or reports: open an issue or message MiyukiYue on [GitHub](" +
						GITHUB +
						") or me@miyuki-yue.dev",
				],
			},
		],
	},
	zh: {
		title: "使用条款",
		lede: "使用 PhiBot 网站和 Discord 机器人的规则。尽量写得简短。",
		sections: [
			{
				id: "about",
				title: "PhiBot 是什么",
				tldr: "一个免费的非官方 Phigros 成绩图同人工具。",
				body: [
					"PhiBot 根据你的 Phigros 云存档生成成绩图（B30、成绩历史、玩家信息等），可以在本网站和 Discord 中使用。它是由 MiyukiYue 运营的免费同人项目。",
					"PhiBot 并非由 Pigeon Games（Phigros 开发商）、TapTap 或 Discord 制作、认可或支持。",
				],
			},
			{
				id: "agree",
				title: "同意本条款",
				tldr: "使用 PhiBot 即表示接受本条款和隐私政策。",
				body: [
					"登录、绑定存档或把机器人加入 Discord 服务器，即表示你同意本条款和[隐私政策](/privacy)。如果不同意，请不要使用 PhiBot。",
					"部分页面（例如曲目别名和标签）无需登录即可使用，本条款同样适用。",
				],
			},
			{
				id: "account",
				title: "你的账号和存档",
				tldr: "只绑定自己的存档；PhiBot 只读不改，你可以随时解绑。",
				body: [
					[
						"你通过 Discord 或 TapTap 登录。请保管好账号，账号下发生的操作由你负责。",
						"只绑定属于你自己的 Phigros 存档。绑定会保存一个会话令牌，PhiBot 用它读取存档；具体保存哪些内容见隐私政策。",
						"PhiBot 只读取存档来生成成绩图，不会修改你的存档。",
						"你可以随时解绑。解绑会删除保存的令牌。",
						"手动录入的成绩按你填写的内容出图，你可以随时清除。",
					],
				],
			},
			{
				id: "fair-use",
				title: "合理使用",
				tldr: "不要滥用他人存档、刷爆服务或试探安全漏洞。",
				body: [
					"请不要：",
					[
						"读取、绑定或公开不属于你的存档；",
						"大量发送请求、抓取数据或绕过频率限制；",
						"寻找或利用安全漏洞，或试图获取他人的数据；",
						"将 PhiBot 用于违法用途或骚扰其他玩家。",
					],
					"违反这些规则或危及服务的用户，可能会被限制、暂停或终止使用。",
				],
			},
			{
				id: "sharing",
				title: "分享链接",
				tldr: "分享链接、对比和徽章会向他人展示你的成绩，且只在你打开时生效。",
				body: [
					"任何拿到分享链接的人都能看到你的 B30、历史和信息成绩图。请只分享你愿意公开的内容。",
					"**允许对比**是「分享链接」菜单中的独立开关，默认关闭。打开后，任何拿到你链接的人都能把你存档中的每一项成绩与他们的逐谱对比。",
					"**RKS 徽章**是一张显示你的玩家名、RKS 和课题等级的图片，通过分享链接生效。看到这张图的人都能看到这些信息。",
					"你可以随时关闭分享。关闭后链接、徽章和对比会同时失效。",
				],
			},
			{
				id: "content",
				title: "游戏内容和你的成绩图",
				tldr: "游戏素材归原作者所有；PhiBot 为你生成的成绩图可以自由分享。",
				body: [
					"曲名、曲绘、插画等 Phigros 素材归 Pigeon Games 和各位作者所有。PhiBot 仅为生成成绩图、方便玩家而免费展示这些素材。如果你是相关素材的权利人并希望移除，请在 [GitHub](" +
						GITHUB +
						") 上联系。",
					"PhiBot 为你生成的成绩图，你可以自由保存和分享。",
					"PhiBot 的源代码以 GNU GPL v3.0 开源。本条款只涉及在线服务，不影响你在该许可证下的权利。",
				],
			},
			{
				id: "guess",
				title: "猜曲绘",
				tldr: "排行榜仅供娱乐：不要用脚本、自动化或互相透露答案。",
				body: [
					"每日排行榜按尝试次数、再按用时为猜中的玩家排名。请亲自游玩：不要自动提交答案、用脚本发送请求，或互相透露答案来提升名次。",
					"看起来是自动化或恶意的记录可能会被移除。用时和名次可能有误，也没有任何奖励。",
				],
			},
			{
				id: "no-guarantees",
				title: "不作保证",
				tldr: "免费、按现状提供：可能出错、宕机或停止服务。",
				body: [
					"PhiBot 免费提供，按现状提供。它可能变慢、宕机、丢失数据或显示错误的数字。RKS、排名和估算由 PhiBot 计算或来自 phib19.top 等第三方，可能与游戏内不同。",
					"绑定使用与游戏相同的云端登录。PhiBot 只读取存档，但无法保证 Pigeon Games 或 TapTap 如何看待第三方工具。",
					"功能可能随时变更或停止，包括整个服务。",
				],
			},
			{
				id: "liability",
				title: "责任",
				tldr: "在法律允许范围内，运营者不对使用 PhiBot 造成的损失负责。",
				body: [
					"在法律允许的范围内，运营者不对使用或无法使用 PhiBot 造成的任何损失负责，包括成绩丢失、账号问题或根据成绩图做出的决定。法律规定不可排除的权利不受本条款影响。",
				],
			},
			{
				id: "changes",
				title: "条款变更",
				tldr: "条款可能更新，以页面顶部日期为准。",
				body: [
					"本条款可能会更新，页面顶部的日期是最新版本。变更后继续使用 PhiBot，即表示你接受新条款。",
				],
			},
			{
				id: "contact",
				title: "联系方式",
				tldr: "可通过 GitHub 或邮件联系 MiyukiYue。",
				body: [
					"问题、移除请求或举报：请在 [GitHub](" +
						GITHUB +
						") 上提交 issue 或联系我 (me@miyuki-yue.dev)",
				],
			},
		],
	},
};

export const privacy: Record<Locale, LegalDoc> = {
	en: {
		title: "Privacy policy",
		lede: "What PhiBot keeps about you, why, who else sees it, and how to have it removed.",
		sections: [
			{
				id: "summary",
				title: "In short",
				tldr: "PhiBot keeps only what it needs, sells nothing, and deletes it when you ask.",
				body: [
					[
						"PhiBot keeps what it needs to draw your cards: who you are signed in as, a session token for your Phigros save, and your card settings.",
						"Some card features send scores to phib19.top to work out tags, ranks and comparisons. Your name and account are not sent.",
						"Extras you switch on yourself (comparing, the RKS badge, the Guess the song leaderboard) show more to other people, and each can be switched off.",
						"Nothing is sold, and there are no ads or tracking cookies.",
						"You can unbind your save at any time, and ask for everything else to be deleted.",
					],
				],
			},
			{
				id: "kept",
				title: "What PhiBot keeps",
				tldr: "Your sign-in, save token and cached save, score history, settings, and data for extras you turn on.",
				body: [
					[
						"**Account.** Your Discord user ID, name and avatar, or your TapTap name, avatar and Phigros cloud account ID, depending on how you sign in.",
						"**Save access.** The session token for your Phigros cloud save, and a cached copy of the save so cards load quickly.",
						"**Score history.** Snapshots of your scores and RKS over time, for the History and Info cards.",
						"**Settings.** Your card options, such as layout, background and which extras to show.",
						"**Manual scores**, if you type them in.",
						"**Share link**, if you make one, and whether you turned on **Allow compare** for it.",
						"**Guess the song.** When you play the daily puzzle signed in: when you pressed Start, your guesses and the result. If you solve it with “Show me on the leaderboard” ticked, your display name, number of tries and time go on that day's leaderboard.",
						"**Card images.** Drawn cards are cached so the same card is not drawn twice.",
						"**Logs.** Server logs record requests and errors with your user ID, to find and fix problems.",
						"**Page views.** Vercel Analytics counts page views without cookies.",
					],
					"Cookies keep you signed in and remember your language and theme; short-lived ones carry a sign-in from one step to the next. Your browser also remembers small choices, such as a dismissed notice, and your Guess the song progress when you play practice puzzles or play signed out.",
					"**Score downloads** (CSV or JSON from the More menu) are made when you ask and are not kept. Song pages, chart versions, targets, progress and the RKS trend are worked out from the data above and keep nothing new.",
				],
			},
			{
				id: "use",
				title: "How it is used",
				tldr: "Only to run PhiBot, never for ads or profiling.",
				body: [
					"Only to run PhiBot: to sign you in, read your save, draw your cards, remember your settings, keep the service fast and fix problems. Nothing is used for advertising or profiling.",
				],
			},
			{
				id: "shared",
				title: "Who else sees it",
				tldr: "Game and hosting services see what they need; other people see only what you choose to show.",
				body: [
					[
						"**Phigros cloud (Pigeon Games, TapTap).** PhiBot uses your session token to download your save, the same way the game does.",
						"**Discord**, for sign-in and for the bot's replies.",
						"**phib19.top**, a community Phigros database. For the tag profile, peer comparisons and song rank, PhiBot sends it the scores those features need: song, difficulty and accuracy, without your name or account. Card options let you turn the tag profile and comparisons off.",
						"**Vercel** hosts the site and its logs. **Cloudflare** stores your data (KV) and cached card images (R2).",
						"**Anyone with your share link** can see the cards it shows. If you turn on Allow compare, they can also see every score in your save next to theirs. The RKS badge shows your player name, RKS and Challenge level to anyone who sees it.",
						"**Everyone** can see the Guess the song leaderboard: the display name, tries and time of players who chose to be listed.",
						"**Authorities**, only when the law requires it.",
					],
				],
			},
			{
				id: "retention",
				title: "How long it is kept",
				tldr: "Kept while you use PhiBot; unbinding deletes your token and save at once; Guess the song data goes after 60 days.",
				body: [
					"Your data stays while you use PhiBot. Unbinding deletes the session token and the cached save straight away. Score history, settings, manual scores and your share link stay until you clear them or ask for deletion. Turning sharing off also removes the compare setting, and unbinding turns comparing off. Guess the song runs and leaderboard entries are deleted after 60 days. Cached card images and logs are removed over time.",
				],
			},
			{
				id: "choices",
				title: "Your choices",
				tldr: "Unbind, switch off sharing, comparing or the leaderboard, download your scores, or ask for deletion.",
				body: [
					[
						"Unbind your save from your cards page, or with the bot.",
						"Clear manual scores and turn your share link off from your cards page.",
						"Turn Allow compare off from the Share link menu.",
						"Untick “Show me on the leaderboard” on the Guess the song page to take your entry off.",
						"Download your scores from More, then Download scores.",
						"Ask for a copy of your data, a correction, or deletion of everything tied to your account on [GitHub](" +
							GITHUB +
							"). Depending on where you live (under the GDPR, for example), these are also legal rights.",
					],
				],
			},
			{
				id: "security",
				title: "Security",
				tldr: "Access-controlled storage and HTTPS; you will be told if a breach affects you.",
				body: [
					"Tokens and data sit on access-controlled services and travel over HTTPS. No system is perfectly safe; if a breach affects you, the site will say so.",
				],
			},
			{
				id: "children",
				title: "Children",
				tldr: "Not for anyone too young for a Discord or TapTap account.",
				body: [
					"PhiBot is not meant for children under the minimum age for a Discord or TapTap account where you live.",
				],
			},
			{
				id: "changes",
				title: "Changes",
				tldr: "This policy can change; the date at the top says when it last did.",
				body: [
					"This policy may change. The date at the top shows the latest version. Read it together with the [terms of use](/tos).",
				],
			},
			{
				id: "contact",
				title: "Contact",
				tldr: "Ask on GitHub.",
				body: [`Privacy questions and requests: [GitHub](${GITHUB}).`],
			},
		],
	},
	zh: {
		title: "隐私政策",
		lede: "PhiBot 保存了你的哪些数据、为什么、还有谁能看到，以及如何删除。",
		sections: [
			{
				id: "summary",
				title: "概要",
				tldr: "PhiBot 只保存必要数据，不出售，你要求时即删除。",
				body: [
					[
						"PhiBot 只保存生成成绩图所需的数据：你的登录身份、Phigros 存档的会话令牌，以及你的成绩图设置。",
						"部分成绩图功能会把成绩发送到 phib19.top，用于计算标签、排名和对比，不会发送你的名字或账号。",
						"你自己打开的附加功能（对比、RKS 徽章、猜曲绘排行榜）会向他人展示更多信息，每一项都可以关闭。",
						"不出售数据，没有广告，也没有追踪 Cookie。",
						"你可以随时解绑存档，也可以要求删除其余所有数据。",
					],
				],
			},
			{
				id: "kept",
				title: "保存哪些数据",
				tldr: "登录身份、存档令牌与缓存、成绩历史、设置，以及你自己打开的附加功能所需的数据。",
				body: [
					[
						"**账号**：根据登录方式，保存你的 Discord 用户 ID、名字和头像，或你的 TapTap 名字、头像和 Phigros 云端账号 ID。",
						"**存档访问**：Phigros 云存档的会话令牌，以及一份存档缓存，让成绩图加载更快。",
						"**成绩历史**：成绩和 RKS 的历史快照，用于历史和信息成绩图。",
						"**设置**：成绩图选项，例如版式、背景和显示哪些附加内容。",
						"**手动成绩**：如果你手动录入了成绩。",
						"**分享链接**：如果你创建了分享链接，以及你是否为它打开了**允许对比**。",
						"**猜曲绘**：登录后玩每日题时，保存你点击「开始」的时间、你的答案和结果。如果你勾选了「在排行榜上显示我」并猜中，你的显示名称、尝试次数和用时会出现在当天的排行榜上。",
						"**成绩图图片**：生成的成绩图会被缓存，避免重复生成。",
						"**日志**：服务器日志会记录请求和错误以及你的用户 ID，用于排查问题。",
						"**页面访问**：Vercel Analytics 统计页面访问量，不使用 Cookie。",
					],
					"Cookie 用于保持登录、记住你的语言和主题；登录过程中还会用到短期 Cookie。浏览器也会记住一些小选择，例如已关闭的通知，以及你玩练习题或未登录时的猜曲绘进度。",
					"**成绩下载**（在「更多」菜单中导出 CSV 或 JSON）在你请求时生成，不会保存。曲目页、谱面版本、推分目标、完成度和 RKS 走势都由上述数据计算得出，不会额外保存任何内容。",
				],
			},
			{
				id: "use",
				title: "数据的用途",
				tldr: "只用于运行 PhiBot，不用于广告或用户画像。",
				body: [
					"只用于运行 PhiBot：登录、读取存档、生成成绩图、记住设置、保持服务流畅和排查问题。不用于广告或用户画像。",
				],
			},
			{
				id: "shared",
				title: "还有谁能看到",
				tldr: "游戏和托管服务只看到必要的数据；其他人只能看到你选择公开的内容。",
				body: [
					[
						"**Phigros 云端（Pigeon Games、TapTap）**：PhiBot 用你的会话令牌下载存档，方式与游戏相同。",
						"**Discord**：用于登录和机器人回复。",
						"**phib19.top**：社区 Phigros 数据库。生成标签分析、同分段对比和单曲排名时，PhiBot 会发送这些功能所需的成绩（曲目、难度和准确率），不包含你的名字或账号。你可以在成绩图选项中关闭标签分析和对比。",
						"**Vercel** 托管网站和日志，**Cloudflare** 存储你的数据（KV）和成绩图缓存（R2）。",
						"**拿到你分享链接的人**可以看到链接里的成绩图。如果你打开了允许对比，他们还能把你存档中的每一项成绩与自己的并排查看。RKS 徽章会向看到它的人展示你的玩家名、RKS 和课题等级。",
						"**所有人**都能看到猜曲绘排行榜：选择上榜的玩家的显示名称、尝试次数和用时。",
						"**有关部门**：仅在法律要求时。",
					],
				],
			},
			{
				id: "retention",
				title: "保存多久",
				tldr: "使用期间保留；解绑立即删除令牌和存档缓存；猜曲绘数据 60 天后删除。",
				body: [
					"你使用 PhiBot 期间数据会一直保留。解绑会立即删除会话令牌和存档缓存。成绩历史、设置、手动成绩和分享链接会保留到你清除或要求删除为止。关闭分享会同时删除对比设置，解绑会关闭对比。猜曲绘记录和排行榜条目会在 60 天后删除。成绩图缓存和日志会随时间清理。",
				],
			},
			{
				id: "choices",
				title: "你可以做什么",
				tldr: "你可以解绑，关闭分享、对比或排行榜，下载成绩，或要求删除。",
				body: [
					[
						"在成绩图页面或通过机器人解绑存档。",
						"在成绩图页面清除手动成绩、关闭分享链接。",
						"在「分享链接」菜单中关闭允许对比。",
						"在猜曲绘页面取消勾选「在排行榜上显示我」即可移除你的条目。",
						"在「更多」菜单中选择「下载成绩」导出你的成绩。",
						"在 [GitHub](" +
							GITHUB +
							") 上要求导出、更正或删除与你账号相关的全部数据。根据你所在地区的法律（例如 GDPR），这些也是你的法定权利。",
					],
				],
			},
			{
				id: "security",
				title: "安全",
				tldr: "数据存放在有访问控制的服务上并通过 HTTPS 传输；如有影响你的泄露会告知你。",
				body: [
					"令牌和数据存放在有访问控制的服务上，并通过 HTTPS 传输。没有绝对安全的系统；如果发生影响你的数据泄露，会在网站上说明。",
				],
			},
			{
				id: "children",
				title: "儿童",
				tldr: "不面向未达到 Discord 或 TapTap 注册年龄的人。",
				body: [
					"PhiBot 不面向低于你所在地区 Discord、TapTap 账号最低年龄的用户。",
				],
			},
			{
				id: "changes",
				title: "政策变更",
				tldr: "政策可能更新，以页面顶部日期为准。",
				body: [
					"本政策可能会更新，页面顶部的日期是最新版本。请与[使用条款](/tos)一起阅读。",
				],
			},
			{
				id: "contact",
				title: "联系方式",
				tldr: "请在 GitHub 上联系。",
				body: [`隐私相关的问题和请求：[GitHub](${GITHUB})。`],
			},
		],
	},
};
