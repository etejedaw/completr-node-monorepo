export function canAnimateRewind(win: Window | null): boolean {
	if (!win?.matchMedia) return false;
	if (typeof IntersectionObserver === "undefined") return false;
	return !win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
