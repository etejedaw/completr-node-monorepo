import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal
} from "@angular/core";

export type EntryAnnotationKind = "note" | "review";

interface AnnotationTab {
	kind: EntryAnnotationKind;
	label: string;
}

const ANNOTATION_TABS: readonly AnnotationTab[] = [
	{ kind: "note", label: "Note" },
	{ kind: "review", label: "Review" }
];

@Component({
	selector: "app-entry-annotation",
	template: `
		@if (availableTabs().length > 0) {
			<div
				class="flex items-center gap-3 min-w-0 border-l-2 border-line-hover pl-3"
			>
				<div
					role="tablist"
					aria-label="Your note and review"
					class="flex items-center gap-2.5 shrink-0"
				>
					@for (tab of availableTabs(); track tab.kind) {
						<button
							type="button"
							role="tab"
							class="relative bg-transparent border-0 p-0 text-[0.625rem] font-semibold uppercase tracking-[0.14em] leading-none transition after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
							[class]="tabClasses(tab.kind)"
							[attr.aria-selected]="selected() === tab.kind"
							[disabled]="!hasBoth()"
							(click)="select(tab.kind, $event)"
						>
							{{ tab.label }}
						</button>
					}
				</div>
				<p
					role="tabpanel"
					class="m-0 min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-secondary truncate"
					[title]="selectedText()"
					[class.italic]="selected() === 'review'"
				>
					{{ selectedText() }}
				</p>
			</div>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryAnnotation {
	readonly note = input<string | null | undefined>(null);
	readonly review = input<string | null | undefined>(null);

	protected readonly availableTabs = computed(() =>
		ANNOTATION_TABS.filter(tab => this.textFor(tab.kind))
	);

	protected readonly hasBoth = computed(
		() => this.availableTabs().length > 1
	);

	protected readonly selected = linkedSignal<EntryAnnotationKind>(() =>
		this.note() ? "note" : "review"
	);

	protected readonly selectedText = computed(() =>
		this.textFor(this.selected())
	);

	protected select(kind: EntryAnnotationKind, event: Event) {
		event.stopPropagation();
		this.selected.set(kind);
	}

	protected tabClasses(kind: EntryAnnotationKind): string {
		if (!this.hasBoth()) return "text-fg-muted cursor-default";
		if (this.selected() === kind) return "text-brand cursor-pointer";
		return "text-fg-muted hover:text-fg cursor-pointer";
	}

	private textFor(kind: EntryAnnotationKind): string | null | undefined {
		return kind === "note" ? this.note() : this.review();
	}
}
