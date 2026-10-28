import {
	COVER_FETCH_TIMEOUT_MS,
	COVER_FETCH_WIDTH,
	COVER_MAX_BYTES
} from "../rewind-share.constants";

const RAWG_MEDIA_PREFIX = "https://media.rawg.io/media/";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function resizedCoverUrl(url: string): string {
	if (!url.startsWith(RAWG_MEDIA_PREFIX)) return url;
	const path = url.slice(RAWG_MEDIA_PREFIX.length);
	if (path.startsWith("resize/") || path.startsWith("crop/")) return url;
	return `${RAWG_MEDIA_PREFIX}resize/${COVER_FETCH_WIDTH}/-/${path}`;
}

function startsWith(bytes: Buffer, signature: number[]): boolean {
	return signature.every((byte, index) => bytes[index] === byte);
}

function imageMimeType(bytes: Buffer): string | null {
	if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
	if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
	return null;
}

function isHttpUrl(url: string): boolean {
	try {
		const { protocol } = new URL(url);
		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
}

async function downloadImage(url: string): Promise<Buffer | null> {
	const response = await fetch(resizedCoverUrl(url), {
		signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS)
	});
	if (!response.ok) return null;
	if (Number(response.headers.get("content-length")) > COVER_MAX_BYTES)
		return null;
	const bytes = Buffer.from(await response.arrayBuffer());
	return bytes.length > COVER_MAX_BYTES ? null : bytes;
}

export async function fetchCoverDataUri(
	url: string | null
): Promise<string | null> {
	if (!url || !isHttpUrl(url)) return null;
	try {
		const bytes = await downloadImage(url);
		if (!bytes) return null;
		const mimeType = imageMimeType(bytes);
		if (!mimeType) return null;
		return `data:${mimeType};base64,${bytes.toString("base64")}`;
	} catch {
		return null;
	}
}
