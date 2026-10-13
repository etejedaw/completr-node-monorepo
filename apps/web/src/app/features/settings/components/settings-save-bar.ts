import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiButton } from "../../../shared/ui";

@Component({
	selector: "app-settings-save-bar",
	imports: [UiButton],
	template: `
		@if (visible()) {
			<div
				role="region"
				aria-label="Unsaved changes"
				class="sticky z-30 mt-6 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+0.5rem)] md:bottom-6 flex items-center gap-2 p-2 pl-4 rounded-card bg-sidebar/95 backdrop-blur-xl border border-line shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.8)] motion-safe:animate-[uiFadeUp_200ms_ease-out]"
			>
				<span
					aria-hidden="true"
					class="material-icons text-lg"
					[class]="invalid() ? 'text-danger' : 'text-warning'"
					>{{ invalid() ? "error_outline" : "edit_note" }}</span
				>
				<p
					class="m-0 flex-1 min-w-0 text-sm text-fg truncate"
					aria-live="polite"
				>
					{{
						invalid()
							? "Fix the highlighted fields"
							: "Unsaved changes"
					}}
				</p>
				<button
					uiButton
					variant="ghost"
					size="sm"
					[disabled]="saving()"
					(click)="discarded.emit()"
				>
					Discard
				</button>
				<button
					uiButton
					variant="primary"
					size="sm"
					[disabled]="saving() || invalid()"
					(click)="saved.emit()"
				>
					{{ saving() ? "Saving…" : "Save changes" }}
				</button>
			</div>
		}
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsSaveBar {
	readonly visible = input(false);
	readonly saving = input(false);
	readonly invalid = input(false);

	readonly discarded = output<void>();
	readonly saved = output<void>();
}
