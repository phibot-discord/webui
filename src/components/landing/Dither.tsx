"use client";

import { useEffect, useRef } from "react";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function sphere(u: number, v: number) {
	const x = u * 2 - 1;
	const y = v * 2 - 1;
	const r = x * x + y * y;
	if (r > 1) return 0;
	const lit = -0.48 * x - 0.56 * y + 0.68 * Math.sqrt(1 - r);
	return Math.max(0, lit) ** 1.3;
}

export function DitherBall({
	size,
	cell = 3,
	className,
}: {
	size: number;
	cell?: number;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = ref.current;
		const small = document.createElement("canvas");
		small.width = size;
		small.height = size;
		const sctx = small.getContext("2d");
		if (!node || !sctx) return;
		const img = sctx.createImageData(size, size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const level = sphere((x + 0.5) / size, (y + 0.5) / size) * 16;
				if (level > (BAYER[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) {
					img.data[(y * size + x) * 4 + 3] = 255;
				}
			}
		}
		sctx.putImageData(img, 0, 0);

		const scale = cell * Math.max(1, Math.round(window.devicePixelRatio || 1));
		const big = document.createElement("canvas");
		big.width = size * scale;
		big.height = size * scale;
		const bctx = big.getContext("2d");
		if (!bctx) return;
		bctx.imageSmoothingEnabled = false;
		bctx.drawImage(small, 0, 0, big.width, big.height);

		let url = "";
		let live = true;
		big.toBlob((blob) => {
			if (!blob || !live) return;
			url = URL.createObjectURL(blob);
			node.style.maskImage = `url(${url})`;
			node.style.webkitMaskImage = `url(${url})`;
			node.dataset.ready = "";
		});
		return () => {
			live = false;
			if (url) URL.revokeObjectURL(url);
		};
	}, [size, cell]);

	return <div ref={ref} className={className} aria-hidden="true" />;
}
