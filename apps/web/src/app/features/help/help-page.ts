import {
	ChangeDetectionStrategy,
	Component,
	computed,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-help-page",
	standalone: true,
	imports: [RouterLink],
	templateUrl: "./help-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage {
	protected readonly steps = [
		"backlog",
		"ratio",
		"scores",
		"statuses",
		"modules",
		"saved-views",
		"privacy"
	] as const;

	protected readonly step = signal(0);
	protected readonly total = this.steps.length;
	protected readonly current = computed(() => this.steps[this.step()]);
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
