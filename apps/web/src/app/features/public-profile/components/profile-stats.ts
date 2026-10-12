import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogStats } from "../public-profile.service";

interface LibrarySegment {
	status: keyof Omit<BacklogStats, "total">;
	label: string;
	count: number;
	percent: number;
	barClass: string;
	dotClass: string;
}

const SEGMENT_STYLES: Omit<LibrarySegment, "count" | "percent">[] = [
	{
		status: "completed",
		label: "Completed",
		barClass: "bg-success",
		dotClass: "bg-success"
	},
	{
		status: "playing",
		label: "Playing",
		barClass: "bg-warning",
		dotClass: "bg-warning"
	},
	{
		status: "not_started",
		label: "To play",
		barClass: "bg-fg-muted/50",
		dotClass: "bg-fg-muted/50"
	},
	{
		status: "abandoned",
		label: "Dropped",
		barClass: "bg-danger",
		dotClass: "bg-danger"
	}
];

@Component({
	selector: "app-profile-stats",
	imports: [RouterLink],
	templateUrl: "./profile-stats.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileStats {
	readonly username = input.required<string>();
	readonly stats = input.required<BacklogStats>();
	readonly listsTotal = input(0);
	readonly reviewsTotal = input(0);
	readonly showLibrary = input(true);

	readonly listsOpened = output<void>();

	protected readonly completionRate = computed(() => {
		const { completed, abandoned } = this.stats();
		const finished = completed + abandoned;
		return finished > 0 ? Math.round((completed / finished) * 100) : null;
	});

	protected readonly segments = computed<LibrarySegment[]>(() => {
		const stats = this.stats();
		const total = Math.max(stats.total, 1);
		return SEGMENT_STYLES.map(style => ({
			...style,
			count: stats[style.status],
			percent: Math.round((stats[style.status] / total) * 100)
		})).filter(segment => segment.count > 0);
	});
}
