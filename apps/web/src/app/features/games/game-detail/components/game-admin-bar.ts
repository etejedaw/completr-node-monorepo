import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiButton } from "../../../../shared/ui";

export interface AdminActionsState {
	confirmDeactivate: boolean;
	confirmDelete: boolean;
	editor: boolean;
	deactivating: boolean;
	deleting: boolean;
}

@Component({
	selector: "app-game-admin-bar",
	imports: [UiButton],
	template: `
		<div
			class="flex items-center gap-2 py-2 px-3 bg-danger/[0.05] border border-danger/[0.15] rounded-card flex-wrap"
		>
			<span
				class="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-danger uppercase tracking-[0.14em] mr-auto"
			>
				<span aria-hidden="true" class="material-icons text-base"
					>admin_panel_settings</span
				>
				{{ isAdmin() ? "Admin" : "Moderator" }}
			</span>
			<button
				uiButton
				variant="secondary"
				size="sm"
				(click)="stateChanged.emit({ editor: !state().editor })"
			>
				<span aria-hidden="true" class="material-icons text-sm">{{
					state().editor ? "close" : "edit"
				}}</span>
				{{ state().editor ? "Close editor" : "Edit game" }}
			</button>
			@if (isAdmin()) {
				@if (state().confirmDeactivate) {
					<span class="text-[0.8125rem] text-danger"
						>Deactivate this game?</span
					>
					<button
						uiButton
						variant="danger"
						size="sm"
						[disabled]="state().deactivating"
						(click)="deactivateConfirmed.emit()"
					>
						{{ state().deactivating ? "Deactivating..." : "Yes" }}
					</button>
					<button
						uiButton
						variant="ghost"
						size="sm"
						(click)="
							stateChanged.emit({ confirmDeactivate: false })
						"
					>
						Cancel
					</button>
				} @else if (state().confirmDelete) {
					<span class="text-[0.8125rem] text-danger"
						>Permanently delete this game?</span
					>
					<button
						uiButton
						variant="danger"
						size="sm"
						[disabled]="state().deleting"
						(click)="deleteConfirmed.emit()"
					>
						{{ state().deleting ? "Deleting..." : "Yes, delete" }}
					</button>
					<button
						uiButton
						variant="ghost"
						size="sm"
						(click)="stateChanged.emit({ confirmDelete: false })"
					>
						Cancel
					</button>
				} @else {
					<button
						uiButton
						variant="danger"
						size="sm"
						(click)="stateChanged.emit({ confirmDeactivate: true })"
					>
						<span aria-hidden="true" class="material-icons text-sm"
							>visibility_off</span
						>
						Deactivate
					</button>
					<button
						uiButton
						variant="danger"
						size="sm"
						(click)="stateChanged.emit({ confirmDelete: true })"
					>
						<span aria-hidden="true" class="material-icons text-sm"
							>delete_forever</span
						>
						Delete
					</button>
				}
			}
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameAdminBar {
	readonly isAdmin = input(false);
	readonly state = input.required<AdminActionsState>();

	readonly stateChanged = output<Partial<AdminActionsState>>();
	readonly deactivateConfirmed = output<void>();
	readonly deleteConfirmed = output<void>();
}
