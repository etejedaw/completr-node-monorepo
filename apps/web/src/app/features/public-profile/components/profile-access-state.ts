import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton } from "../../../shared/ui";

export type ProfileAccessError = "not_found" | "private";

@Component({
	selector: "app-profile-access-state",
	imports: [RouterLink, UiButton],
	template: `
		@if (reason() === "not_found") {
			<section class="flex flex-col items-center text-center py-24 px-6">
				<span
					aria-hidden="true"
					class="material-icons text-5xl text-fg-muted mb-3"
					>person_search</span
				>
				<h1 class="m-0 font-display text-2xl font-bold">
					Player not found
				</h1>
				<p class="m-0 mt-2 mb-6 text-sm text-fg-muted">
					There's no one called "{{ username() }}" on Completr.
				</p>
				<a uiButton variant="secondary" routerLink="/users"
					>Find players</a
				>
			</section>
		} @else {
			<section class="flex flex-col items-center text-center py-24 px-6">
				<span
					aria-hidden="true"
					class="material-icons text-5xl text-fg-muted mb-3"
					>lock</span
				>
				<h1 class="m-0 font-display text-2xl font-bold">
					{{ privateTitle() }}
				</h1>
				<p class="m-0 mt-2 mb-6 text-sm text-fg-muted">
					{{ "@" + username() }} doesn't share this publicly.
				</p>
				<a
					uiButton
					variant="secondary"
					[routerLink]="['/user', username()]"
					>Back to profile</a
				>
			</section>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileAccessState {
	readonly reason = input.required<ProfileAccessError>();
	readonly username = input.required<string>();
	readonly privateTitle = input("This is private");
}
