let backgroundOf = (_name: string): string => "";

export function bindBackground(fn: (name: string) => string) {
	backgroundOf = fn;
}

let shanghaiFormat: Intl.DateTimeFormat | undefined;
function shanghaiDateFormat() {
	shanghaiFormat ??= new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	return shanghaiFormat;
}

export const fCompute = {
	rks(acc: number, difficulty: number) {
		if (acc === 100) return Number(difficulty);
		if (acc < 70) return 0;
		return difficulty * (((acc - 55) / 45) * ((acc - 55) / 45));
	},
	rate(realScore: number, fc: boolean | number, totScore = 1_000_000) {
		if (realScore === totScore) return "phi";
		if (fc) return "FC";
		if (realScore >= totScore * 0.96) return "V";
		if (realScore >= totScore * 0.92) return "S";
		if (realScore >= totScore * 0.88) return "A";
		if (realScore >= totScore * 0.82) return "B";
		if (realScore >= totScore * 0.7) return "C";
		if (realScore > 0) return "F";
		return "NEW";
	},
	comJust1Good(score: number, maxc: number) {
		const tar = 900000 * (1 - 0.35 / maxc) + 100000;
		return Math.abs(score - tar) <= 2;
	},
	randArray<T>(arr: T[]): T[] {
		return [...arr].sort(() => Math.random() - 0.5);
	},
	range(value: number, span: number[]) {
		const a = span[0] ?? 0;
		const b = span[span.length - 1] ?? a;
		if (a === b) return 50;
		return Math.abs(((value - a) / (b - a)) * 100);
	},
	toHex(num: number) {
		return num < 16 ? `0${num.toString(16)}` : num.toString(16);
	},
	getRandomBgColor() {
		const red = Math.floor(Math.random() * 201);
		const green = Math.floor(Math.random() * 201);
		const blue = Math.floor(Math.random() * 201);
		return `#${fCompute.toHex(red)}${fCompute.toHex(green)}${fCompute.toHex(blue)}`;
	},
	getBackground(saveBackground: string) {
		return backgroundOf(saveBackground);
	},
	convertRichText(richText?: string, onlyText = false) {
		if (!richText) return richText;
		let out = richText
			.slice(0, 2000)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
		const colorRe = /&lt;color\s*=\s*(.*?)&gt;(.*?)&lt;\/color&gt;/g;
		const italicRe = /&lt;i&gt;(.*?)&lt;\/i&gt;/g;
		const boldRe = /&lt;b&gt;(.*?)&lt;\/b&gt;/g;
		const colorValue =
			/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^[a-zA-Z]{1,20}$/;
		const max = 1000;
		let count = 0;
		let last = -1;
		const wrap = (
			whole: string,
			inner: string,
			open: string,
			close: string,
		) => {
			if (count >= max) return whole;
			count++;
			return onlyText ? inner : `${open}${inner}${close}`;
		};
		while (count < max && count !== last) {
			last = count;
			out = out.replace(
				colorRe,
				(whole: string, raw: string, inner: string) => {
					if (!inner) return whole;
					const value = raw.replace(/&quot;|&#39;|\s/g, "");
					const color = colorValue.test(value) ? value : "inherit";
					return wrap(whole, inner, `<span style="color:${color}">`, "</span>");
				},
			);
			out = out.replace(italicRe, (whole: string, inner: string) =>
				wrap(whole, inner, "<i>", "</i>"),
			);
			out = out.replace(boldRe, (whole: string, inner: string) =>
				wrap(whole, inner, "<b>", "</b>"),
			);
		}
		return out.replace(/\n\r?/g, "<br>");
	},
	suggest(rks: number, difficulty: number, count?: number) {
		const ans = 45 * Math.sqrt(rks / difficulty) + 55;
		if (ans >= 100) return count !== undefined ? "无法推分" : -1;
		return count !== undefined ? `${ans.toFixed(count)}%` : ans;
	},
	formatDate(date?: Date | string | number, formater = "YYYY/MM/DD hh:mm:ss") {
		const d = date ? new Date(date) : new Date();
		const parts = Object.fromEntries(
			shanghaiDateFormat()
				.formatToParts(d)
				.map((p) => [p.type, p.value]),
		);
		return formater
			.replace("YYYY", parts.year ?? "")
			.replace("MM", parts.month ?? "")
			.replace("DD", parts.day ?? "")
			.replace("hh", parts.hour ?? "")
			.replace("mm", parts.minute ?? "")
			.replace("ss", parts.second ?? "");
	},
};
