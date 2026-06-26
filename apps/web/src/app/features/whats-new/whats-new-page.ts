import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	OnInit,
	computed,
	inject,
	signal
} from "@angular/core";
import { UiPagination } from "../../shared/ui";
import { environment } from "../../../environments/environment";

type Tint = "brand" | "purple" | "warning" | "success" | "danger";

interface Highlight {
	icon: string;
	tint: Tint;
	text: string;
}

interface ReleaseEntry {
	date: string;
	tag: string;
	title: string;
	icon: string;
	tint: Tint;
	highlights: Highlight[];
}

interface ChangelogResponse {
	releases: ReleaseEntry[];
}

const PAGE_SIZE = 5;

@Component({
	selector: "app-whats-new-page",
	imports: [UiPagination],
	template: `
		<div class="max-w-3xl mx-auto">
			<div class="mb-6 flex items-start gap-4">
				<span
					class="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0"
					style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep)); box-shadow: 0 10px 24px -8px var(--color-brand-glow);"
				>
					<span class="material-icons text-[1.5rem]">campaign</span>
				</span>
				<div>
					<h1
						class="font-display m-0 text-2xl md:text-3xl font-bold tracking-tight"
					>
						What's new
					</h1>
					<p class="text-fg-muted mt-1 text-sm leading-snug">
						Recent updates and improvements to Completr
					</p>
				</div>
			</div>

			@if (isLoading()) {
				<div class="text-center py-12 text-fg-muted text-sm">
					Loading...
				</div>
			} @else if (error()) {
				<div class="text-center py-12 text-fg-muted text-sm">
					Couldn't load the changelog right now. Please try again
					later.
				</div>
			} @else {
				<div class="flex flex-col gap-4">
					@for (
						entry of pageEntries();
						track entry.date + entry.title
					) {
						<article
							class="bg-sidebar border border-line rounded-card overflow-hidden"
						>
							<header
								class="flex items-start gap-3 p-5 border-b border-line"
							>
								<span
									class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
									[class]="iconBgClass(entry.tint)"
								>
									<span
										class="material-icons text-[1.25rem]"
										>{{ entry.icon }}</span
									>
								</span>
								<div class="flex-1 min-w-0">
									<div
										class="flex items-center gap-2 mb-1 flex-wrap"
									>
										<span
											class="inline-block px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider"
											[class]="tagClass(entry.tint)"
											>{{ entry.tag }}</span
										>
										<span
											class="text-[0.6875rem] text-fg-muted"
											>{{ entry.date }}</span
										>
									</div>
									<h2
										class="font-display m-0 text-base font-semibold text-fg leading-tight"
									>
										{{ entry.title }}
									</h2>
								</div>
							</header>
							<ul class="m-0 list-none p-5 flex flex-col gap-3">
								@for (
									item of entry.highlights;
									track item.text
								) {
									<li class="flex items-start gap-2.5">
										<span
											class="flex items-center justify-center w-6 h-6 rounded-md shrink-0 mt-0.5"
											[class]="iconBgClass(item.tint)"
										>
											<span
												class="material-icons text-[0.875rem]"
												>{{ item.icon }}</span
											>
										</span>
										<span
											class="text-[0.8125rem] text-fg-secondary leading-relaxed"
											>{{ item.text }}</span
										>
									</li>
								}
							</ul>
						</article>
					}
				</div>

				@if (releases().length > pageSize) {
					<div class="mt-6">
						<ui-pagination
							[offset]="offset()"
							[limit]="pageSize"
							[total]="releases().length"
							(offsetChange)="onOffsetChange($event)"
						/>
					</div>
				}

				<p class="text-center text-xs text-fg-muted mt-8 mb-0">
					Found a bug or have a suggestion?
					<a
						href="mailto:completr@etejeda.dev"
						class="text-brand no-underline hover:underline"
						>Tell us</a
					>.
				</p>
			}
		</div>
	`,
	host: { class: "block p-6" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPage implements OnInit {
	private readonly cdr = inject(ChangeDetectorRef);

	protected readonly pageSize = PAGE_SIZE;
	protected readonly offset = signal(0);
	protected readonly releases = signal<ReleaseEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly error = signal(false);

	protected readonly pageEntries = computed(() =>
		this.releases().slice(this.offset(), this.offset() + this.pageSize)
	);

	async ngOnInit() {
		try {
			const res = await fetch(`${environment.apiUrl}/changelog`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as ChangelogResponse;
			this.releases.set(body.releases);
		} catch {
			this.error.set(true);
		} finally {
			this.isLoading.set(false);
			this.cdr.markForCheck();
		}
	}

	protected onOffsetChange(offset: number) {
		this.offset.set(offset);
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	protected iconBgClass(tint: Tint): string {
		switch (tint) {
			case "brand":
				return "bg-brand-subtle text-brand";
			case "purple":
				return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
			case "warning":
				return "bg-warning/15 text-warning";
			case "success":
				return "bg-success/15 text-success";
			case "danger":
				return "bg-danger/15 text-danger";
		}
	}

	protected tagClass(tint: Tint): string {
		switch (tint) {
			case "brand":
				return "bg-brand-subtle text-brand";
			case "purple":
				return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
			case "warning":
				return "bg-warning/15 text-warning";
			case "success":
				return "bg-success/15 text-success";
			case "danger":
				return "bg-danger/15 text-danger";
		}
	}
}
