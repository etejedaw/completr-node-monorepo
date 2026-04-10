import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-profile-view",
	template: "<p>Profile works!</p>",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileView {}
