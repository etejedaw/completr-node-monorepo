export const SHARE_COLORS = {
	canvas: "#0a0a0c",
	surface: "#131318",
	foreground: "#f5f5f7",
	secondary: "#d4d4d8",
	muted: "#a1a1aa",
	ink: "#0a0a0c",
	brand: "#8b5cf6",
	brandLight: "#a78bfa",
	finished: "#10b981",
	abandoned: "#ef4444",
	started: "#38bdf8",
	platinum: "#67e8f9",
	pink: "#fb7185",
	orange: "#fb923c",
	lime: "#a3e635",
	blue: "#60a5fa"
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
export const BACKDROP_FETCH_WIDTH = 640;
export const SHARE_IMAGE_CACHE_SIZE = 100;
