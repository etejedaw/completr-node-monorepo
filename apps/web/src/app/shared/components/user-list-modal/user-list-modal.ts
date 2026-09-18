import { ChangeDetectionStrategy, Component } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import {
	injectDialogRef,
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle
} from "ng-primitives/dialog";
import { type Observable } from "rxjs";

import { UiAvatar, UiIconButton } from "../../ui";

export interface UserSummary {
	id: string;
	username: string;
	name: string;
	avatarUrl?: string;
}

export interface UserListModalData {
	title: string;
	users$: Observable<UserSummary[]>;
}

@Component({
	selector: "app-user-list-modal",
	imports: [
		RouterLink,
		NgpDialog,
		NgpDialogOverlay,
		NgpDialogTitle,
		UiAvatar,
		UiIconButton
	],
	templateUrl: "./user-list-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListModal {
	private readonly dialogRef = injectDialogRef<UserListModalData>();
	protected readonly title = this.dialogRef.data.title;
	protected readonly users = toSignal(this.dialogRef.data.users$, {
		initialValue: [] as UserSummary[]
	});

	protected close() {
		this.dialogRef.close();
	}
}
