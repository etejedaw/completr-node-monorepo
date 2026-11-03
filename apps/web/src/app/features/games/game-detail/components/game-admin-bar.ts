import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { ActionMenu } from "../../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../../shared/components/action-menu/action-menu.model";
import { UiBadge, UiButton, UiDialog } from "../../../../shared/ui";
import {
	type AdminActionsState,
	type GameAdminAction
} from "./game-admin-bar.model";

@Component({
	selector: "app-game-admin-bar",
	imports: [ActionMenu, UiBadge, UiButton, UiDialog],
	template: `
		<div
			class="flex items-center gap-2 py-2 pl-3 pr-2 bg-surface/60 border border-line rounded-card"
		>
			<ui-badge tone="admin" icon="admin_panel_settings" class="mr-auto">
				{{ isAdmin() ? "Admin" : "Moderator" }}
			</ui-badge>
			<button
				uiButton
				variant="secondary"
				type="button"
				class="h-11 !rounded-card"
				[attr.aria-expanded]="state().editor"
				(click)="stateChanged.emit({ editor: !state().editor })"
			>
				<span aria-hidden="true" class="material-icons text-base">{{
					state().editor ? "close" : "edit"
				}}</span>
				{{ state().editor ? "Close editor" : "Edit game" }}
			</button>
			@if (isAdmin()) {
				<app-action-menu
					label="More admin actions"
					heading="Admin actions"
					icon="more_vert"
					size="lg"
					[iconOnly]="true"
					[busy]="busy()"
					[items]="menuItems()"
					(selected)="requestAction($event)"
				/>
			}
		</div>

		@if (isAdmin() && state().confirmDeactivate) {
			<ui-dialog
				size="sm"
				eyebrow="Admin"
				[heading]="'Deactivate ' + gameTitle() + '?'"
				[dismissible]="!state().deactivating"
				(closed)="cancel('deactivate')"
			>
				<p class="m-0 text-sm text-fg-secondary text-pretty">
					It is hidden from the catalog and keeps all its data. You
					can reactivate it from Admin → Games.
				</p>
				<ng-container dialogFooter>
					<button
						uiButton
						variant="ghost"
						type="button"
						[disabled]="state().deactivating"
						(click)="cancel('deactivate')"
					>
						Cancel
					</button>
					<button
						uiButton
						variant="danger"
						type="button"
						[disabled]="state().deactivating"
						(click)="confirm('deactivate')"
					>
						{{
							state().deactivating
								? "Deactivating..."
								: "Deactivate"
						}}
					</button>
				</ng-container>
			</ui-dialog>
		} @else if (isAdmin() && state().confirmDelete) {
			<ui-dialog
				size="sm"
				eyebrow="Admin"
				[heading]="'Permanently delete ' + gameTitle() + '?'"
				[dismissible]="!state().deleting"
				(closed)="cancel('delete')"
			>
				<p class="m-0 text-sm text-fg-secondary text-pretty">
					This can't be undone. Games with user data, variants or DLC
					can't be deleted: deactivate them instead.
				</p>
				<ng-container dialogFooter>
					<button
						uiButton
						variant="ghost"
						type="button"
						[disabled]="state().deleting"
						(click)="cancel('delete')"
					>
						Cancel
					</button>
					<button
						uiButton
						variant="danger"
						type="button"
						[disabled]="state().deleting"
						(click)="confirm('delete')"
					>
						{{
							state().deleting ? "Deleting..." : "Delete forever"
						}}
					</button>
				</ng-container>
			</ui-dialog>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameAdminBar {
	readonly isAdmin = input(false);
	readonly gameTitle = input("this game");
	readonly state = input.required<AdminActionsState>();

	readonly stateChanged = output<Partial<AdminActionsState>>();
	readonly deactivateConfirmed = output<void>();
	readonly deleteConfirmed = output<void>();

	protected readonly busy = computed(
		() => this.state().deactivating || this.state().deleting
	);

	protected readonly menuItems = computed<ActionMenuItem[]>(() => {
		const { deactivating, deleting } = this.state();
		return [
			{
				id: "deactivate",
				label: "Deactivate",
				icon: "visibility_off",
				hint: "Hide it from the catalog, keeping its data",
				busy: deactivating,
				disabled: deleting
			},
			{
				id: "delete",
				label: "Delete",
				icon: "delete_forever",
				iconClass: "text-danger",
				hint: "Remove it for good",
				separated: true,
				busy: deleting,
				disabled: deactivating
			}
		];
	});

	protected requestAction(id: string) {
		if (this.busy()) return;
		if (id === "deactivate")
			this.stateChanged.emit({
				confirmDeactivate: true,
				confirmDelete: false
			});
		if (id === "delete")
			this.stateChanged.emit({
				confirmDelete: true,
				confirmDeactivate: false
			});
	}

	protected cancel(action: GameAdminAction) {
		if (action === "deactivate") {
			if (this.state().deactivating) return;
			this.stateChanged.emit({ confirmDeactivate: false });
			return;
		}
		if (this.state().deleting) return;
		this.stateChanged.emit({ confirmDelete: false });
	}

	protected confirm(action: GameAdminAction) {
		if (this.busy()) return;
		if (action === "deactivate") this.deactivateConfirmed.emit();
		else this.deleteConfirmed.emit();
	}
}
