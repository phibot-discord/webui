import type { FigureMessages } from "./figure-messages";

export const figuresJa: FigureMessages = {
	figures: {
		label: "図 {n}",
		b30: {
			caption: "B30 カードを分解する",
			assembled: "組み立て直すと、1 枚の画像になります",
			parts: {
				header: {
					name: "プレイヤーヘッダー",
					note: "名前、アバター、RKS。",
				},
				phi: {
					name: "Phi 枠",
					note: "ベストの All Perfect 譜面 3 つ。",
				},
				best: {
					name: "Best 30",
					note: "RKS 上位の譜面。ジャケット、スコア、精度つき。",
				},
				panel: {
					name: "ガラスパネル",
					note: "すりガラス状の層で、文字を読みやすく保ちます。",
				},
				backdrop: {
					name: "背景イラスト",
					note: "楽曲のイラスト。選ばない場合はランダムです。",
				},
			},
		},
		chart: {
			caption: "譜面を分解する",
			parts: {
				line: {
					name: "判定線",
					note: "ノーツは判定線に届いたときに判定されます。動いたり回転したりします。",
				},
				art: {
					name: "イラスト",
					note: "楽曲のイラスト。プレイ中は暗くして背景に敷きます。",
				},
				drag: {
					name: "Drag",
					note: "判定線を通過する間、指を置いておきます。",
				},
				tap: { name: "Tap", note: "判定線に届いたらタップします。" },
				hold: {
					name: "Hold",
					note: "先頭で押して、終端が通過するまで押し続けます。",
				},
				flick: {
					name: "Flick",
					note: "判定線を通過するときにスワイプします。",
				},
			},
		},
		pez: {
			caption: ".pez パックの中身",
			parts: {
				art: { name: "イラスト", note: "楽曲のジャケット画像。" },
				chart: {
					name: "譜面",
					note: "選んだ難易度の譜面 JSON。",
				},
				music: { name: "音楽", note: "楽曲のフル音源。" },
				info: {
					name: "情報ファイル",
					note: "曲名、作曲者、譜面作者、レベル。Phira が読み込みます。",
				},
				pack: {
					name: "パック",
					note: "Phira にインポートできる zip ファイル 1 つ。",
				},
			},
		},
	},
};
