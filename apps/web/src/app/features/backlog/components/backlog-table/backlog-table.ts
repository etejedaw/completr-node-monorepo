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
	type BacklogTableEntryEvent,
	type BacklogTableFavoriteToggle,
	type BacklogTableRating,
	type BacklogTableStatusChange
} from "./backlog-table.model";

const HEADER_BASE_CLASS = "select-none";
const SORTABLE_HEADER_CLASS = `focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand cursor-pointer ${HEADER_BASE_CLASS}`;
const MUTED_HEADER_CLASS = "hover:text-fg-secondary";
const HIGHLIGHTED_HEADER_CLASS =
	"!text-brand !font-bold hover:!text-brand-deep";
const ALIGN_CLASSES = { left: "", right: "!text-right" } as const;

function sortableColumn(
	label: string,
	sortKey: string,
	align: keyof typeof ALIGN_CLASSES,
	extra: { highlighted?: boolean; hint?: string; minWidth?: string } = {}
): BacklogTableColumn {
	const tone = extra.highlighted
		? HIGHLIGHTED_HEADER_CLASS
		: MUTED_HEADER_CLASS;
	return {
		label,
		sortKey,
		hint: extra.hint,
		headerClass:
			`${SORTABLE_HEADER_CLASS} ${ALIGN_CLASSES[align]} ${tone} ${extra.minWidth ?? ""}`.trim()
	};
}

const BACKLOG_TABLE_COLUMNS: readonly BacklogTableColumn[] = [
	sortableColumn("Title", "title", "left", { minWidth: "min-w-[180px]" }),
	{
		label: "Platform",
		sortKey: null,
		headerClass: `${HEADER_BASE_CLASS} ${ALIGN_CLASSES.left} ${MUTED_HEADER_CLASS}`
	},
	sortableColumn("Score", "score", "right"),
	sortableColumn("Duration", "duration", "right"),
	sortableColumn("Ratio", "ratio", "right", { highlighted: true }),
	sortableColumn("Real", "realDuration", "right"),
	sortableColumn("Your run", "personalRatio", "right", {
		hint: "Score per hour you actually played"
	}),
	sortableColumn("Rating", "userRating", "left"),
	sortableColumn("Finished", "finishedAt", "left"),
	sortableColumn("Status", "status", "left")
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
