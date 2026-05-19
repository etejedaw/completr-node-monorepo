import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
	selector: "app-settings-shell",
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: "./settings-shell.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsShell {}
