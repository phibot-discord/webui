import type { Locale } from "@/i18n/config";

export type LegalSection = {
	id: string;
	title: string;
	body: (string | string[])[];
};
export type LegalDoc = {
	title: string;
	lede: string;
	sections: LegalSection[];
};

export const LEGAL_UPDATED = "2026-10-08";

const GITHUB = "https://github.com/phibot-discord/webui";

export const terms: Record<Locale, LegalDoc> = {
	en: {
		title: "Terms of use",
		lede: "The rules for using PhiBot, the website and the Discord bot. Short on purpose.",
		sections: [
			{
				id: "about",
				title: "What PhiBot is",
				body: [
					"PhiBot draws Phigros score cards (B30, history, player info and more) from your Phigros cloud save, on this website and in Discord. It is a free fan project run by MiyukiYue.",
					"PhiBot is not made, endorsed or supported by Pigeon Games (the developer of Phigros), TapTap or Discord.",
				],
			},
			{
				id: "agree",
				title: "Agreeing to these terms",
				body: [
					"By signing in, binding a save or adding the bot to a Discord server, you agree to these terms and to the [privacy policy](/privacy). If you do not agree, do not use PhiBot.",
					"Some pages, such as nicknames and tags, work without signing in. These terms apply to them too.",
				],
			},
			{
				id: "account",
				title: "Your account and your save",
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
				body: [
					"A share link lets anyone who has it see your cards. Share only what you are happy to show. You can turn a share link off at any time, and the link then stops working.",
				],
			},
			{
				id: "content",
				title: "Game content and your cards",
				body: [
					"Song titles, jacket art, illustrations and other Phigros material belong to Pigeon Games and the artists. PhiBot shows them only to draw your cards and to help players, free of charge. If you own some of this material and want it removed, say so on [GitHub](" +
						GITHUB +
						").",
					"The cards PhiBot draws for you are yours to save and share.",
					"PhiBot's source code is open under the GNU GPL v3.0. These terms cover the hosted service, not your rights under that licence.",
				],
			},
			{
				id: "no-guarantees",
				title: "No guarantees",
				body: [
					"PhiBot is provided as is, for free. It may be slow or down, lose data, or show wrong numbers. RKS, rankings and estimates are worked out by PhiBot or come from third parties such as phib19.top, and can differ from the game.",
					"Binding uses the same cloud login as the game. PhiBot only reads your save, but nobody can promise how Pigeon Games or TapTap treat third-party tools.",
					"Features can change or stop at any time, the whole service included.",
				],
			},
			{
				id: "liability",
				title: "Liability",
				body: [
					"As far as the law allows, the operator is not liable for any loss or damage from using PhiBot or from not being able to use it, including lost scores, lost accounts or decisions made from a card. Nothing here takes away rights that the law says cannot be taken away.",
				],
			},
			{
				id: "changes",
				title: "Changes to these terms",
				body: [
					"These terms may change. The date at the top shows the latest version. If you keep using PhiBot after a change, you accept the new terms.",
				],
			},
			{
				id: "contact",
				title: "Contact",
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
				body: [
					"PhiBot 根据你的 Phigros 云存档生成成绩图（B30、成绩历史、玩家信息等），可以在本网站和 Discord 中使用。它是由 MiyukiYue 运营的免费同人项目。",
					"PhiBot 并非由 Pigeon Games（Phigros 开发商）、TapTap 或 Discord 制作、认可或支持。",
				],
			},
			{
				id: "agree",
				title: "同意本条款",
				body: [
					"登录、绑定存档或把机器人加入 Discord 服务器，即表示你同意本条款和[隐私政策](/privacy)。如果不同意，请不要使用 PhiBot。",
					"部分页面（例如曲目别名和标签）无需登录即可使用，本条款同样适用。",
				],
			},
			{
				id: "account",
				title: "你的账号和存档",
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
				body: [
					"任何拿到分享链接的人都能看到你的成绩图。请只分享你愿意公开的内容。你可以随时关闭分享链接，关闭后原链接失效。",
				],
			},
			{
				id: "content",
				title: "游戏内容和你的成绩图",
				body: [
					"曲名、曲绘、插画等 Phigros 素材归 Pigeon Games 和各位作者所有。PhiBot 仅为生成成绩图、方便玩家而免费展示这些素材。如果你是相关素材的权利人并希望移除，请在 [GitHub](" +
						GITHUB +
						") 上联系。",
					"PhiBot 为你生成的成绩图，你可以自由保存和分享。",
					"PhiBot 的源代码以 GNU GPL v3.0 开源。本条款只涉及在线服务，不影响你在该许可证下的权利。",
				],
			},
			{
				id: "no-guarantees",
				title: "不作保证",
				body: [
					"PhiBot 免费提供，按现状提供。它可能变慢、宕机、丢失数据或显示错误的数字。RKS、排名和估算由 PhiBot 计算或来自 phib19.top 等第三方，可能与游戏内不同。",
					"绑定使用与游戏相同的云端登录。PhiBot 只读取存档，但无法保证 Pigeon Games 或 TapTap 如何看待第三方工具。",
					"功能可能随时变更或停止，包括整个服务。",
				],
			},
			{
				id: "liability",
				title: "责任",
				body: [
					"在法律允许的范围内，运营者不对使用或无法使用 PhiBot 造成的任何损失负责，包括成绩丢失、账号问题或根据成绩图做出的决定。法律规定不可排除的权利不受本条款影响。",
				],
			},
			{
				id: "changes",
				title: "条款变更",
				body: [
					"本条款可能会更新，页面顶部的日期是最新版本。变更后继续使用 PhiBot，即表示你接受新条款。",
				],
			},
			{
				id: "contact",
				title: "联系方式",
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
				body: [
					[
						"PhiBot keeps what it needs to draw your cards: who you are signed in as, a session token for your Phigros save, and your card settings.",
						"Some card features send scores to phib19.top to work out tags, ranks and comparisons. Your name and account are not sent.",
						"Nothing is sold, and there are no ads or tracking cookies.",
						"You can unbind your save at any time, and ask for everything else to be deleted.",
					],
				],
			},
			{
				id: "kept",
				title: "What PhiBot keeps",
				body: [
					[
						"**Account.** Your Discord user ID, name and avatar, or your TapTap name, avatar and Phigros cloud account ID, depending on how you sign in.",
						"**Save access.** The session token for your Phigros cloud save, and a cached copy of the save so cards load quickly.",
						"**Score history.** Snapshots of your scores and RKS over time, for the History and Info cards.",
						"**Settings.** Your card options, such as layout, background and which extras to show.",
						"**Manual scores**, if you type them in.",
						"**Share link**, if you make one.",
						"**Card images.** Drawn cards are cached so the same card is not drawn twice.",
						"**Logs.** Server logs record requests and errors with your user ID, to find and fix problems.",
						"**Page views.** Vercel Analytics counts page views without cookies.",
					],
					"Cookies keep you signed in and remember your language and theme; short-lived ones carry a sign-in from one step to the next. Your browser also remembers small choices, such as a dismissed notice.",
				],
			},
			{
				id: "use",
				title: "How it is used",
				body: [
					"Only to run PhiBot: to sign you in, read your save, draw your cards, remember your settings, keep the service fast and fix problems. Nothing is used for advertising or profiling.",
				],
			},
			{
				id: "shared",
				title: "Who else sees it",
				body: [
					[
						"**Phigros cloud (Pigeon Games, TapTap).** PhiBot uses your session token to download your save, the same way the game does.",
						"**Discord**, for sign-in and for the bot's replies.",
						"**phib19.top**, a community Phigros database. For the tag profile, peer comparisons and song rank, PhiBot sends it the scores those features need: song, difficulty and accuracy, without your name or account. Card options let you turn the tag profile and comparisons off.",
						"**Vercel** hosts the site and its logs. **Cloudflare** stores your data (KV) and cached card images (R2).",
						"**Anyone with your share link** can see the cards it shows.",
						"**Authorities**, only when the law requires it.",
					],
				],
			},
			{
				id: "retention",
				title: "How long it is kept",
				body: [
					"Your data stays while you use PhiBot. Unbinding deletes the session token and the cached save straight away. Score history, settings, manual scores and your share link stay until you clear them or ask for deletion. Cached card images and logs are removed over time.",
				],
			},
			{
				id: "choices",
				title: "Your choices",
				body: [
					[
						"Unbind your save from your cards page, or with the bot.",
						"Clear manual scores and turn your share link off from your cards page.",
						"Ask for a copy of your data, a correction, or deletion of everything tied to your account on [GitHub](" +
							GITHUB +
							"). Depending on where you live (under the GDPR, for example), these are also legal rights.",
					],
				],
			},
			{
				id: "security",
				title: "Security",
				body: [
					"Tokens and data sit on access-controlled services and travel over HTTPS. No system is perfectly safe; if a breach affects you, the site will say so.",
				],
			},
			{
				id: "children",
				title: "Children",
				body: [
					"PhiBot is not meant for children under the minimum age for a Discord or TapTap account where you live.",
				],
			},
			{
				id: "changes",
				title: "Changes",
				body: [
					"This policy may change. The date at the top shows the latest version. Read it together with the [terms of use](/tos).",
				],
			},
			{
				id: "contact",
				title: "Contact",
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
				body: [
					[
						"PhiBot 只保存生成成绩图所需的数据：你的登录身份、Phigros 存档的会话令牌，以及你的成绩图设置。",
						"部分成绩图功能会把成绩发送到 phib19.top，用于计算标签、排名和对比，不会发送你的名字或账号。",
						"不出售数据，没有广告，也没有追踪 Cookie。",
						"你可以随时解绑存档，也可以要求删除其余所有数据。",
					],
				],
			},
			{
				id: "kept",
				title: "保存哪些数据",
				body: [
					[
						"**账号**：根据登录方式，保存你的 Discord 用户 ID、名字和头像，或你的 TapTap 名字、头像和 Phigros 云端账号 ID。",
						"**存档访问**：Phigros 云存档的会话令牌，以及一份存档缓存，让成绩图加载更快。",
						"**成绩历史**：成绩和 RKS 的历史快照，用于历史和信息成绩图。",
						"**设置**：成绩图选项，例如版式、背景和显示哪些附加内容。",
						"**手动成绩**：如果你手动录入了成绩。",
						"**分享链接**：如果你创建了分享链接。",
						"**成绩图图片**：生成的成绩图会被缓存，避免重复生成。",
						"**日志**：服务器日志会记录请求和错误以及你的用户 ID，用于排查问题。",
						"**页面访问**：Vercel Analytics 统计页面访问量，不使用 Cookie。",
					],
					"Cookie 用于保持登录、记住你的语言和主题；登录过程中还会用到短期 Cookie。浏览器也会记住一些小选择，例如已关闭的通知。",
				],
			},
			{
				id: "use",
				title: "数据的用途",
				body: [
					"只用于运行 PhiBot：登录、读取存档、生成成绩图、记住设置、保持服务流畅和排查问题。不用于广告或用户画像。",
				],
			},
			{
				id: "shared",
				title: "还有谁能看到",
				body: [
					[
						"**Phigros 云端（Pigeon Games、TapTap）**：PhiBot 用你的会话令牌下载存档，方式与游戏相同。",
						"**Discord**：用于登录和机器人回复。",
						"**phib19.top**：社区 Phigros 数据库。生成标签分析、同分段对比和单曲排名时，PhiBot 会发送这些功能所需的成绩（曲目、难度和准确率），不包含你的名字或账号。你可以在成绩图选项中关闭标签分析和对比。",
						"**Vercel** 托管网站和日志，**Cloudflare** 存储你的数据（KV）和成绩图缓存（R2）。",
						"**拿到你分享链接的人**可以看到链接里的成绩图。",
						"**有关部门**：仅在法律要求时。",
					],
				],
			},
			{
				id: "retention",
				title: "保存多久",
				body: [
					"你使用 PhiBot 期间数据会一直保留。解绑会立即删除会话令牌和存档缓存。成绩历史、设置、手动成绩和分享链接会保留到你清除或要求删除为止。成绩图缓存和日志会随时间清理。",
				],
			},
			{
				id: "choices",
				title: "你可以做什么",
				body: [
					[
						"在成绩图页面或通过机器人解绑存档。",
						"在成绩图页面清除手动成绩、关闭分享链接。",
						"在 [GitHub](" +
							GITHUB +
							") 上要求导出、更正或删除与你账号相关的全部数据。根据你所在地区的法律（例如 GDPR），这些也是你的法定权利。",
					],
				],
			},
			{
				id: "security",
				title: "安全",
				body: [
					"令牌和数据存放在有访问控制的服务上，并通过 HTTPS 传输。没有绝对安全的系统；如果发生影响你的数据泄露，会在网站上说明。",
				],
			},
			{
				id: "children",
				title: "儿童",
				body: [
					"PhiBot 不面向低于你所在地区 Discord、TapTap 账号最低年龄的用户。",
				],
			},
			{
				id: "changes",
				title: "政策变更",
				body: [
					"本政策可能会更新，页面顶部的日期是最新版本。请与[使用条款](/tos)一起阅读。",
				],
			},
			{
				id: "contact",
				title: "联系方式",
				body: [`隐私相关的问题和请求：[GitHub](${GITHUB})。`],
			},
		],
	},
};
