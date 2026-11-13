declare module 'qrcode' {
	const QRCode: {
		toDataURL: (
			text: string,
			options?: {
				errorCorrectionLevel?: string;
				margin?: number;
				width?: number;
			},
		) => Promise<string>;
	};
	export default QRCode;
}
