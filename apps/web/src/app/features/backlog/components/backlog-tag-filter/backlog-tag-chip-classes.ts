const CHIP_BASE_CLASS =
	"inline-flex items-center gap-1.5 min-h-[32px] tap:min-h-[44px] pl-1 pr-3 rounded-full border text-xs font-semibold font-sans cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-safe:transition motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";

const CHIP_IDLE_CLASS =
	"border-line bg-surface text-fg hover:border-brand/50 hover:bg-surface-hover hover:shadow-[0_4px_14px_-8px_var(--color-brand-glow)]";

const CHIP_SELECTED_CLASS =
	"border-transparent text-white bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_70%,var(--color-canvas)),color-mix(in_srgb,var(--color-brand-deep)_85%,var(--color-canvas)))] shadow-[0_6px_18px_-6px_var(--color-brand-glow)] hover:shadow-[0_8px_22px_-6px_var(--color-brand-glow)]";

const ICON_BASE_CLASS =
	"inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0";

const ICON_IDLE_CLASS = "bg-brand-subtle text-brand";

const ICON_SELECTED_CLASS = "bg-canvas/25 text-white";

const COUNT_IDLE_CLASS = "tabular-nums font-medium text-fg-muted";

const COUNT_SELECTED_CLASS = "tabular-nums font-medium text-white";

export function tagChipClass(selected: boolean): string {
	return `${CHIP_BASE_CLASS} ${selected ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS}`;
}

export function tagChipIconClass(selected: boolean): string {
	return `${ICON_BASE_CLASS} ${selected ? ICON_SELECTED_CLASS : ICON_IDLE_CLASS}`;
}

export function tagChipCountClass(selected: boolean): string {
	return selected ? COUNT_SELECTED_CLASS : COUNT_IDLE_CLASS;
}
