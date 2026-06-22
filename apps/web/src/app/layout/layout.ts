import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import {
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	Router,
	NavigationEnd
} from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { filter } from "rxjs";
import { UiAvatar, UiIconButton, UiSeparator } from "../shared/ui";
import { ToastContainer } from "../shared/components/toast-container/toast-container";
import { OnboardingTour } from "../shared/components/onboarding-tour/onboarding-tour";
import { OnboardingService } from "../core/services/onboarding.service";

@Component({
	selector: "app-layout",
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		UiIconButton,
		UiSeparator,
		UiAvatar,
		ToastContainer,
		OnboardingTour
	],
	templateUrl: "./layout.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	protected readonly onboarding = inject(OnboardingService);

	protected readonly user = this.auth.user;
	protected readonly isAdmin = computed(() => this.user()?.role === "admin");
	protected readonly isModerator = computed(() => {
		const role = this.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly sidebarOpen = signal(false);

	protected readonly roleBadge = computed(() => {
		const map: Record<string, string> = {
			admin: "Admin",
			moderator: "Mod",
			premium: "Premium",
			user: "Free"
		};
		return map[this.user()?.role ?? "user"] ?? "Free";
	});

	protected readonly roleBadgeClass = computed(() => {
		const role = this.user()?.role;
		if (role === "admin") return "bg-danger/15 text-danger";
		if (role === "moderator") return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
		if (role === "premium") return "bg-warning/15 text-warning";
		return "bg-[rgba(148,163,184,0.15)] text-fg-muted";
	});

	ngOnInit() {
		if (!this.user()) {
			this.auth.loadUser().subscribe({
				next: () => this.maybeStartOnboarding(),
				error: () => {}
			});
		} else {
			this.maybeStartOnboarding();
		}

		this.router.events
			.pipe(filter(e => e instanceof NavigationEnd))
			.subscribe(() => {
				this.sidebarOpen.set(false);
			});
	}

	private maybeStartOnboarding() {
		if (!this.user()) return;
		this.onboarding.maybeStartForFirstTime();
	}

	dismissOnboarding(persist: boolean) {
		this.onboarding.dismiss(persist);
	}

	goToHelp() {
		this.onboarding.dismiss(true);
		this.router.navigate(["/help"]);
	}

	toggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	logout() {
		this.auth.logout();
	}
}
