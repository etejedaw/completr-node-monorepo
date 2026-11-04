export const SHARE_COLORS = {
	canvas: "#0a0a0c",
	surface: "#131318",
	foreground: "#f5f5f7",
	secondary: "#d4d4d8",
	muted: "#a1a1aa",
	brand: "#8b5cf6",
	brandLight: "#a78bfa",
	brandPale: "#c4b5fd",
	brandDeep: "#6d28d9"
} as const;

export const SHARE_FONT_FAMILY = {
	display: "Chakra Petch",
	text: "Manrope"
} as const;

export const SHARE_IMAGE_SIZES = {
	story: { width: 1080, height: 1920 },
	og: { width: 1200, height: 630 }
} as const;

export const COVER_FETCH_TIMEOUT_MS = 3000;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_FETCH_WIDTH = 420;
export const SHARE_IMAGE_CACHE_SIZE = 100;

export type RewindImageFormat = keyof typeof SHARE_IMAGE_SIZES;
