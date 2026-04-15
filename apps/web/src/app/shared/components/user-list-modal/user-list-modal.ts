import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

export interface UserSummary {
	id: string;
	username: string;
	name: string;
	avatarUrl?: string;
}

@Component({
	selector: "app-user-list-modal",
	imports: [RouterLink],
	templateUrl: "./user-list-modal.html",
	styleUrl: "./user-list-modal.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListModal {
	title = input.required<string>();
	users = input.required<UserSummary[]>();
	closed = output();
}
