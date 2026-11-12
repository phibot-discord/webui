import type { ChangeRelease } from "./changelog";

/** Every release's items, newest first, loaded only when the dialog opens */
export const CHANGELOG_RELEASES: ChangeRelease[] = [
	{
		date: "2026-11-12",
		sections: [
			{
				heading: { en: "Song pages", zh: "曲目页面", ja: "曲ページ" },
				items: [
					{
						en: "Every song page has a new Chart tags section: for each level it lists the tags players voted onto that chart, with each tag's share of the chart's votes, which is the weight the chart profile gives it. Pick a tag to open the Chart browser on that tag.",
						zh: "每首曲目的页面新增「谱面标签」：按难度列出玩家为该谱面投出的标签，以及每个标签在该谱面全部投票中所占的比例，也就是谱面标签画像计入它时所用的权重。点击标签即可在「谱面一览」中查看带有该标签的谱面。",
						ja: "各曲のページに「譜面タグ」を追加しました。レベルごとに、プレイヤーがその譜面に投票したタグと、各タグがその譜面の投票全体に占める割合（譜面プロフィールがそのタグを数えるときの比重）を表示します。タグを選ぶと、そのタグで絞り込んだ「譜面ブラウザー」が開きます。",
						href: "/songs",
					},
				],
			},
			{
				heading: {
					en: "2026 Recap",
					zh: "2026 年度回顾",
					ja: "2026 年の振り返り",
				},
				items: [
					{
						en: "Your 2026 Recap opens on 1 December in the Scores menu. It looks back at your year from PhiBot's record of your save: how your RKS moved, the charts you improved or played for the first time, your APs and FCs, your biggest jump and more, as a page and as an image you can download. Until it opens, its address counts down to the opening on a flip clock. Once it opens, players who have a recap get a note that it is ready.",
						zh: "「2026 年度回顾」将于 12 月 1 日在「成绩」菜单中开放。它根据 PhiBot 对你存档的记录回顾这一年：RKS 的变化、有进步和首次游玩的谱面、AP 与 FC、单日最大进步等，既有页面，也有可下载的图片。开放之前，打开该地址会看到翻页时钟样式的开放倒计时。开放后，有年度回顾可看的玩家会收到回顾已就绪的提示。",
						ja: "「2026 年の振り返り」が 12 月 1 日に「スコア」メニューで公開されます。PhiBot が記録したセーブデータから 1 年を振り返り、RKS の変化、伸びた譜面や初めてプレイした譜面、AP と FC、最大の伸びなどを、ページとダウンロードできる画像で確認できます。公開までは、そのアドレスにフリップ時計のカウントダウンが表示されます。公開後、振り返りがあるプレイヤーには、準備ができたことをお知らせします。",
						href: "/2026-recap",
					},
					{
						en: "The page deals your year as a deck of cards you can tap, swipe or throw. Going through it one card at a time builds a combo, and reaching the last card without breaking it earns a FULL COMBO, or an ALL PERFECT if you threw every card. On a phone, switch on Tilt to flick: the cards follow the way you hold the phone, and a quick turn throws the top card.",
						zh: "页面会把你的一年发成一叠卡牌，可以点击、滑动或甩出去。一张一张往下翻会累积连击，连击不断地翻到最后一张就能拿到 FULL COMBO，每一张都是甩出去的则是 ALL PERFECT。在手机上打开「晃动手机翻牌」后，卡牌会随手机的倾斜移动，快速转动手机就能甩出最上面的一张。",
						ja: "ページでは 1 年をカードの束として配り、タップ、スワイプ、または投げてめくれます。1 枚ずつ進めるとコンボがつながり、コンボを切らさずに最後のカードまで進むと FULL COMBO、すべてのカードを投げてめくると ALL PERFECT になります。スマートフォンで「傾けてめくる」をオンにすると、端末の傾きに合わせてカードが動き、端末をすばやく傾けるといちばん上のカードが飛びます。",
					},
					{
						en: "The deck ends with your PGTI, a player type with a family and a style. It is also on the image you can download.",
						zh: "卡牌的最后一张是你的 PGTI：一个带有家族和风格的玩家类型。可下载的图片上也会显示它。",
						ja: "最後のカードは、ファミリーとスタイル付きのプレイヤータイプ「PGTI」です。ダウンロードできる画像にも表示されます。",
					},
				],
			},
			{
				heading: { en: "Manual scores", zh: "手动录入成绩", ja: "手動スコア" },
				items: [
					{
						en: "Manual scores can import a records file: the CSV or JSON file from PhiBot's records download. A score replaces yours only when its accuracy is higher, and nothing is removed.",
						zh: "「手动录入成绩」可以导入成绩文件：使用 PhiBot 成绩下载得到的 CSV 或 JSON 文件。只有准确率更高时才会替换你现有的成绩，不会删除任何内容。",
						ja: "「手動スコア」で記録ファイルを読み込めるようになりました。PhiBot の記録ダウンロードで得た CSV または JSON ファイルを使います。精度が高いときだけ今のスコアを置き換え、何も削除しません。",
						href: "/me/manual",
					},
					{
						en: "Binding your Phigros account after using manual scores now keeps the B30 history recorded up to then.",
						zh: "使用手动成绩之后再绑定 Phigros 账号，此前记录的 B30 历史现在会保留。",
						ja: "手動スコアを使ったあとで Phigros アカウントを連携しても、それまでに記録された B30 の履歴が残るようになりました。",
					},
				],
			},
			{
				heading: { en: "Cards", zh: "成绩图", ja: "カード" },
				items: [
					{
						en: "The accuracy a card says you need for more RKS now follows the same rule as Targets and is rounded up, so reaching the number shown is always enough.",
						zh: "成绩图上显示的推分所需准确率现在与「推分目标」使用同一规则，并向上取整，达到所示数值就一定足够。",
						ja: "カードに表示される、RKS を上げるのに必要な精度が「目標」と同じルールで計算され、切り上げて表示されるようになりました。表示された値に届けば必ず足ります。",
					},
					{
						en: "A card drawn while one of its images was missing, such as the illustration of a brand-new song, is no longer kept. It is drawn again once the image is there, and until then its share preview shows a general image.",
						zh: "如果生成成绩图时有图片缺失（例如新曲的曲绘尚未就绪），这张成绩图不再被保留：图片就绪后会重新生成，在此之前分享预览显示通用图片。",
						ja: "画像が欠けた状態で描画されたカード（新曲のイラストがまだない場合など）は保存されなくなりました。画像がそろうと描き直され、それまで共有プレビューには汎用の画像が表示されます。",
					},
					{
						en: "Dates on cards use China time, Japanese share images use Japanese glyphs, and the three all-perfect charts of a B30 are chosen the same way every time, even when several are tied.",
						zh: "成绩图上的日期统一使用中国时间，日语分享图片使用日语字形，B30 中的三张 AP 谱面即使并列也每次按相同方式选出。",
						ja: "カードの日付は中国時間で表示され、日本語の共有画像は日本語の字形を使い、B30 の AP 3 譜面は同点でも毎回同じ方法で選ばれます。",
					},
				],
			},
			{
				heading: { en: "Chart browser", zh: "谱面一览", ja: "譜面ブラウザー" },
				items: [
					{
						en: "The Chart browser keeps its filters and sorting in the address, so a filtered list can be bookmarked or sent to someone.",
						zh: "「谱面一览」的筛选和排序现在保存在地址中，筛选后的列表可以收藏，也可以发给别人。",
						ja: "「譜面ブラウザー」の絞り込みと並べ替えがアドレスに残るようになり、絞り込んだ一覧をブックマークしたり、ほかの人に送ったりできます。",
						href: "/charts",
					},
				],
			},
			{
				heading: { en: "Signing in", zh: "登录", ja: "サインイン" },
				items: [
					{
						en: "When a page needs a sign-in and sends you to the home page, a small note there now tells you to sign in first.",
						zh: "打开需要登录的页面而被带回首页时，首页现在会弹出一条小提示，告诉你需要先登录。",
						ja: "サインインが必要なページを開いてホームに戻されたとき、先にサインインするよう小さなお知らせが表示されるようになりました。",
					},
				],
			},
			{
				heading: { en: "Speed", zh: "加载速度", ja: "表示速度" },
				items: [
					{
						en: "Pages load faster: the home, status, terms and privacy pages are served ready-made, the top bar no longer waits for your sign-in state, only the texts of your language are downloaded, and the Chinese web font arrives in small pieces.",
						zh: "页面加载更快：首页、运行状态、使用条款和隐私政策改为预先生成后直接提供，顶栏不再等待你的登录信息，只下载所用语言的文本，中文网页字体也改为分片加载。",
						ja: "ページの表示が速くなりました。ホーム、ステータス、利用規約、プライバシーポリシーは生成済みのページを配信し、上部バーはサインインの確認を待たず、使用中の言語のテキストだけを読み込み、中国語のウェブフォントは小さく分割して読み込みます。",
					},
				],
			},
			{
				heading: {
					en: "Reliability and safety",
					zh: "稳定与安全",
					ja: "安定性と安全性",
				},
				items: [
					{
						en: "If PhiBot cannot fully read a save, the refresh now stops with a clear message instead of showing partial scores.",
						zh: "如果 PhiBot 无法完整读取存档，刷新会停止并给出明确提示，而不是显示不完整的成绩。",
						ja: "セーブデータを完全に読み取れない場合、更新は一部だけのスコアを表示せず、分かりやすいメッセージとともに中止されます。",
					},
					{
						en: "The Status page keeps its last good data when its source cannot be reached, and says so once that data is five minutes old.",
						zh: "「运行状态」在数据源无法访问时保留最近一次的有效数据，数据超过五分钟后会提示暂时无法获取。",
						ja: "「ステータス」ページは、データ元に接続できないときも最後に取得できたデータを表示し続け、データが 5 分以上古くなるとその旨を表示します。",
						href: "/status",
					},
					{
						en: "Sign-in and sharing are stricter: a TapTap sign-in ends when its save is no longer the one bound to you, a share link works only while it is your current link, and repeated requests are rate limited.",
						zh: "登录与分享更严格：通过 TapTap 登录的会话，在其存档不再是你绑定的存档时会结束；分享链接只在它是你当前的链接时有效；重复请求会被限流。",
						ja: "サインインと共有を厳格にしました。TapTap でのサインインは、そのセーブデータが連携中のものでなくなると終了し、共有リンクは現在のリンクである間だけ有効で、繰り返しのリクエストにはレート制限がかかります。",
					},
					{
						en: "Guess the song, the chart preview and card loading now recover from a failed request instead of getting stuck, and pages left in a background tab stop refreshing until you return.",
						zh: "「猜曲绘」、谱面预览和成绩图加载在请求失败后可以恢复，不再卡住；放在后台标签页里的页面会暂停自动刷新，回到页面后再继续。",
						ja: "「曲あてクイズ」、譜面プレビュー、カードの読み込みは、リクエストが失敗しても止まったままにならず復帰します。バックグラウンドのタブにあるページは、戻ってくるまで自動更新を止めます。",
					},
				],
			},
			{
				heading: {
					en: "Terms and privacy",
					zh: "条款与隐私",
					ja: "利用規約とプライバシー",
				},
				items: [
					{
						en: "The terms now say that the site's data endpoints (the addresses under /api/) are internal: they serve PhiBot's own pages, are not offered to other software, and can change or be limited without notice. The RKS badge is the exception.",
						zh: "使用条款新增说明：网站的数据接口（/api/ 下的地址）是内部接口，只为 PhiBot 自己的页面服务，不对其他软件开放，可能随时更改或限流。RKS 徽章例外。",
						ja: "利用規約に、サイトのデータ用エンドポイント（/api/ 以下のアドレス）は内部用であることを明記しました。PhiBot 自身のページのためのもので、他のソフトウェアには提供しておらず、予告なく変更または制限されることがあります。RKS バッジは例外です。",
						href: "/tos",
					},
				],
			},
			{
				heading: {
					en: "Discord bot",
					zh: "Discord 机器人",
					ja: "Discord ボット",
				},
				items: [
					{
						en: "When a command fails, its error message is now visible only to the person who ran it.",
						zh: "命令执行失败时，错误信息现在只有执行命令的人能看到。",
						ja: "コマンドが失敗したとき、エラーメッセージはコマンドを実行した本人にだけ表示されるようになりました。",
					},
					{
						en: "Binding your account through the bot now also takes the site out of manual scores, so both show your real save.",
						zh: "通过机器人绑定账号后，网站也会退出手动成绩模式，两边都显示你的真实存档。",
						ja: "ボットでアカウントを連携すると、サイト側も手動スコアのモードを終了し、どちらも実際のセーブデータを表示するようになりました。",
					},
				],
			},
		],
	},
	{
		date: "2026-11-08",
		sections: [
			{
				heading: {
					en: "Chart profile",
					zh: "谱面标签画像",
					ja: "譜面プロフィール",
				},
				items: [
					{
						en: "Chart profile numbers are now RKS: each tag shows the RKS you would have if every chart played like the charts with that tag, next to your own RKS. The card, the player profile and its over-time table all use it.",
						zh: "谱面标签画像的数字现在都是 RKS：每个标签显示假如每张谱面都打得像带该标签的谱面那样时你会有的 RKS，并与你自己的 RKS 并列。成绩图、玩家画像以及「随时间变化」表都使用它。",
						ja: "譜面プロフィールの数値が RKS になりました。各タグには、すべての譜面をそのタグが付いた譜面と同じ調子でプレイできたとしたときの RKS が、あなた自身の RKS と並んで表示されます。カード、プレイヤープロフィール、推移の表のすべてで使われます。",
						href: "/profile",
					},
					{
						en: "The Chart tags page opens with a plain-words explanation and walks through turning a tag's effect into an RKS. Every tag's clip now lines up with its neighbours, whether or not the tag has a description.",
						zh: "谱面标签页开头新增简单说明，并逐步演示如何把标签的影响换算成 RKS。每个标签的短片现在都与相邻标签对齐，无论该标签有没有说明。",
						ja: "「譜面タグ」ページの冒頭にかんたんな説明を追加し、タグの効果を RKS に換算する手順を計算例で示すようにしました。各タグのクリップは、説明の有無にかかわらず隣のタグとそろって並びます。",
						href: "/tags",
					},
				],
			},
		],
	},
	{
		date: "2026-11-05",
		sections: [
			{
				heading: { en: "Japanese", zh: "日语", ja: "日本語" },
				items: [
					{
						en: "PhiBot is now available in Japanese: the whole site, the terms and privacy policy, and the cards. Pick 日本語 in the language switch, or open any page under /ja.",
						zh: "PhiBot 现已支持日语：整个网站、使用条款与隐私政策以及成绩图。在语言切换中选择「日本語」，或打开 /ja 下的任意页面即可。",
						ja: "PhiBot が日本語に対応しました。サイト全体、利用規約とプライバシーポリシー、そしてカードが対象です。言語切り替えで「日本語」を選ぶか、/ja 以下の任意のページを開いてください。",
					},
				],
			},
			{
				heading: { en: "Chart browser", zh: "谱面一览", ja: "譜面ブラウザー" },
				items: [
					{
						en: "A new Chart browser lists every scored chart in one table. Filter by level, constant range, chart tag or chapter, sort by notes, notes per second, BPM or length, and, signed in, by your own scores: not played, not FC'd or not AP'd yet.",
						zh: "新增「谱面一览」，在一张表中列出所有计分谱面。可按难度、定数范围、谱面标签或章节筛选，按物量、每秒物量、BPM 或时长排序；登录后还能按自己的成绩筛选：未游玩、尚未 FC 或尚未 AP。",
						ja: "新しい「譜面ブラウザー」では、スコア対象の全譜面を 1 つの表で確認できます。レベル、譜面定数の範囲、譜面タグ、章で絞り込み、ノーツ数、1 秒あたりのノーツ数、BPM、長さで並べ替えられます。サインインすると、自分のスコアで絞り込むこともできます（未プレイ、FC 未達成、AP 未達成）。",
						href: "/charts",
					},
				],
			},
			{
				heading: { en: "Chart preview", zh: "谱面预览", ja: "譜面プレビュー" },
				items: [
					{
						en: "A strip above the seek bar shows how hard each part of the chart is, with noise fields shaded behind it. Hardest 10 s jumps to the toughest stretch, weighing notes by type, chords and falling speed, with extra weight where noise fields are active.",
						zh: "进度条上方新增难度条，显示谱面各部分的难度，噪域出现的区间以底色标出。「最难 10 秒」会跳到最难的一段：按音符种类、多押和下落速度加权计算物量，噪域生效的区间额外加权。",
						ja: "シークバーの上に、譜面の各部分の難しさを示すバーが表示され、背景にノイズ領域が色付きで示されます。「最難の 10 秒」は最も難しい区間へジャンプします。ノーツの種類、同時押し、落下速度で重み付けし、ノイズ領域が有効な区間はさらに重くしています。",
						href: "/songs",
					},
				],
			},
			{
				heading: { en: "Scores", zh: "成绩", ja: "スコア" },
				items: [
					{
						en: "Targets has a new list of charts below your usual form: played charts where your accuracy is under what the rest of your charts predict for them, with the RKS that reaching it would add and the profile weaknesses each chart carries.",
						zh: "推分目标新增「低于你平时水平的谱面」：你玩过、准确率低于其余谱面对它的预期的谱面，并列出达到该水平可增加的 RKS，以及谱面带有的画像弱项。",
						ja: "「目標」に「普段の調子を下回っている譜面」の一覧を追加しました。プレイ済みの譜面のうち、ほかの譜面から予想される精度を下回っているものを対象に、その精度に届いたときに増える RKS と、各譜面が持つプロフィール上の弱点を表示します。",
						href: "/targets",
					},
					{
						en: "The Trend tab lists your milestones since PhiBot started keeping your save history: RKS steps every 0.25, your first AP and FC at each new level, AP and FC counts, and your best day.",
						zh: "走势页新增里程碑：自 PhiBot 开始保存你的存档历史以来，RKS 每提升 0.25、每个新难度的首个 AP 与 FC、AP 和 FC 数量，以及单日最大进步。",
						ja: "「推移」タブに、PhiBot がセーブデータの履歴を保存し始めてからのマイルストーンを追加しました。0.25 ごとの RKS の節目、新しいレベルごとの初 AP と初 FC、AP と FC の数、自己ベストの日が分かります。",
						href: "/trend",
					},
					{
						en: "The Profile tab shows your chart profile over time, worked out from your scores on earlier days, so you can see which weaknesses closed and which strengths grew.",
						zh: "玩家画像新增「随时间变化」，用你在之前日期的成绩重新计算画像，可以看到哪些弱项已经补上、哪些强项在增长。",
						ja: "「プロフィール」タブで、譜面プロフィールの時間変化を確認できます。過去の日のスコアから算出するので、どの弱点が克服され、どの強みが伸びたかが分かります。",
						href: "/profile",
					},
					{
						en: "Version changes now shows, for your save, which charts enter or leave your B30 between two versions, your played charts with a new constant, and your RKS under every version's constants.",
						zh: "版本变化页现在会针对你的存档显示：两个版本之间哪些谱面进入或移出你的 B30、你玩过且定数有调整的谱面，以及你在每个版本定数下的 RKS。",
						ja: "「バージョン間の変更」では、あなたのセーブデータについて、2 つのバージョン間で B30 に入った譜面と外れた譜面、譜面定数が変わったプレイ済みの譜面、各バージョンの譜面定数で計算した RKS を表示するようになりました。",
						href: "/versions",
					},
				],
			},
			{
				heading: {
					en: "Chart profile",
					zh: "谱面标签画像",
					ja: "譜面プロフィール",
				},
				items: [
					{
						en: "Each chart is now predicted from all your other charts at once: one curve over constant plus the effects of its tags. Your hardest charts count even with nothing else near their constant, a chart's own score never shapes its own prediction, and a 100% on an easy chart no longer reads as a weakness.",
						zh: "现在每张谱面的预期由你的其余谱面一次性算出：一条随定数变化的曲线，加上它所带标签的影响。最难的谱面即使附近没有同定数谱面也会计入，谱面自己的成绩不会影响它自己的预期，简单谱面上的 100% 也不再被当作弱项。",
						ja: "各譜面の予想を、ほかのすべての譜面からまとめて求めるようになりました。定数に沿った 1 本の曲線に、その譜面のタグの効果を加えたものです。いちばん難しい譜面も、近い定数の譜面がなくても数えられ、譜面自身のスコアが自分の予想に影響することはなく、易しい譜面での 100% が苦手として扱われることもなくなりました。",
						href: "/tags",
					},
					{
						en: "Tags with a small but steady net are listed after the others, dimmed. When every chart in the profile is 99.9%+, it uses your scores from the last day some were still under 99.9%; without score history it ranks tags by how hard those charts are, dimmed and without numbers.",
						zh: "净值很小但稳定的标签会排在其他标签之后，以变暗方式列出。当画像中的谱面全部在 99.9% 以上时，改用最后一次仍有谱面低于 99.9% 那天的成绩；没有成绩历史时，按这些谱面的难度为标签排序，变暗且不显示数值。",
						ja: "正味は小さいものの安定しているタグを、ほかのタグの後に薄く表示するようにしました。プロフィールの譜面がすべて 99.9% 以上のときは、まだ 99.9% 未満の譜面があった最後の日のスコアを使います。スコア履歴がない場合は、それらの譜面の難しさでタグを並べ、薄く表示して数値は出しません。",
						href: "/profile",
					},
					{
						en: "The chart tags page works one example through by hand: three real charts and two tags, from lost accuracy to the number on the card.",
						zh: "谱面标签页面新增计算示例：用三张真实谱面和两个标签，从准确率损失一步步算到成绩图上的数字。",
						ja: "譜面タグのページに計算例を追加しました。実在の 3 譜面とタグ 2 つで、失った精度からカードに出る数値までを 1 段階ずつ計算します。",
						href: "/tags",
					},
					{
						en: "Every tag on that page has a short clip from a chart players voted it onto, played by the chart preview. Each clip shows a part of that chart where the pattern appears: stairs, fixed lanes, jacks, holds, noise fields and so on.",
						zh: "该页面的每个标签都附有一段短片，取自玩家投给该标签的谱面，由谱面预览播放。每段短片都选自谱面中出现该配置的部分：楼梯、定轨、纵连、长条、噪域等。",
						ja: "そのページの各タグに、プレイヤーがそのタグに投票した譜面の短いクリップを付け、譜面プレビューで再生します。各クリップは、階段、固定レーン、縦連、ホールド、ノイズ領域など、その配置が現れる部分を流します。",
						href: "/tags",
					},
				],
			},
			{
				heading: { en: "Song pages", zh: "曲目页面", ja: "曲ページ" },
				items: [
					{
						en: "Similar charts stay within 1.0 of the chart's constant and weigh constant far more than before, and where players have voted tags on both charts, charts with the same tags come first.",
						zh: "「相似谱面」现在只列出定数相差 1.0 以内的谱面，定数的权重也比以前高得多；两张谱面都有玩家投票的标签时，标签相同的谱面排在前面。",
						ja: "「似た譜面」は譜面定数の差が 1.0 以内のものに限り、定数を以前よりずっと重く見るようにしました。両方の譜面にプレイヤーのタグ投票がある場合は、同じタグを持つ譜面が先に並びます。",
						href: "/songs",
					},
				],
			},
			{
				heading: {
					en: "Discord bot",
					zh: "Discord 机器人",
					ja: "Discord ボット",
				},
				items: [
					{
						en: "Add PhiBot to your own Discord account with Add to my apps on the home page: its commands then work in any server or DM, even where the bot is not a member.",
						zh: "在首页点击「添加到我的应用」，即可把 PhiBot 添加到你自己的 Discord 账号：之后在任何服务器或私信中都能使用它的命令，即使机器人不在该服务器中。",
						ja: "ホームページの「自分のアプリに追加」から、PhiBot を自分の Discord アカウントに追加できます。ボットが参加していないサーバーや DM でも、そのコマンドを使えます。",
						href: "/",
					},
					{
						en: "Every image the bot sends now matches the site: the same cards, plus the Progress and Targets images for the range, chapter and suggestion commands.",
						zh: "机器人发送的所有图片现在都与网站一致：相同的成绩图，以及用于范围、章节和推荐命令的完成度与推分目标图片。",
						ja: "ボットが送信するすべての画像がサイトと同じになりました。同じカードに加え、範囲、章、おすすめのコマンド用の進捗画像と目標画像も届きます。",
					},
				],
			},
		],
	},
	{
		date: "2026-11-04",
		sections: [
			{
				heading: {
					en: "Chart profile",
					zh: "谱面标签画像",
					ja: "譜面プロフィール",
				},
				items: [
					{
						en: "PhiBot now works out the chart profile on your B30 card itself. It uses the chart-tag votes on kyou.net.cn, copied once a day, so your scores are no longer sent to phib19.top for it.",
						zh: "B30 成绩图上的谱面标签画像现在由 PhiBot 自己计算，使用每天同步一次的 kyou.net.cn 谱面标签投票，计算时不再把你的成绩发送到 phib19.top。",
						ja: "譜面プロフィールを B30 カード上で PhiBot 自身が計算するようになりました。kyou.net.cn の譜面タグ投票を 1 日 1 回コピーして使うため、そのためにスコアが phib19.top へ送信されることはなくなりました。",
						href: "/tags",
					},
					{
						en: "Each number compares the accuracy you lose on charts with that tag, to goods and bads alike, with your other charts of the same constant, counting charts from 0.25 under your B27 floor upward: +0.30 is about half as much lost, −0.30 about twice. Tags are credited jointly, so one that only rides along with another gets no credit of its own, and a listing needs its sign to hold in 90% of resamples; the profile page marks those under 98% as leaning. Nets under ±0.05 are dimmed as slight, and the card lists your top 3 each way.",
						zh: "每个数值把带该标签的谱面上你损失的准确率（Good 与 Bad 都算）与自己同定数的谱面相比，样本从 B27 下限减 0.25 起、没有上限：+0.30 约为损失减半，−0.30 约为两倍。标签同时归因，只跟着别的标签出现的标签不会单独得分；列出需要在重抽中 90% 保持同号，玩家画像会把不足 98% 的标为「倾向」。净值小于 ±0.05 的标记为「略」并变暗，成绩图各列出前 3 个。",
						ja: "各数値は、そのタグを持つ譜面で失う精度（goods と bads をまとめたもの）を、同じ譜面定数の他の譜面と比べたものです。B27 の下限から 0.25 下の譜面以上を対象に数えます。+0.30 は失う精度が約半分、−0.30 は約 2 倍を意味します。タグは共同でクレジットされるため、他のタグに付随して現れるだけのタグには単独のクレジットはなく、一覧に載るには再標本化の 90% で符号が保たれる必要があります。98% 未満のものはプロフィールページで「傾向あり」と表示されます。差が ±0.05 未満のものは「わずか」として薄く表示され、カードには上位 3 件ずつが載ります。",
						href: "/tags",
					},
					{
						en: "The chart tags page now shows the formula and how to read the numbers, above the tag glossary.",
						zh: "谱面标签页面在标签说明上方新增了计算公式和数值解读。",
						ja: "譜面タグのページに、タグ用語集の上に計算式と数値の読み方を表示するようにしました。",
						href: "/tags",
					},
				],
			},
			{
				heading: {
					en: "Player profile",
					zh: "玩家画像",
					ja: "プレイヤープロフィール",
				},
				items: [
					{
						en: "A new Profile tab under your cards: your B30 card as text, with every chart tag, its average, its net and how stably it holds, and the charts counted for it with their acc, expected acc and gap.",
						zh: "成绩图下新增「画像」标签页：文字版 B30 成绩图，列出全部谱面标签的平均、净值与稳定度，以及计入每个标签的谱面和它们的准确率、预期准确率与差值。",
						ja: "カードの下に新しい「プロフィール」タブを追加しました。B30 カードをテキストで表示し、すべての譜面タグについて、その平均、差分、安定度、集計対象の譜面と各譜面の精度、期待精度、差を確認できます。",
						href: "/profile",
					},
				],
			},
		],
	},
	{
		date: "2026-11-03",
		sections: [
			{
				heading: { en: "Chart preview", zh: "谱面预览", ja: "譜面プレビュー" },
				items: [
					{
						en: "Every song page can play its charts: notes, judge lines, hit effects and noise fields, drawn in your browser from the game's own chart file and kept in time with the music.",
						zh: "每首曲目的页面现在都能播放谱面：音符、判定线、打击特效和噪域都由浏览器根据游戏自己的谱面文件实时绘制，并与音乐保持同步。",
						ja: "すべての曲ページで譜面を再生できます。ノーツ、判定線、ヒットエフェクト、ノイズ領域を、ゲーム本来の譜面ファイルからブラウザ上で描画し、音楽に合わせて動かします。",
						href: "/songs",
					},
					{
						en: "Pick any version PhiBot keeps: the current chart, older charts from earlier Phigros versions, removed charts such as Destination, and April Fools specials.",
						zh: "可以选择 PhiBot 保存的任意版本：当前谱面、旧版 Phigros 中的谱面、Destination 等已移除的谱面，以及愚人节特别谱面。",
						ja: "PhiBot が保管している任意のバージョンを選べます。現行の譜面、過去の Phigros バージョンの旧譜面、Destination のような削除済みの譜面、エイプリルフールの特別譜面です。",
						href: "/songs",
					},
					{
						en: "Set the playback speed from 0.5× to 1.5×, and open Settings to set the hit sound volume for taps, drags and flicks separately, pick a note size, turn noise fields on or off, and switch on Color chords to give each close or larger chord its own glow color.",
						zh: "可以把播放速度设为 0.5× 至 1.5×；在「设置」里分别调节 Tap、Drag、Flick 的打击音音量、选择音符大小、开关噪域，并开启「多押分色」，让相邻或三押以上的多押各用不同颜色的光晕。",
						ja: "再生速度を 0.5× から 1.5× まで変更できます。「設定」では、タップ、ドラッグ、フリックのヒット音量を個別に調整し、ノーツのサイズを選び、ノイズ領域のオン・オフを切り替えられます。「同時押しの色分け」をオンにすると、近い同時押しや大きな同時押しごとに異なる色で光ります。",
						href: "/songs",
					},
					{
						en: "The corner of the stage names the song, the difficulty and its chart constant, in the preview and in any video you download.",
						zh: "画面角落会显示曲名、难度和定数，预览和下载的视频里都有。",
						ja: "ステージの隅に曲名、難易度、譜面定数を表示します。プレビューでも、ダウンロードした動画でも同じです。",
						href: "/songs",
					},
					{
						en: "The preview stays light on phones and older machines: it draws only the notes that can be on screen, lowers its resolution when frames run late, and stops drawing while it is scrolled out of view.",
						zh: "预览在手机和较旧的设备上也很轻量：只绘制可能出现在屏幕上的音符，掉帧时自动降低分辨率，滚出视野时暂停绘制。",
						ja: "スマートフォンや古い端末でも軽快に動きます。画面に入りうるノーツだけを描画し、フレームが遅れると解像度を下げ、画面外にスクロールすると描画を止めます。",
						href: "/songs",
					},
					{
						en: "Download video saves the chart as a 1080p 60 fps MP4 with its music and hit sounds, marked Rendered by PhiBot.",
						zh: "「下载视频」会把谱面保存为带音乐和打击音的 1080p 60 帧 MP4，角落带有 Rendered by PhiBot 字样。",
						ja: "「動画をダウンロード」で、譜面を音楽とヒット音付きの 1080p 60 fps の MP4 として保存できます。「Rendered by PhiBot」の表記が入ります。",
						href: "/songs",
					},
				],
			},
			{
				heading: { en: "Search", zh: "搜索", ja: "検索" },
				items: [
					{
						en: "Search from any page: press Ctrl K (⌘K on a Mac) or the Search button in the top bar to find a song by title, nickname or composer, or jump to any page.",
						zh: "在任何页面都能搜索：按 Ctrl K（Mac 上为 ⌘K）或点击顶栏的「搜索」，即可按曲名、别名或曲师查找曲目，或跳转到任意页面。",
						ja: "どのページからでも検索できます。Ctrl K（Mac では ⌘K）か上部バーの検索ボタンで、曲名、別名、作曲者から曲を探したり、任意のページへ移動したりできます。",
					},
				],
			},
			{
				heading: { en: "Song pages", zh: "曲目页面", ja: "曲ページ" },
				items: [
					{
						en: "Your scores now show each chart's accuracy over time, drawn from your save history.",
						zh: "「你的成绩」现在会显示每张谱面准确率随时间的变化，数据来自你的存档记录。",
						ja: "スコアに、セーブデータの履歴から描いた各譜面の精度の推移を表示するようにしました。",
						href: "/songs",
					},
					{
						en: "Accuracy and rank draws where each accuracy places on a chart, and how many places your next 0.25%, 0.5% or 1% would gain.",
						zh: "「准确率与排名」显示各准确率在谱面上的排名，以及再提升 0.25%、0.5% 或 1% 能前进多少名。",
						ja: "「精度と順位」では、各精度が譜面上で何位にあたるか、次の 0.25%、0.5%、1% で何位上がるかを分布で示します。",
						href: "/songs",
					},
					{
						en: "Similar charts lists charts close in constant, note density, note mix and BPM.",
						zh: "「相似谱面」列出定数、物量密度、音符构成和 BPM 相近的谱面。",
						ja: "「似た譜面」では、譜面定数、ノーツ密度、ノーツ構成、BPM が近い譜面を一覧にします。",
						href: "/songs",
					},
					{
						en: "In Files links a song to its chapter in the Collection and to its PVs.",
						zh: "「相关资源」把曲目链接到收藏品中的章节和相关 PV。",
						ja: "「ファイル」から、曲を「コレクション」の該当章と PV にリンクします。",
						href: "/songs",
					},
					{
						en: "In Files also plays the song's music and lets you download its illustration in full, small and blurred sizes, any per-level art, and the chart JSON and Phira pack of every version.",
						zh: "「相关资源」还可以试听曲目音乐，并下载原图、小图和模糊图曲绘、各难度的专属曲绘，以及每个版本的谱面 JSON 与 Phira 谱面包。",
						ja: "「ファイル」では、曲の音楽の再生や、イラストのフルサイズ・小サイズ・ぼかし版、各レベルのイラスト、全バージョンの譜面 JSON と Phira パックのダウンロードもできます。",
						href: "/songs",
					},
				],
			},
			{
				heading: { en: "Scores", zh: "成绩", ja: "スコア" },
				items: [
					{
						en: "Compare players can put you against your past self: pick a day from your save history.",
						zh: "「玩家对比」可以与过去的自己对比：从存档记录中选一天即可。",
						ja: "「プレイヤー比較」で、過去の自分と比べられるようになりました。セーブデータの履歴から日付を選びます。",
						href: "/compare",
					},
					{
						en: "Progress and Targets can be saved as images to share.",
						zh: "「完成度」和「推分目标」可以保存为图片分享。",
						ja: "「進捗」と「目標」を画像として保存し、共有できます。",
						href: "/progress",
					},
					{
						en: "Targets suggests charts you have not played that look like the hardest ones you have AP'd.",
						zh: "「推分目标」会推荐你还没玩过、与你 AP 过的最难谱面相似的谱面。",
						ja: "「目標」では、あなたが AP した最難関の譜面に似た、未プレイの譜面を提案します。",
						href: "/targets",
					},
				],
			},
			{
				heading: {
					en: "Version changes",
					zh: "版本变化",
					ja: "バージョン変更",
				},
				items: [
					{
						en: "A new page under Files compares two Phigros versions: songs added and removed, constant changes and release notes. Signed in, it shows your RKS under each version's constants.",
						zh: "「资源」下新增页面，可对比两个 Phigros 版本：新增和移除的曲目、定数调整以及更新说明。登录后还会显示你在两个版本定数下的 RKS。",
						ja: "「ファイル」の下に、2 つの Phigros バージョンを比較する新しいページを追加しました。追加・削除された曲、譜面定数の変更、リリースノートを確認できます。サインインすると、各バージョンの譜面定数での RKS も表示されます。",
						href: "/versions",
					},
				],
			},
		],
	},
	{
		date: "2026-10-31",
		sections: [
			{
				heading: { en: "Navigation", zh: "导航", ja: "ナビゲーション" },
				items: [
					{
						en: "The top bar now has three menus: Tools, Scores and Files. Hover over one, or click it, to see its pages. Your avatar opens your Account.",
						zh: "顶栏改为三个菜单：工具、成绩和资源。将鼠标移到菜单上或点击即可看到其中的页面。点击头像即可打开账号页面。",
						ja: "上部バーが「ツール」「スコア」「ファイル」の 3 つのメニューになりました。ホバーかクリックでページが表示されます。アバターから「アカウント」を開けます。",
					},
					{
						en: "Simulation, Targets and Tags moved from the Cards tabs to Tools, next to Score control, Nicknames, Phira and Guess the song.",
						zh: "曲目模拟、推分目标和谱面标签从成绩图标签移到了「工具」，与分数计算器、曲目别名、Phira 和猜曲绘放在一起。",
						ja: "シミュレーション、目標、タグを、カードのタブから「ツール」へ移しました。スコア調整、別名、Phira、曲あてクイズと並んでいます。",
						href: "/simulate",
					},
				],
			},
			{
				heading: { en: "Song pages", zh: "曲目页面", ja: "曲ページ" },
				items: [
					{
						en: "Every song has its own page: illustration, composer, illustrator, chapter, BPM, and each chart's constant, note count, note types and charter. Signed in, you also see your score and rank on each chart.",
						zh: "每首曲目都有了自己的页面：曲绘、曲师、画师、章节、BPM，以及每张谱面的定数、物量、音符类型和谱师。登录后还能看到你在每张谱面上的成绩与排名。",
						ja: "すべての曲に専用ページができました。イラスト、作曲者、イラストレーター、章、BPM、各譜面の譜面定数、ノーツ数、ノーツの種類、譜面制作者を掲載します。サインインすると、各譜面での自分のスコアと順位も表示されます。",
						href: "/songs",
					},
					{
						en: "Chart versions lists how each chart changed across older Phigros versions. Pick two versions to compare note counts, note types, judge lines and notes per second, second by second.",
						zh: "「谱面版本」列出每张谱面在旧版 Phigros 中的变化。选择两个版本，即可对比物量、音符类型、判定线数量，以及逐秒的音符密度。",
						ja: "「譜面バージョン」では、過去の Phigros バージョンで各譜面がどう変わったかを一覧にします。2 つのバージョンを選ぶと、ノーツ数、ノーツの種類、判定線、1 秒あたりのノーツ数を 1 秒ごとに比較できます。",
					},
					{
						en: "Search results on Nicknames link to the song page, and the song page opens Phira with that song already picked.",
						zh: "曲目别名的搜索结果会链接到曲目页面，曲目页面可直接打开已选好该曲目的 Phira 页面。",
						ja: "「別名」の検索結果から曲ページへ移動でき、曲ページからはその曲を選択済みの状態で Phira を開けます。",
						href: "/songs",
					},
				],
			},
			{
				heading: {
					en: "New Cards tabs",
					zh: "成绩图新标签",
					ja: "新しいカードタブ",
				},
				items: [
					{
						en: "Targets lists the accuracy each chart needs to push your RKS up to the next step, with filters by level. Each song links to its song page.",
						zh: "「推分目标」列出每张谱面把 RKS 推到下一档所需的准确率，可按难度筛选，点击曲名即可打开曲目页面。",
						ja: "「目標」は、RKS を次の段階に上げるために各譜面で必要な精度を一覧にします。レベルで絞り込みでき、各曲は曲ページにリンクしています。",
						href: "/targets",
					},
					{
						en: "Progress shows how many charts you have cleared, full combo'd and All Perfect'd, by difficulty and constant. Pick a cell to list its charts.",
						zh: "「完成度」按难度和定数显示通关、Full Combo 和 All Perfect 的谱面数量，点击格子即可列出其中的谱面。",
						ja: "「進捗」は、クリア、フルコンボ、All Perfect した譜面の数を、難易度と譜面定数ごとに示します。マスを選ぶと、その譜面を一覧できます。",
						href: "/progress",
					},
					{
						en: "Trend draws your RKS over time and lists the scores that went up, newest first.",
						zh: "「走势」绘制 RKS 随时间的变化，并按时间倒序列出提升过的成绩。",
						ja: "「推移」は RKS の時間変化を描き、上がったスコアを新しい順に一覧にします。",
						href: "/trend",
					},
					{
						en: "More now has Download scores: every chart you have played, as CSV or JSON.",
						zh: "「更多」菜单新增「下载成绩」：以 CSV 或 JSON 导出你玩过的所有谱面。",
						ja: "「その他」に「スコアをダウンロード」を追加しました。プレイ済みの全譜面を CSV または JSON で保存できます。",
						href: "/me",
					},
				],
			},
			{
				heading: { en: "Sharing", zh: "分享", ja: "共有" },
				items: [
					{
						en: "Compare players puts two players side by side: RKS, clears by difficulty, best 30 and every chart both have played. A player can be compared only after turning on Allow compare in their Share link menu; it is off by default.",
						zh: "「玩家对比」可并排查看两位玩家：RKS、各难度通关、Best 30，以及两人都玩过的每张谱面。玩家需在「分享链接」菜单中打开「允许对比」才能被对比，默认关闭。",
						ja: "「プレイヤー比較」では、2 人のプレイヤーを並べて、RKS、難易度別のクリア数、ベスト 30、2 人が共にプレイした全譜面を比べられます。比較できるのは、相手が共有リンクのメニューで「比較を許可」をオンにしている場合のみで、初期設定ではオフです。",
						href: "/compare",
					},
					{
						en: "The Share link menu has an RKS badge for GitHub profiles and forum signatures, in six styles, with Markdown and HTML to copy.",
						zh: "「分享链接」菜单新增 RKS 徽章，可用于 GitHub 主页和论坛签名，提供六种样式，可复制 Markdown 或 HTML。",
						ja: "共有リンクのメニューに、GitHub プロフィールやフォーラムの署名向けの RKS バッジを追加しました。6 種類のスタイルがあり、Markdown と HTML をコピーできます。",
						href: "/me",
					},
				],
			},
			{
				heading: { en: "Guess the song", zh: "猜曲绘", ja: "曲あてクイズ" },
				items: [
					{
						en: "A daily puzzle: name the song from a close-up of its illustration, blurred, recoloured and inverted. Each wrong guess zooms out and clears it up. Practice puzzles never run out.",
						zh: "每日一题：从经过模糊、变色和反色处理的曲绘特写中猜出曲目。每猜错一次，画面就会拉远并变得更清晰。练习题可以无限游玩。",
						ja: "毎日出題されるパズルです。ぼかし、色替え、反転したイラストのアップから曲名を当てます。不正解のたびにズームアウトして、見やすくなります。練習問題は無限に遊べます。",
						href: "/guess",
					},
					{
						en: "A timer runs from Start, and signed-in players can join the daily leaderboard, ranked by fewest tries, then fastest time.",
						zh: "按下「开始」后开始计时；登录后可加入每日排行榜，先比尝试次数，再比用时。",
						ja: "「スタート」からタイマーが動き、サインイン済みのプレイヤーは日替わりランキングに参加できます。順位は、挑戦回数が少ない順、次にタイムが速い順です。",
						href: "/guess",
					},
				],
			},
			{
				heading: {
					en: "Terms and privacy",
					zh: "条款与隐私",
					ja: "利用規約とプライバシー",
				},
				items: [
					{
						en: "Every section of the terms and the privacy policy now starts with a one-line TL;DR. Both pages cover comparing, the badge, score downloads and the Guess the song leaderboard.",
						zh: "使用条款和隐私政策的每一节开头都新增了一句话总结。两份文件都已加入对比、徽章、成绩下载和猜曲绘排行榜的说明。",
						ja: "利用規約とプライバシーポリシーのすべての節が、1 行の TL;DR から始まるようになりました。どちらのページも、比較、バッジ、スコアのダウンロード、曲あてクイズのランキングについて説明しています。",
						href: "/privacy",
					},
				],
			},
		],
	},
	{
		date: "2026-10-28",
		sections: [
			{
				heading: {
					en: "Multiplayer server",
					zh: "多人游戏服务器",
					ja: "マルチプレイサーバー",
				},
				items: [
					{
						en: "The new Multiplayer server page shows whether PhiBot's Phira server is online, how many players and rooms there are, and who is in each room. It updates every 15 seconds; open it from the Phira page.",
						zh: "新的「多人游戏服务器」页面会显示 PhiBot 的 Phira 服务器是否在线、在线玩家与房间数量，以及每个房间里的玩家，每 15 秒更新一次。可从 Phira 页面进入。",
						ja: "新しい「マルチプレイサーバー」ページでは、PhiBot の Phira サーバーがオンラインか、プレイヤー数とルーム数、各ルームの参加者を確認できます。15 秒ごとに更新されます。Phira ページから開けます。",
						href: "/phira-mp",
					},
					{
						en: "Status now tracks the multiplayer server too: uptime, latency, players, rooms, CPU and memory.",
						zh: "运行状态页新增多人游戏服务器：可用率、延迟、玩家、房间、CPU 和内存。",
						ja: "「ステータス」でもマルチプレイサーバーを監視するようになりました。稼働時間、レイテンシ、プレイヤー数、ルーム数、CPU、メモリを確認できます。",
						href: "/status",
					},
				],
			},
		],
	},
	{
		date: "2026-10-27",
		sections: [
			{
				heading: { en: "New look", zh: "新外观", ja: "新デザイン" },
				items: [
					{
						en: "Checkout PhiBot's New homepage!",
						zh: "PhiBot 首页焕然一新！",
						ja: "PhiBot の新しいホームページをご覧ください。",
						href: "/",
					},
				],
			},
			{
				heading: { en: "Move save", zh: "迁移存档", ja: "セーブデータの移行" },
				items: [
					{
						en: "After a copy, Move save offers to bind the To account, so your cards and /b30 in Discord use the copied save.",
						zh: "复制完成后，「迁移存档」会询问是否绑定目标账号，之后成绩图和 Discord 里的 /b30 都会使用复制过去的存档。",
						ja: "コピーのあと、「セーブデータの移行」で To のアカウントを連携するか尋ねるようになりました。これで、カードや Discord の /b30 がコピーしたセーブデータを使います。",
						href: "/account/migrate",
					},
					{
						en: "If you sign in to PhiBot with TapTap, the offer tells you which TapTap account to sign in with afterwards.",
						zh: "如果你用 TapTap 登录 PhiBot，绑定提示会说明之后应使用哪个 TapTap 账号登录。",
						ja: "PhiBot に TapTap でサインインしている場合は、そのあとどの TapTap アカウントでサインインするかを案内します。",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复", ja: "修正" },
				items: [
					{
						en: "If TapTap fails while you switch to another account, the account you had stays bound, with its save.",
						zh: "切换到其他账号时若 TapTap 出错，原来绑定的账号及其存档都会保留。",
						ja: "別のアカウントへの切り替え中に TapTap が失敗しても、それまでのアカウントがセーブデータごと連携されたままになります。",
					},
					{
						en: "Switching the language changes the whole page at once, instead of the buttons first and the rest a moment later.",
						zh: "切换语言时整个页面会同时切换，不再先切换按钮、稍后才切换其余内容。",
						ja: "言語を切り替えると、ボタンが先に変わって残りが少し遅れる、ということがなく、ページ全体が一度に切り替わります。",
					},
					{
						en: "A failed TapTap request shows a message in your language instead of a raw code such as bind_failed.",
						zh: "TapTap 请求失败时会显示对应语言的提示，不再显示 bind_failed 之类的原始代码。",
						ja: "TapTap のリクエストが失敗したとき、bind_failed のような生のコードではなく、お使いの言語のメッセージを表示します。",
					},
				],
			},
		],
	},
	{
		date: "2026-10-25",
		sections: [
			{
				heading: {
					en: "Story timeline",
					zh: "剧情时间线",
					ja: "ストーリー年表",
				},
				items: [
					{
						en: "Files has a new Timeline tab: Phigros' story laid out by in-game date on a track you scroll sideways, with artwork for each era and a story map that shows every thread at once.",
						zh: "资源页新增「剧情」标签：按游戏内日期横向排列 Phigros 的剧情，每个纪元都有专属插图，剧情地图可一次纵览所有剧情线。",
						ja: "「ファイル」に新しい「年表」タブを追加しました。Phigros のストーリーをゲーム内の日付順に、横にスクロールするトラック上へ並べています。各時代のアートワークと、すべての筋を一度に見渡せるストーリーマップがあります。",
						href: "/files?view=timeline",
					},
					{
						en: "Zoom the cards from brief titles to full notes, zoom the story map up to 16×, and jump straight to any era.",
						zh: "事件卡片可在简要标题与完整注释之间缩放，剧情地图最多可放大 16 倍，也可以直接跳到任意纪元。",
						ja: "カードの表示を短い見出しから詳しいメモまで切り替えたり、ストーリーマップを最大 16× まで拡大したり、任意の時代へ直接ジャンプしたりできます。",
						href: "/files?view=timeline",
					},
					{
						en: "Events come from the Collection and from every page of the Limbo Wiki, each linked to the wiki pages behind it. Notes mark where the wiki adds to, backs up or contradicts an event, including deathMark's Q&A answers.",
						zh: "事件取自收藏品与林泊百科的全部页面，并链接到对应的百科页面。注释会标出百科对事件的补充、佐证或矛盾之处，也收录了 deathMark 的答疑。",
						ja: "出来事は「コレクション」と Limbo Wiki の全ページから集めており、それぞれ元になった Wiki のページにリンクしています。Wiki が出来事を補足、裏付け、または矛盾する箇所には、deathMark の Q&A の回答を含めてメモを付けています。",
						href: "/files?view=timeline",
					},
					{
						en: "The Eras, Threads and Chapters tabs list the story by period, by story thread and by chapter.",
						zh: "「纪元」「剧情线」「章节」标签分别按时期、剧情线与章节整理剧情。",
						ja: "「時代」「筋」「章」タブでは、時期別、ストーリーの筋別、章別にストーリーを一覧できます。",
						href: "/files?view=timeline&tab=eras",
					},
					{
						en: "Setting is a glossary of the Tower's places, peoples, groups, whims and ideas, each with the events that mention it: 190 official entries, plus over 3,000 from the community.",
						zh: "「设定」是像素塔的地点、族群、组织、异想与概念词典，每个条目都列出提到它的事件：190 条官方条目，另有 3,000 多条社区设定。",
						ja: "「世界観」は、塔の場所、民族、集団、気まぐれ、概念の用語集で、それぞれに言及する出来事を併記しています。公式の 190 項目に加えて、コミュニティの 3,000 項目以上を収録しています。",
						href: "/files?view=timeline&tab=setting",
					},
					{
						en: "Fan-written lore stays hidden until you choose Show community lore.",
						zh: "社区创作的设定默认隐藏，点击「显示社区设定」即可查看。",
						ja: "ファンが書いた設定は、「コミュニティ設定を表示」を選ぶまで表示されません。",
						href: "/files?view=timeline&community=1",
					},
				],
			},
			{
				heading: { en: "Account", zh: "账号", ja: "アカウント" },
				items: [
					{
						en: "Unbind now sits on the Account page, next to your sessionToken.",
						zh: "「解绑」按钮移至账号页面，位于 sessionToken 旁边。",
						ja: "「連携解除」を「アカウント」ページの sessionToken の隣に移しました。",
						href: "/account",
					},
					{
						en: "When TapTap rate limits PhiBot, sign-in and save errors now say so and suggest waiting a few minutes.",
						zh: "TapTap 对 PhiBot 限流时，登录与存档相关的报错会明确说明，并建议等几分钟再试。",
						ja: "TapTap が PhiBot をレート制限したとき、サインインやセーブデータのエラーでそのことを伝え、数分待つよう案内するようになりました。",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复", ja: "修正" },
				items: [
					{
						en: "Long pages have a Back to top button in the corner.",
						zh: "较长的页面右下角会出现「回到顶部」按钮。",
						ja: "長いページの隅に「トップへ戻る」ボタンを追加しました。",
					},
					{
						en: "Files and PV show a loading placeholder as soon as you click, instead of waiting on the old page.",
						zh: "点击资源或 PV 后会立即显示加载占位，不再停留在原页面等待。",
						ja: "「ファイル」と PV は、クリックするとすぐに読み込み中の表示が出て、古いページを待たずに済みます。",
						href: "/files",
					},
					{
						en: "The Phira page shows a spinner while it is still looking for a song's Legacy, SP and older charts.",
						zh: "Phira 页面在查找曲目的 Legacy、SP 谱面与旧版本时会显示加载提示。",
						ja: "Phira ページは、曲の Legacy、SP、旧バージョンの譜面を探している間、スピナーを表示します。",
						href: "/phira",
					},
				],
			},
		],
	},
	{
		date: "2026-10-22",
		sections: [
			{
				heading: { en: "Move save", zh: "迁移存档", ja: "セーブデータの移行" },
				items: [
					{
						en: "Move save, on the Account page, copies a Phigros cloud save from one TapTap account to another, on the CN or Global server. Sign in to each account by QR code, login link or sessionToken, then check both saves side by side before the copy. The From save is only read.",
						zh: "账号页面新增「迁移存档」：把一个 TapTap 账号的 Phigros 云存档复制到另一个账号，国服或国际服都可以。两个账号都可以用二维码、登录链接或 sessionToken 登录，复制前会并排核对两边的存档。来源存档只会被读取。",
						ja: "「アカウント」ページの「セーブデータの移行」は、Phigros のクラウドセーブデータを、CN サーバーまたは Global サーバー上のある TapTap アカウントから別の TapTap アカウントへコピーします。それぞれのアカウントに QR コード、ログインリンク、sessionToken のいずれかでサインインし、コピー前に 2 つのセーブデータを並べて確認します。From 側のセーブデータは読み取るだけです。",
						href: "/account/migrate",
					},
					{
						en: "When you sign in to TapTap by QR code, Copy link copies the login link so you can open it on another device, and Open login link opens it in a new tab.",
						zh: "用 TapTap 二维码登录时，可以点击「复制链接」复制登录链接，在其他设备上打开；「打开登录链接」会在新标签页中打开。",
						ja: "TapTap に QR コードでサインインするとき、「リンクをコピー」でログインリンクをコピーして別の端末で開け、「ログインリンクを開く」で新しいタブに開けます。",
					},
				],
			},
		],
	},
	{
		date: "2026-10-17",
		sections: [
			{
				heading: {
					en: "From older versions",
					zh: "旧版本内容",
					ja: "旧バージョンから",
				},
				items: [
					{
						en: "Pick a game version on the Phira page to download a song's charts as they were then: 289 older charts of 89 songs, from 1.2.0 on, each with the music of its version. Legacy charts stay listed whichever version you pick.",
						zh: "在 Phira 页面选择游戏版本，即可下载曲目当时的谱面：共 89 首曲目的 289 张旧版谱面，最早来自 1.2.0，每张都附带对应版本的音乐。无论选择哪个版本，Legacy 谱面都会显示。",
						ja: "Phira ページでゲームのバージョンを選ぶと、当時の譜面をダウンロードできます。1.2.0 以降の 89 曲、289 の旧譜面が対象で、それぞれ当時のバージョンの音楽が付いています。Legacy 譜面は、どのバージョンを選んでも一覧に残ります。",
						href: "/phira",
					},
					{
						en: "Files has an Old versions tab with every older chart and its pack.",
						zh: "资源页新增「旧版本」标签，收录所有旧版谱面及谱面包。",
						ja: "「ファイル」に「旧バージョン」タブを追加しました。すべての旧譜面とそのパックを収録しています。",
						href: "/files",
					},
					{
						en: "Christmas (from 1.2.4) and HAZARD's April Fools chart join the 4/1 charts.",
						zh: "4/1 特别谱面新增 Christmas（来自 1.2.4）与 HAZARD 的愚人节谱面。",
						ja: "クリスマス（1.2.4 から）と HAZARD のエイプリルフール譜面が 4/1 譜面に加わりました。",
						href: "/phira",
					},
					{
						en: "Winter ↑cube↓ BND now comes with the joke music it was charted to.",
						zh: "Winter ↑cube↓ 的 BND 谱面现在附带其原本的恶搞音乐。",
						ja: "Winter ↑cube↓ BND に、譜面制作時に使われたネタ音源が付くようになりました。",
						href: "/phira",
					},
					{
						en: "Destination, Anomaly and テリトリーバトル, songs the game has since removed: a Phira pack for every difficulty, plus the music, illustration and charts, from the last version that had them.",
						zh: "收录游戏已移除的曲目 Destination、Anomaly 与 テリトリーバトル：每个难度的 Phira 谱面包，以及音乐、曲绘与谱面，取自最后收录它们的版本。",
						ja: "その後ゲームから削除された曲、Destination、Anomaly、テリトリーバトルを、最後に収録していたバージョンの音楽、イラスト、譜面とともに追加しました。全難易度分の Phira パックがあります。",
						href: "/phira",
					},
					{
						en: "The 24 Legacy charts removed in 2.4.1, and hidden charts from early versions: Dead Soul, Rubbish Sorting, もぺもぺ and Wavetapper SP, 混乱-Confusion AT and Winter ↑cube↓ BND. Each pack carries the music it was charted to.",
						zh: "收录 2.4.1 移除的 24 张 Legacy 谱面，以及早期版本的隐藏谱面：Dead Soul、Rubbish Sorting、もぺもぺ 与 Wavetapper 的 SP，混乱-Confusion 的 AT，以及 Winter ↑cube↓ 的 BND。每个谱面包都附带写谱时所用的音乐。",
						ja: "2.4.1 で削除された 24 の Legacy 譜面と、初期バージョンの隠し譜面：Dead Soul、Rubbish Sorting、もぺもぺ、Wavetapper SP、混乱-Confusion AT、Winter ↑cube↓ BND。各パックには、譜面制作時の音楽が含まれます。",
						href: "/phira",
					},
					{
						en: "The Phira page marks each one with the version it comes from, and Files has a new Removed tab.",
						zh: "Phira 页面会注明每张谱面来自哪个版本，资源页也新增了「已移除」标签。",
						ja: "Phira ページでは、それぞれに収録元のバージョンを表示し、「ファイル」には新しい「削除済み」タブがあります。",
						href: "/files",
					},
				],
			},
			{
				heading: { en: "Sharing", zh: "分享", ja: "共有" },
				items: [
					{
						en: "A link to any PhiBot page now shows a preview image for that page, and a shared card's link previews that player's card.",
						zh: "分享任意 PhiBot 页面链接时都会显示该页面的预览图，分享的成绩图链接会预览该玩家的成绩图。",
						ja: "PhiBot の任意のページへのリンクにそのページのプレビュー画像が表示され、共有されたカードのリンクにはそのプレイヤーのカードがプレビューされます。",
					},
				],
			},
			{
				heading: { en: "Files", zh: "资源", ja: "ファイル" },
				items: [
					{
						en: "Files, PV and Collection now switch with tabs at the top, so each page uses the full width.",
						zh: "资源、PV、收藏品改为页面顶部的标签切换，每个页面都能使用完整宽度。",
						ja: "「ファイル」「PV」「コレクション」が上部のタブで切り替わるようになり、各ページが全幅を使えます。",
						href: "/files",
					},
					{
						en: "Every chart can be downloaded as the game's own JSON: choose Chart JSON in Files.",
						zh: "所有谱面都可以下载游戏原始 JSON：在资源中选择「谱面 JSON」。",
						ja: "すべての譜面を、ゲーム本来の JSON としてダウンロードできます。「ファイル」で「譜面 JSON」を選んでください。",
						href: "/files",
					},
					{
						en: "Song cards and Files name the illustrator next to each illustration.",
						zh: "曲目卡片与资源页会在曲绘旁注明画师。",
						ja: "曲カードと「ファイル」で、各イラストの隣にイラストレーターの名前を表示します。",
						href: "/files",
					},
					{
						en: "The Files page no longer jumps while its list loads.",
						zh: "资源页在列表加载时不再跳动。",
						ja: "一覧の読み込み中に「ファイル」ページがガタつかなくなりました。",
					},
				],
			},
			{
				heading: { en: "PV", zh: "PV", ja: "PV" },
				items: [
					{
						en: "Watch or download the game's chapter and event videos, including the unlock PVs from earlier versions.",
						zh: "可以在线观看或下载游戏内的章节与活动视频，包括历史版本的解锁 PV。",
						ja: "ゲームの章やイベントの動画を視聴・ダウンロードできます。過去のバージョンのアンロック PV も含みます。",
						href: "/files?view=pv",
					},
					{
						en: "Turn on the in-game overlay to see a PV with its song card, at the difficulty you pick.",
						zh: "开启「游戏内界面」即可查看带曲目卡片的 PV，并可选择卡片上显示的难度。",
						ja: "ゲーム内オーバーレイをオンにすると、選んだ難易度で曲カード付きの PV を見られます。",
						href: "/files?view=pv",
					},
					{
						en: "The QD and After Deduction captions come in all five of the game's languages, and both PVs link to their transcripts.",
						zh: "QD 与 After Deduction 的字幕支持游戏的全部五种语言，两段 PV 均可跳转到字幕文本。",
						ja: "QD と After Deduction の字幕は、ゲームの 5 言語すべてに対応し、どちらの PV からもトランスクリプトにリンクしています。",
						href: "/files?view=pv&v=qd",
					},
					{
						en: "On wide screens the video list sits beside the player. On phones, picking a video keeps your place, and a Back to player button takes you up.",
						zh: "宽屏下视频列表位于播放器旁边；手机上选择视频不再跳回顶部，可用「回到播放器」按钮返回。",
						ja: "ワイド画面では、動画リストがプレーヤーの横に並びます。スマートフォンでは、動画を選んでも位置が保たれ、「プレーヤーへ戻る」ボタンで上に戻れます。",
						href: "/files?view=pv",
					},
					{
						en: "Deduction, the scene before After Deduction, is now a PV in all five of the game's languages, and you can also play it interactively, tap by tap, as in the game.",
						zh: "After Deduction 之前的「推演」场景现已加入 PV，支持游戏的全部五种语言；也可以像游戏中一样点击推进，互动重播。",
						ja: "After Deduction の前のシーンである Deduction が、ゲームの 5 言語すべての PV になりました。ゲームと同じように、タップしながら操作して再生することもできます。",
						href: "/files?view=pv&v=deduction",
					},
				],
			},
			{
				heading: { en: "Collection", zh: "收藏品", ja: "コレクション" },
				items: [
					{
						en: "Search the whole Collection: every chapter's titles and text, in the language you pick, with the matches highlighted.",
						zh: "可以搜索全部收藏品：在所选语言下搜索各章节的标题与正文，并高亮匹配内容。",
						ja: "コレクション全体を検索できます。選んだ言語で、すべての章のタイトルと本文から探し、一致箇所をハイライトします。",
						href: "/files?view=collection",
					},
					{
						en: "Collection and Game text pages use the full width, with the On this page list at the right edge.",
						zh: "收藏品与游戏文本页面使用完整宽度，「本页内容」列表位于最右侧。",
						ja: "「コレクション」と「ゲームテキスト」のページが全幅を使い、右端に「このページの内容」リストを表示します。",
						href: "/files?view=collection",
					},
					{
						en: "Read every Collection entry, filed by chapter as in the game, with each clue and how it unlocks.",
						zh: "按游戏中的章节浏览全部收藏品，包括每条线索及其解锁条件。",
						ja: "ゲームと同じ章ごとの分類で、コレクションのすべての項目を読めます。各手がかりとそのアンロック方法も載っています。",
						href: "/files?view=collection",
					},
					{
						en: "Chapter IX shows the OS map's illustrations beside or above the text, as the game does, with a full-size view.",
						zh: "第九章收藏品按游戏中的样式显示 OS 地图插图，并可查看原图。",
						ja: "第 IX 章では、ゲームと同じように、OS マップのイラストをテキストの横または上に表示し、原寸表示もできます。",
						href: "/files?view=collection&chapter=c9",
					},
					{
						en: "Three Chapter IX entries also show the text the map shows before the story unlocks them.",
						zh: "三条第九章收藏品同时显示剧情解锁前地图上的文字。",
						ja: "第 IX 章の 3 つの項目では、ストーリーがアンロックされる前にマップが表示するテキストも見られます。",
						href: "/files?view=collection&chapter=c9",
					},
					{
						en: "Read the Collection in any of the game's five languages, whatever language the site is in.",
						zh: "收藏品可切换为游戏的五种语言之一，与网站语言无关。",
						ja: "サイトの言語に関係なく、ゲームの 5 言語のどれでもコレクションを読めます。",
						href: "/files?view=collection",
					},
					{
						en: "Entries show the details the game lists with them, such as a recording's length or a file number.",
						zh: "收藏品会显示游戏列出的附加信息，例如录音时长或档案编号。",
						ja: "録音の長さやファイル番号など、ゲームが項目に添えている詳細も表示します。",
						href: "/files?view=collection",
					},
					{
						en: "Chapter IX entries show the tiles the OS map draws for them.",
						zh: "第九章收藏品显示 OS 地图上对应的图块。",
						ja: "第 IX 章の項目に、OS マップが描くタイルを表示します。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: { en: "Cards", zh: "成绩图", ja: "カード" },
				items: [
					{
						en: "Chart tags and Simulation are now tabs of the Cards page, next to B30 and the other cards; the top menu is shorter.",
						zh: "谱面标签与曲目模拟现在是成绩图页面的标签页，与 B30 等成绩图并列；顶部菜单更简洁。",
						ja: "譜面タグとシミュレーションが、B30 などのカードと並ぶ「カード」ページのタブになりました。上部メニューは短くなっています。",
						href: "/me/b30",
					},
				],
			},
			{
				heading: {
					en: "Other resources",
					zh: "其他资源",
					ja: "その他のリソース",
				},
				items: [
					{
						en: "Game text is now Other resources: the loading tips in all five of the game's languages, every avatar with its name, and the About us staff roll.",
						zh: "「游戏文本」更名为「其他资源」：收录五种语言的加载提示、全部头像及其名称，以及「关于我们」中的制作人员名单。",
						ja: "「ゲームテキスト」が「その他のリソース」になりました。ゲームの 5 言語すべてのローディングのヒント、名前付きのすべてのアバター、スタッフロール「About us」を収録しています。",
						href: "/files?view=texts",
					},
					{
						en: "Story lines that only live in the game's code now sit with their chapter in the Collection: Chapter IX has the Baseline Challenge monologue, its unlock popups, the After Deduction captions and the ending staff roll; Chapter VIII has the QD captions.",
						zh: "只存在于游戏代码中的剧情文本移至收藏品的对应章节：第九章收录 Baseline Challenge 独白、解锁提示、After Deduction 字幕与片尾制作人员名单；第八章收录 QD 字幕。",
						ja: "ゲームのコードの中にしかなかったストーリーの文章を、コレクションの該当章に収めました。第 IX 章には Baseline Challenge のモノローグ、アンロックのポップアップ、After Deduction の字幕、エンディングのスタッフロールが、第 VIII 章には QD の字幕があります。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: {
					en: "Chapter IX hidden song",
					zh: "第九章隐藏曲",
					ja: "第 IX 章の隠し曲",
				},
				items: [
					{
						en: "True home, True world, the song behind the Chapter IX passcode: its stats, music, Phira pack (SP Lv.?), chart and background.",
						zh: "True home, True world：第九章密码背后的隐藏曲，提供物量、音乐、Phira 谱面包（SP Lv.?）、谱面与背景。",
						ja: "第 IX 章のパスコードの先にある曲、True home, True world：ステータス、音楽、Phira パック（SP Lv.?）、譜面、背景を掲載しています。",
						href: "/files?view=c9s6",
					},
					{
						en: "Replay the cutscene the game plays before it, in any of its five languages.",
						zh: "可以重播游戏在这首歌之前播放的过场剧情，支持游戏的五种语言。",
						ja: "その前にゲームが流すカットシーンを、ゲームの 5 言語のどれでも再生できます。",
						href: "/files?view=c9s6",
					},
					{
						en: "The Answer in Chapter IX shows its map tile and links to the song.",
						zh: "第九章收藏品「答案」显示其地图图块，并链接到这首歌。",
						ja: "第 IX 章の「The Answer」に、そのマップタイルを表示し、曲へリンクします。",
						href: "/files?view=collection&chapter=c9",
					},
				],
			},
			{
				heading: {
					en: "Charts and Phira packs",
					zh: "谱面与 Phira 谱面包",
					ja: "譜面と Phira パック",
				},
				items: [
					{
						en: "Phira packs for charts the song list does not offer: Message SP (only in Chapter IX's Baseline Challenge) and 望影の方舟Six EZ, HD and IN Error (only during the Igallta unlock).",
						zh: "新增歌曲列表之外的谱面包：Message SP（仅在第九章 Baseline Challenge 中出现）与 望影の方舟Six EZ、HD、IN Error（仅在 Igallta 解锁过程中出现）。",
						ja: "曲リストにない譜面の Phira パックを追加しました。Message SP（第 IX 章の Baseline Challenge でのみ登場）と、望影の方舟Six の EZ、HD、IN Error（Igallta のアンロック中のみ登場）です。",
						href: "/phira",
					},
					{
						en: "Phira packs for the four Legacy charts, with their own difficulty and charter.",
						zh: "新增四首歌曲 Legacy 谱面的 Phira 谱面包，含其定数与谱师。",
						ja: "4 つの Legacy 譜面の Phira パックを、それぞれの難易度と譜面制作者とともに追加しました。",
						href: "/phira",
					},
					{
						en: "Pick these levels on the Phira page, or find them under Chart in Files.",
						zh: "可以在 Phira 页面选择这些难度，也可以在资源的「谱面」中找到。",
						ja: "これらのレベルは、Phira ページで選ぶか、「ファイル」の「譜面」から見つけられます。",
						href: "/phira",
					},
				],
			},
			{
				heading: { en: "Fixes", zh: "修复", ja: "修正" },
				items: [
					{
						en: "Illustrations, music, videos and packs load faster: your browser and our CDN now keep them, and a link changes as soon as its file does. If something still looks out of date, use Refresh files at the bottom of any page.",
						zh: "曲绘、音乐、视频与谱面包加载更快：浏览器与 CDN 会缓存这些文件，文件一更新链接就会随之改变。如仍看到旧内容，可点击页面底部的「刷新文件缓存」。",
						ja: "イラスト、音楽、動画、パックの読み込みが速くなりました。ブラウザと CDN が保持するようになり、ファイルが変わるとリンクもすぐに変わります。それでも古く見える場合は、どのページでも下部の「ファイルを更新」を使ってください。",
					},
					{
						en: "Files have tidier names: chart JSON sits in chart/<song>/ without the .0, and the 4/1, removed and old-version files are named after the game's own track ids. Links saved to the old names no longer work.",
						zh: "资源文件命名更统一：谱面 JSON 位于 chart/<曲目>/（不再带 .0），4/1、已移除与旧版本文件均以游戏的曲目 ID 命名。旧文件名的链接已失效。",
						ja: "ファイル名を整理しました。譜面 JSON は .0 なしで chart/<song>/ に置かれ、4/1、削除済み、旧バージョンのファイルはゲーム本来のトラック ID で名付けられます。古い名前で保存したリンクは使えなくなります。",
						href: "/files",
					},
					{
						en: "Language pickers fit on one line on phones.",
						zh: "语言选择栏在手机上改为单行显示。",
						ja: "言語ピッカーがスマートフォンで 1 行に収まります。",
					},
					{
						en: "Fix slightly wrong transparency at the avatar edges.",
						zh: "修复头像边缘透明度的细微错误。",
						ja: "アバターの縁の透明度がわずかにずれていた問題を修正しました。",
					},
					{
						en: "The Video category in Files now lists only videos; the PV manifests moved to Other.",
						zh: "资源页的「视频」分类现在只列出视频文件，PV 清单文件移至「其他」。",
						ja: "「ファイル」の「動画」カテゴリには動画のみが表示されるようになり、PV マニフェストは「その他」へ移動しました。",
					},
				],
			},
		],
	},
];
