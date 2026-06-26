import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { AuthService } from "../../../core/services/auth";
import {
	ThemeService,
	ThemeId,
	ThemeOption
} from "../../../core/services/theme";
import { ToastService } from "../../../core/services/toast";

@Component({
	selector: "app-settings-appearance",
	templateUrl: "./settings-appearance.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsAppearance implements OnInit {
	private readonly themeService = inject(ThemeService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);

	protected readonly catalog = this.themeService.catalog;
	protected readonly current = signal<ThemeId>(this.themeService.currentId());
	protected readonly saving = signal<ThemeId | null>(null);
	protected readonly user = this.authService.user;

	protected readonly isPremium = computed(() => {
		const role = this.user()?.role;
		return role === "premium" || role === "moderator" || role === "admin";
	});

	ngOnInit() {
		this.authService.loadUser().subscribe(res => {
			const theme = res.data.user.theme;
			if (theme && theme !== this.current()) {
				this.themeService.setLocal(theme as ThemeId);
				this.current.set(theme as ThemeId);
			}
		});
	}

	canUse(theme: ThemeOption): boolean {
		return theme.tier === "free" || this.isPremium();
	}

	select(theme: ThemeOption) {
		if (!this.canUse(theme)) return;
		if (this.current() === theme.id) return;
		if (this.saving()) return;

		const previous = this.current();
		this.current.set(theme.id);
		this.saving.set(theme.id);

		if (!this.authService.isLoggedIn()) {
			this.themeService.setLocal(theme.id);
			this.saving.set(null);
			return;
		}

		this.themeService.persist(theme.id).subscribe({
			next: () => {
				this.saving.set(null);
				this.toast.success(`${theme.name} applied.`);
				this.authService.loadUser().subscribe();
			},
			error: err => {
				this.saving.set(null);
				this.current.set(previous);
				this.themeService.setLocal(previous);
				if (err.status === 403) {
					this.toast.warning(
						"That theme requires a premium account."
					);
				} else {
					this.toast.warning("Could not save theme.");
				}
			}
		});
	}
}
