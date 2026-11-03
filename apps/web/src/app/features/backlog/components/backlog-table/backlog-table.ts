import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output
} from "@angular/core";

import { type BacklogEntry, type BacklogStatus } from "../../../../core/models";
import { BacklogStatusBadge } from "../../../../shared/components/backlog-status-badge/backlog-status-badge";
import { BacklogStatusPicker } from "../../../../shared/components/backlog-status-picker/backlog-status-picker";
import { GameTitleCell } from "../../../../shared/components/game-title-cell/game-title-cell";
import { PlatinumTrophy } from "../../../../shared/components/platinum-trophy/platinum-trophy";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { FloatingXScrollbar } from "../../../../shared/directives/floating-x-scrollbar";
import {
	UiAvatar,
	UiBadge,
	UiIconButton,
	UiTable
} from "../../../../shared/ui";
import { isPlatinumRun } from "../../../../shared/utils/platinum";
import { FavoritesService } from "../../../favorites/favorites";
import {
	type BacklogTableColumn,
	type BacklogTableColumnAlign,
	type BacklogTableEntryEvent,
	type BacklogTableFavoriteToggle,
	type BacklogTableRating,
	type BacklogTableStatusChange
} from "./backlog-table.model";

const HEADER_BASE_CLASS = "select-none";
const SORTABLE_HEADER_CLASS = `focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand cursor-pointer ${HEADER_BASE_CLASS}`;
const MUTED_HEADER_CLASS = "hover:text-fg-secondary";

function sortableColumn(
	label: string,
	sortKey: string,
	align: BacklogTableColumnAlign,
	extra: { highlighted?: boolean; hint?: string; minWidth?: string } = {}
): BacklogTableColumn {
	const tone = extra.highlighted ? "" : MUTED_HEADER_CLASS;
	return {
		label,
		sortKey,
		align,
		highlighted: extra.highlighted,
		hint: extra.hint,
		headerClass:
			`${SORTABLE_HEADER_CLASS} ${tone} ${extra.minWidth ?? ""}`.trim()
	};
}

const BACKLOG_TABLE_COLUMNS: readonly BacklogTableColumn[] = [
	sortableColumn("Title", "title", "start", { minWidth: "min-w-[180px]" }),
	{
		label: "Platform",
		sortKey: null,
		align: "start",
		headerClass: `${HEADER_BASE_CLASS} ${MUTED_HEADER_CLASS}`
	},
	sortableColumn("Score", "score", "end"),
	sortableColumn("Duration", "duration", "end"),
	sortableColumn("Ratio", "ratio", "end", { highlighted: true }),
	sortableColumn("Real", "realDuration", "end"),
	sortableColumn("Your run", "personalRatio", "end", {
		hint: "Score per hour you actually played"
	}),
	sortableColumn("Rating", "userRating", "start"),
	sortableColumn("Finished", "finishedAt", "start"),
	sortableColumn("Status", "status", "start")
];

const PROGRESS_VISIBLE_STATUSES: ReadonlySet<BacklogStatus> = new Set([
	"playing",
	"endless",
	"not_started"
]);

const STATUS_CHANGEABLE_FROM: ReadonlySet<BacklogStatus> = new Set([
	"not_started",
	"playing",
	"endless"
]);

@Component({
	selector: "app-backlog-table",
	imports: [
		BacklogStatusBadge,
		BacklogStatusPicker,
		DatePipe,
		FloatingXScrollbar,
		GameTitleCell,
		PlatinumTrophy,
		StarRating,
		UiAvatar,
		UiBadge,
		UiIconButton,
		UiTable
	],
	templateUrl: "./backlog-table.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTable {
	private readonly favoritesService = inject(FavoritesService);

	readonly entries = input.required<readonly BacklogEntry[]>();
	readonly sortBy = input.required<string>();
	readonly sortOrder = input.required<"asc" | "desc">();
	readonly queuedBacklogIds = input<ReadonlySet<string>>(new Set());
	readonly updatingStatusIds = input<ReadonlySet<string>>(new Set());
	readonly readonly = input(false);

	readonly sortChange = output<string>();
	readonly entryOpen = output<BacklogTableEntryEvent>();
	readonly statusChange = output<BacklogTableStatusChange>();
	readonly quickRate = output<BacklogTableRating>();
	readonly favoriteToggle = output<BacklogTableFavoriteToggle>();
	readonly queueToggle = output<BacklogEntry>();

	protected readonly columns = BACKLOG_TABLE_COLUMNS;
	protected readonly isPlatinumRun = isPlatinumRun;

	protected ariaSortFor(column: string): "ascending" | "descending" | "none" {
		if (this.sortBy() !== column) return "none";
		return this.sortOrder() === "asc" ? "ascending" : "descending";
	}

	protected canChangeStatus(status: BacklogStatus): boolean {
		return STATUS_CHANGEABLE_FROM.has(status);
	}

	protected canQuickRate(entry: BacklogEntry): boolean {
		return entry.status !== "not_started" && entry.userRating == null;
	}

	protected showsProgress(entry: BacklogEntry): boolean {
		return (
			!!entry.latestProgress &&
			PROGRESS_VISIBLE_STATUSES.has(entry.status)
		);
	}

	protected isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	protected openEntry(entry: BacklogEntry, event: Event) {
		if (this.readonly()) return;
		this.entryOpen.emit({ entry, event });
	}

	protected isInQueue(entry: BacklogEntry): boolean {
		return this.queuedBacklogIds().has(entry.id);
	}
}
