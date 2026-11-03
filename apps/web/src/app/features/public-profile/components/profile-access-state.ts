import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton, UiPlainEmptyState } from "../../../shared/ui";

export type ProfileAccessError = "not_found" | "private";

@Component({
	selector: "app-profile-access-state",
	imports: [RouterLink, UiButton, UiPlainEmptyState],
	template: `
		@if (reason() === "not_found") {
			<ui-plain-empty-state
				icon="person_search"
				title="Player not found"
				[message]="notFoundMessage()"
				[headingLevel]="1"
			>
				<a uiButton variant="secondary" routerLink="/users"
					>Find players</a
				>
			</ui-plain-empty-state>
		} @else {
			<ui-plain-empty-state
				icon="lock"
				[title]="privateTitle()"
				[message]="privateMessage()"
				[headingLevel]="1"
			>
				<a
					uiButton
					variant="secondary"
					[routerLink]="['/user', username()]"
					>Back to profile</a
				>
			</ui-plain-empty-state>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileAccessState {
	readonly reason = input.required<ProfileAccessError>();
	readonly username = input.required<string>();
	readonly privateTitle = input("This is private");

	protected readonly notFoundMessage = computed(
		() => `There's no one called "${this.username()}" on Completr.`
	);
	protected readonly privateMessage = computed(
		() => `@${this.username()} doesn't share this publicly.`
	);
}
