import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	contentChild,
	input,
	output
} from "@angular/core";

import { UiEmptyState, UiNoMatches, UiPagination, UiSkeleton } from "../../ui";
import { CoverGrid } from "../cover-grid/cover-grid";
import { LibraryToolbar } from "../library-toolbar/library-toolbar";
import {
	LibraryPageContent,
	LibraryPageEmptyAction,
	LibraryPageToolbar
} from "./library-page-slots";

export type LibraryPageState = "loading" | "empty" | "no-matches" | "ready";
export type LibraryPageSkeleton = "posters" | "cards";

@Component({
	selector: "app-library-page",
	imports: [
		NgTemplateOutlet,
		CoverGrid,
		LibraryToolbar,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSkeleton
	],
	templateUrl: "./library-page.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibraryPage {
	readonly state = input.required<LibraryPageState>();
	readonly showToolbar = input(true);
	readonly liveAnnouncement = input<string | null>(null);
	readonly skeleton = input<LibraryPageSkeleton>("posters");
	readonly loadingLabel = input.required<string>();
	readonly noMatchesHint = input.required<string>();
	readonly noMatchesClearLabel = input("Clear search");
	readonly emptyIcon = input.required<string>();
	readonly emptyTitle = input.required<string>();
	readonly emptyHint = input("");
	readonly showPagination = input(true);
	readonly offset = input(0);
	readonly limit = input.required<number>();
	readonly total = input(0);

	readonly cleared = output();
	readonly offsetChange = output<number>();

	protected readonly toolbarSlot = contentChild(LibraryPageToolbar);
	protected readonly emptyActionSlot = contentChild(LibraryPageEmptyAction);
	protected readonly contentSlot = contentChild.required(LibraryPageContent);

	protected readonly paginationVisible = computed(
		() => this.state() !== "loading" && this.showPagination()
	);

	protected readonly cardSkeletonRange = [0, 1, 2, 3];
}
