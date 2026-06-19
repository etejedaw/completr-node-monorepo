import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { OnboardingService } from "../../core/services/onboarding.service";

@Component({
	selector: "app-help-page",
	standalone: true,
	imports: [RouterLink],
	templateUrl: "./help-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage {
	protected readonly onboarding = inject(OnboardingService);

	openTour() {
		this.onboarding.open();
	}

	protected readonly steps = [
		{
			key: "backlog",
			label: "My Games",
			hint: "How runs work",
			icon: "list_alt"
		},
		{
			key: "ratio",
			label: "Ratio",
			hint: "Score over time",
			icon: "trending_up"
		},
		{
			key: "scores",
			label: "Scores",
			hint: "Where ratings come from",
			icon: "star_rate"
		},
		{
			key: "statuses",
			label: "Statuses",
			hint: "From not started to endless",
			icon: "fact_check"
		},
		{
			key: "modules",
			label: "Modules",
			hint: "Library vs Discover",
			icon: "dashboard"
		},
		{
			key: "saved-views",
			label: "Saved Views",
			hint: "Reusable filters",
			icon: "bookmark"
		},
		{
			key: "privacy",
			label: "Privacy",
			hint: "What others can see",
			icon: "lock"
		}
	] as const;

	protected readonly step = signal(0);
	protected readonly total = this.steps.length;
	protected readonly current = computed(() => this.steps[this.step()].key);
	protected readonly canPrev = computed(() => this.step() > 0);
	protected readonly canNext = computed(() => this.step() < this.total - 1);
	protected readonly progress = computed(
		() => ((this.step() + 1) / this.total) * 100
	);

	prev() {
		if (this.canPrev()) this.step.set(this.step() - 1);
	}

	next() {
		if (this.canNext()) this.step.set(this.step() + 1);
	}

	goTo(index: number) {
		this.step.set(index);
	}
}
