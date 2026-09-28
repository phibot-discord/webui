declare module "qrcode" {
	const QRCode: {
		toBuffer: (
			text: string,
			opts?: {
				scale?: number;
				margin?: number;
				color?: { dark?: string; light?: string };
			},
		) => Promise<Buffer>;
	};
	export default QRCode;
}
