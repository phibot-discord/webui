import type { Locale } from "./config";
import type { ClientMessages } from "./messages";

export const globalErrorMessages: Record<
	Locale,
	Pick<ClientMessages, "brand" | "error">
> = {
	en: {
		brand: "PhiBot",
		error: {
			code: "Error",
			title: "This page failed to load",
			body: "Something went wrong on our side. Try again, or go back to the home page.",
			retry: "Try again",
			home: "Home page",
			digest: "Reference",
		},
	},
	zh: {
		brand: "PhiBot",
		error: {
			code: "错误",
			title: "页面加载失败",
			body: "服务端出了点问题。请重试，或返回首页",
			retry: "重试",
			home: "返回首页",
			digest: "错误编号",
		},
	},
	ja: {
		brand: "PhiBot",
		error: {
			code: "エラー",
			title: "このページを読み込めませんでした",
			body: "こちら側で問題が発生しました。もう一度試すか、ホームページに戻ってください。",
			retry: "再試行",
			home: "ホームページ",
			digest: "参照番号",
		},
	},
};
