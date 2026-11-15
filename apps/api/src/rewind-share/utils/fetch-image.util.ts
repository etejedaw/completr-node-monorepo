import {
	COVER_FETCH_TIMEOUT_MS,
	COVER_FETCH_WIDTH,
	COVER_MAX_BYTES
} from "../rewind-share.constants";

const RAWG_MEDIA_PREFIX = "https://media.rawg.io/media/";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function resizedImageUrl(url: string, width: number): string {
	if (!url.startsWith(RAWG_MEDIA_PREFIX)) return url;
	const path = url.slice(RAWG_MEDIA_PREFIX.length);
	if (path.startsWith("resize/") || path.startsWith("crop/")) return url;
	return `${RAWG_MEDIA_PREFIX}resize/${width}/-/${path}`;
}

function startsWith(bytes: Buffer, signature: number[]): boolean {
	return signature.every((byte, index) => bytes[index] === byte);
}

function imageMimeType(bytes: Buffer): string | null {
	if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
	if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
	return null;
}

function isHttpsUrl(url: string): boolean {
	try {
		return new URL(url).protocol === "https:";
	} catch {
		return false;
	}
}

async function readBodyWithinLimit(
	response: Response,
	maxBytes: number
): Promise<Buffer | null> {
	if (!response.body) return null;
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return Buffer.concat(chunks);
		received += value.length;
		if (received > maxBytes) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
}

async function downloadImage(
	url: string,
	width: number
): Promise<Buffer | null> {
	const response = await fetch(resizedImageUrl(url, width), {
		signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS)
	});
	if (!response.ok) return null;
	if (Number(response.headers.get("content-length")) > COVER_MAX_BYTES)
		return null;
	return readBodyWithinLimit(response, COVER_MAX_BYTES);
}

export async function fetchImageDataUri(
	url: string | null,
	width = COVER_FETCH_WIDTH
): Promise<string | null> {
	if (!url || !isHttpsUrl(url)) return null;
	try {
		const bytes = await downloadImage(url, width);
		if (!bytes) return null;
		const mimeType = imageMimeType(bytes);
		if (!mimeType) return null;
		return `data:${mimeType};base64,${bytes.toString("base64")}`;
	} catch {
		return null;
	}
}
