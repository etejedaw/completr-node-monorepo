import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { UiButton } from "../../../shared/ui";
import { injectLibraryPosters } from "../../backlog/library-posters";
import { SettingsNav } from "../components/settings-nav";

@Component({
	selector: "app-settings-shell",
	imports: [
		RouterOutlet,
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		SettingsNav,
		UiButton
	],
	templateUrl: "./settings-shell.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsShell {
	private readonly authService = inject(AuthService);

	protected readonly user = this.authService.user;
	protected readonly heroPosters = injectLibraryPosters();
}
