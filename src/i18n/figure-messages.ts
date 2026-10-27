// Figure captions and legends: only server components read them, so the client bundle leaves them out

export type FigureMessages = {
	figures: {
		label: string;
		b30: {
			caption: string;
			assembled: string;
			parts: Record<
				"header" | "phi" | "best" | "panel" | "backdrop",
				{ name: string; note: string }
			>;
		};
		chart: {
			caption: string;
			parts: Record<
				"line" | "art" | "drag" | "tap" | "hold" | "flick",
				{ name: string; note: string }
			>;
		};
		pez: {
			caption: string;
			parts: Record<
				"art" | "chart" | "music" | "info" | "pack",
				{ name: string; note: string }
			>;
		};
	};
};

export const figuresEn: FigureMessages = {
	figures: {
		label: "Fig. {n}",
		b30: {
			caption: "A B30 card, taken apart",
			assembled: "Put back together, it is one image",
			parts: {
				header: { name: "Player header", note: "Your name, avatar and RKS." },
				phi: { name: "Phi slots", note: "Your three best All Perfect charts." },
				best: {
					name: "Best 30",
					note: "Your top charts by RKS, each with jacket, score and accuracy.",
				},
				panel: {
					name: "Glass panel",
					note: "A frosted layer that keeps the text readable.",
				},
				backdrop: {
					name: "Background art",
					note: "A song's illustration. Random, unless you pick one.",
				},
			},
		},
		chart: {
			caption: "A chart, taken apart",
			parts: {
				line: {
					name: "Judge line",
					note: "Notes are judged as they reach it. It moves and turns.",
				},
				art: {
					name: "Illustration",
					note: "The song's art, dimmed behind the play.",
				},
				drag: {
					name: "Drag",
					note: "Keep a finger on it as it crosses the line.",
				},
				tap: { name: "Tap", note: "Tap as it reaches the line." },
				hold: {
					name: "Hold",
					note: "Press at the head and hold until the tail passes.",
				},
				flick: { name: "Flick", note: "Swipe as it crosses the line." },
			},
		},
		pez: {
			caption: "What a .pez pack holds",
			parts: {
				art: { name: "Illustration", note: "The song's jacket art." },
				chart: {
					name: "Chart",
					note: "The chart JSON for the difficulty you picked.",
				},
				music: { name: "Music", note: "The full song." },
				info: {
					name: "Info file",
					note: "Name, composer, charter and level, read by Phira.",
				},
				pack: { name: "Pack", note: "One zip file that Phira imports." },
			},
		},
	},
};

export const figuresZh: FigureMessages = {
	figures: {
		label: "图 {n}",
		b30: {
			caption: "拆开一张 B30 成绩图",
			assembled: "装回去，就是一张图",
			parts: {
				header: { name: "玩家信息", note: "名字、头像和 RKS" },
				phi: { name: "Phi 位", note: "三首最好的 All Perfect 谱面" },
				best: {
					name: "Best 30",
					note: "按 RKS 排出的最佳谱面，每格有曲绘、分数和准确率",
				},
				panel: { name: "玻璃面板", note: "一层磨砂，让文字始终清楚" },
				backdrop: {
					name: "背景曲绘",
					note: "一首曲目的曲绘，默认随机，也可以自己选",
				},
			},
		},
		chart: {
			caption: "拆开一张谱面",
			parts: {
				line: { name: "判定线", note: "音符到达时判定，判定线会移动和旋转" },
				art: { name: "曲绘", note: "曲目的曲绘，游玩时调暗作背景" },
				drag: { name: "Drag 黄键", note: "经过判定线时手指放在上面即可" },
				tap: { name: "Tap 蓝键", note: "到达判定线时点击" },
				hold: { name: "Hold 长条", note: "在头部按下，一直按到尾部经过" },
				flick: { name: "Flick 红键", note: "经过判定线时滑动" },
			},
		},
		pez: {
			caption: ".pez 谱面包里有什么",
			parts: {
				art: { name: "曲绘", note: "曲目的曲绘图片" },
				chart: { name: "谱面", note: "所选难度的谱面 JSON" },
				music: { name: "音乐", note: "完整的曲目音频" },
				info: {
					name: "信息文件",
					note: "曲名、曲师、谱师和定数，供 Phira 读取",
				},
				pack: { name: "谱面包", note: "一个 zip 文件，Phira 可以直接导入" },
			},
		},
	},
};
