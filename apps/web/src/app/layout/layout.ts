import { Component, computed, inject, OnInit, signal } from "@angular/core";
import {
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	Router,
	NavigationEnd
} from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { filter } from "rxjs";

@Component({
	selector: "app-layout",
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: "./layout.html",
	styleUrl: "./layout.css"
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	protected readonly user = this.auth.user;
	protected readonly isAdmin = computed(() => this.user()?.role === "admin");
	protected readonly sidebarOpen = signal(false);

	ngOnInit() {
		if (!this.user()) {
			this.auth.loadUser().subscribe();
		}

		this.router.events
			.pipe(filter(e => e instanceof NavigationEnd))
			.subscribe(() => this.sidebarOpen.set(false));
	}

	toggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	logout() {
		this.auth.logout();
	}
}
