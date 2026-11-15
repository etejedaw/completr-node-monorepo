import { NgTemplateOutlet } from "@angular/common";
import { type HttpErrorResponse } from "@angular/common/http";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	linkedSignal,
	signal,
	untracked
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, Subject, type Subscription } from "rxjs";

import { ToastService } from "../../../../core/services/toast";
import { LibraryToolbar } from "../../../../shared/components/library-toolbar/library-toolbar";
import { OptionPicker } from "../../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../../shared/components/option-picker/option-picker.model";
import { PageSearch } from "../../../../shared/components/page-search/page-search";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiFieldError,
	UiIconButton,
	UiInput,
	UiNoMatches,
	UiPagination,
	UiSkeleton,
	UiTable
} from "../../../../shared/ui";
import { validationSummary } from "../../../../shared/utils/validation-errors";
import {
	type AdminRewind,
	type AdminRewindAccessKind
} from "../../services/rewind-admin.model";
import { RewindAdminService } from "../../services/rewind-admin.service";
import { regenerationsError, utcDateTimeLabel } from "../admin-rewind-editions";
import {
	type AccessKindBadge,
	type RegenerationsDraft
} from "./admin-rewind-table.model";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

const ACCESS_KIND_BADGES: Record<AdminRewindAccessKind, AccessKindBadge> = {
	none: { label: "No AI", tone: "neutral", icon: "remove" },
	gift: { label: "Gift", tone: "info", icon: "redeem" },
	premium: { label: "Premium", tone: "premium", icon: "workspace_premium" }
};

