export const SHARE_COLORS = {
	canvas: "#0a0a0c",
	surface: "#131318",
	foreground: "#f5f5f7",
	secondary: "#a1a1aa",
	muted: "#71717a",
	brand: "#8b5cf6",
	brandGlow: "rgba(139, 92, 246, 0.28)",
	finished: "#10b981",
	abandoned: "#ef4444",
	started: "#38bdf8",
	platinum: "#67e8f9",
	dots: "#2a2a33"
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
