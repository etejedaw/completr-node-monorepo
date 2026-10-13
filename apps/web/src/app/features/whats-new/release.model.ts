export type ReleaseTint = "brand" | "purple" | "warning" | "success" | "danger";

export interface ReleaseHighlight {
	icon: string;
	tint: ReleaseTint;
	text: string;
}

export interface ReleaseEntry {
	date: string;
	tag: string;
	title: string;
	icon: string;
	tint: ReleaseTint;
	highlights: ReleaseHighlight[];
}

export interface ChangelogResponse {
	releases: ReleaseEntry[];
}

export interface ReleaseView extends ReleaseEntry {
	anchor: string;
}

const TINT_CLASSES: Record<ReleaseTint, string> = {
	brand: "bg-brand-subtle text-brand",
	purple: "bg-nav-saved-views/15 text-nav-saved-views",
	warning: "bg-warning/15 text-warning",
	success: "bg-success/15 text-success",
	danger: "bg-danger/15 text-danger"
};

const TINT_TEXT_CLASSES: Record<ReleaseTint, string> = {
	brand: "text-brand",
	purple: "text-nav-saved-views",
	warning: "text-warning",
	success: "text-success",
	danger: "text-danger"
};

export function releaseTintTextClass(tint: ReleaseTint): string {
	return TINT_TEXT_CLASSES[tint] ?? TINT_TEXT_CLASSES.brand;
}

export function releaseTintClass(tint: ReleaseTint): string {
	return TINT_CLASSES[tint] ?? TINT_CLASSES.brand;
}

export function toReleaseViews(releases: ReleaseEntry[]): ReleaseView[] {
	const seenPerDate = new Map<string, number>();
	return releases.map(release => {
		const index = (seenPerDate.get(release.date) ?? 0) + 1;
		seenPerDate.set(release.date, index);
		return { ...release, anchor: `release-${release.date}-${index}` };
	});
}
