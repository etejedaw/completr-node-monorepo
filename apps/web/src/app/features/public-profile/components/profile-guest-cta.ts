import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { BETA_SIGNUP_URL } from "../../../shared/constants/beta-signup";
import { UiButton } from "../../../shared/ui";

@Component({
	selector: "app-profile-guest-cta",
	imports: [RouterLink, UiButton],
	templateUrl: "./profile-guest-cta.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileGuestCta {
	readonly ownerName = input.required<string>();

	protected readonly betaSignupUrl = BETA_SIGNUP_URL;
}
