export type RewindTone =
	| "brand"
	| "success"
	| "danger"
	| "playing"
	| "platinum"
	| "queue"
	| "shelf"
	| "tags"
	| "lists"
	| "sagas";

const TONE_TOKEN: Record<RewindTone, string> = {
	brand: "--color-brand",
	success: "--color-success",
	danger: "--color-danger",
	playing: "--color-playing",
	platinum: "--color-platinum",
	queue: "--color-nav-queue",
	shelf: "--color-nav-shelf",
	tags: "--color-nav-tags",
	lists: "--color-nav-lists",
	sagas: "--color-nav-sagas"
};

const YEAR_TONES: RewindTone[] = [
	"brand",
	"queue",
	"shelf",
	"lists",
	"sagas",
	"tags"
];

export function toneVar(tone: RewindTone): string {
	return `var(${TONE_TOKEN[tone]})`;
}

export function yearTone(year: number): RewindTone {
	return YEAR_TONES[Math.abs(year) % YEAR_TONES.length];
}

export const TONE_TINT_SECONDARY_CLASS =
	"text-[color-mix(in_oklab,var(--color-fg)_80%,var(--tone))]";
export const TONE_ACCENT_CARD_CLASS =
	"relative isolate overflow-hidden rounded-card border border-line-hover bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-fg)_4%,var(--color-surface)),var(--color-surface)_65%)] text-fg after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-[linear-gradient(90deg,var(--tone),transparent_85%)]";
export const TONE_ACCENT_TEXT_CLASS =
	"text-[color-mix(in_oklab,var(--tone)_80%,var(--color-fg))]";
export const TONE_ACCENT_CAPSULE_CLASS = `bg-[color-mix(in_oklab,var(--tone)_16%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--tone)_30%,transparent)] ${TONE_ACCENT_TEXT_CLASS}`;
export const REWIND_YEAR_FILL_CLASS =
	"bg-linear-to-r from-brand via-nav-queue to-nav-shelf bg-clip-text text-transparent";
export const REWIND_PREMIUM_FRAME_CLASS =
	"relative isolate flex flex-col overflow-hidden rounded-card border border-premium/45 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-premium)_10%,var(--color-surface)),var(--color-surface)_45%)] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-premium)_30%,transparent)]";
