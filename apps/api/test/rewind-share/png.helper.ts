import { Resvg } from "@resvg/resvg-js";

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;

export function hasPngSignature(png: Buffer): boolean {
	return png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

export function pngDimensions(png: Buffer): { width: number; height: number } {
	return {
		width: png.readUInt32BE(IHDR_WIDTH_OFFSET),
		height: png.readUInt32BE(IHDR_HEIGHT_OFFSET)
	};
}

export function samplePng(): Buffer {
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="#8b5cf6"/></svg>';
	return new Resvg(svg).render().asPng();
}