@Component({
	selector: "app-admin-rewind-table",
	imports: [
		LibraryToolbar,
		NgTemplateOutlet,
		OptionPicker,
		PageSearch,
		UiAlert,
		UiBadge,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiFieldError,
		UiIconButton,
		UiInput,
		UiNoMatches,
		UiPagination,
		UiSkeleton,
		UiTable
	],
	templateUrl: "./admin-rewind-table.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRewindTable {
	readonly years = input.required<readonly number[]>();
	readonly defaultYear = input<number | null>(null);

	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRows = [1, 2, 3, 4, 5];
	protected readonly year = linkedSignal<number | null>(
		() => this.defaultYear() ?? this.years()[0] ?? null
	);
	protected readonly query = signal("");
	protected readonly search = signal("");
	protected readonly offset = signal(0);
	protected readonly rewinds = signal<AdminRewind[]>([]);
	protected readonly total = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly pageError = signal("");
	protected readonly draft = signal<RegenerationsDraft | null>(null);
	protected readonly savingId = signal<string | null>(null);

	protected readonly yearOptions = computed<PickerOption[]>(() =>
		[...this.years()]
			.sort((a, b) => b - a)
			.map(year => ({
				value: String(year),
				label: String(year),
				icon: "history"
			}))
	);

	protected readonly draftError = computed(() => {
		const draft = this.draft();
		if (!draft) return null;
		return draft.serverError ?? regenerationsError(draft.value);
	});

	private readonly rewindAdminService = inject(RewindAdminService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly searchChanges = new Subject<string>();
	private listSubscription?: Subscription;

	constructor() {
		this.searchChanges
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
			.subscribe(search => this.applySearch(search));
		effect(() => {
			const year = this.year();
			untracked(() => {
				this.offset.set(0);
				this.cancelEdit();
				if (year !== null) this.load();
				else this.isLoading.set(false);
			});
		});
		this.destroyRef.onDestroy(() => this.listSubscription?.unsubscribe());
	}

	protected accessBadge(kind: AdminRewindAccessKind) {
		return ACCESS_KIND_BADGES[kind] ?? ACCESS_KIND_BADGES.none;
	}

	protected frozenLabel(rewind: AdminRewind) {
		return rewind.frozenAt ? utcDateTimeLabel(rewind.frozenAt) : "Live";
	}

	protected graceLabel(rewind: AdminRewind) {
		return rewind.graceUsed ? "Used" : "Not used";
	}

	protected setYear(value: string) {
		const year = Number(value);
		if (!Number.isInteger(year) || year === this.year()) return;
		this.year.set(year);
	}

	protected onSearch(value: string) {
		this.query.set(value);
		this.searchChanges.next(value.trim());
	}

	protected clearSearch() {
		this.query.set("");
		this.searchChanges.next("");
		this.applySearch("");
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.cancelEdit();
		this.load();
	}

	protected reload() {
		this.load();
	}

	protected startEdit(rewind: AdminRewind) {
		if (this.savingId()) return;
		this.draft.set({
			id: rewind.id,
			value: String(rewind.regenerationsLeft),
			touched: false,
			serverError: null
		});
		afterNextRender(() => this.focusEditor(), { injector: this.injector });
	}

	protected isEditing(rewind: AdminRewind) {
		return this.draft()?.id === rewind.id;
	}

	protected updateDraft(value: string) {
		this.draft.update(draft =>
			draft ? { ...draft, value, serverError: null } : draft
		);
	}

	protected cancelEdit() {
		if (this.savingId()) return;
		this.draft.set(null);
	}

	protected handleEditorKeydown(event: KeyboardEvent, rewind: AdminRewind) {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			this.cancelEdit();
		} else if (event.key === "Enter") {
			event.preventDefault();
			this.saveEdit(rewind);
		}
	}

	protected saveEdit(rewind: AdminRewind) {
		const draft = this.draft();
		if (!draft || draft.id !== rewind.id || this.savingId()) return;
		if (regenerationsError(draft.value)) {
			this.draft.set({ ...draft, touched: true });
			return;
		}
		const regenerationsLeft = Number(draft.value.trim());
		if (regenerationsLeft === rewind.regenerationsLeft) {
			this.draft.set(null);
			return;
		}
		this.savingId.set(rewind.id);
		this.rewindAdminService
			.updateRegenerationsLeft(rewind.id, regenerationsLeft)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: updated => {
					this.savingId.set(null);
					this.draft.set(null);
					this.rewinds.update(list =>
						list.map(item =>
							item.id === updated.id ? updated : item
						)
					);
					this.toast.success(
						`${updated.user.username} now has ${updated.regenerationsLeft} AI ${updated.regenerationsLeft === 1 ? "generation" : "generations"} left.`
					);
				},
				error: (failure: HttpErrorResponse) => {
					this.savingId.set(null);
					this.handleSaveError(failure, rewind);
				}
			});
	}

	private focusEditor() {
		const editors =
			this.host.nativeElement.querySelectorAll<HTMLInputElement>(
				"[data-regenerations-editor]"
			);
		const visible = [...editors].find(
			editor => editor.offsetParent !== null
		);
		(visible ?? editors[0])?.focus();
	}

	private handleSaveError(failure: HttpErrorResponse, rewind: AdminRewind) {
		if (failure.status === 404) {
			this.draft.set(null);
			this.pageError.set(
				`The Rewind of ${rewind.user.username} no longer exists.`
			);
			this.load();
			return;
		}
		const message =
			validationSummary(failure) ??
			(failure.status === 0
				? "You seem to be offline. Try again."
				: "Could not save. Try again.");
		this.draft.update(draft =>
			draft?.id === rewind.id
				? { ...draft, touched: true, serverError: message }
				: draft
		);
	}

	private applySearch(search: string) {
		if (search === this.search()) return;
		this.search.set(search);
		this.offset.set(0);
		this.cancelEdit();
		this.load();
	}

	private load() {
		const year = this.year();
		if (year === null) return;
		this.listSubscription?.unsubscribe();
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.listSubscription = this.rewindAdminService
			.listRewinds({
				year,
				search: this.search() || undefined,
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: page => {
					this.rewinds.set(page.rewinds);
					this.total.set(page.total);
					this.isLoading.set(false);
				},
				error: () => {
					this.loadFailed.set(true);
					this.isLoading.set(false);
				}
			});
	}
}
