import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	inputBinding,
	output,
	outputBinding,
	untracked,
	ViewContainerRef
} from "@angular/core";

import { type Rewind } from "../../../../core/models/rewind.model";
import { resolveRewindDesign } from "../../rewind-designs";

@Component({
	selector: "app-rewind-design",
	template: "",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindDesignOutlet {
	readonly rewind = input.required<Rewind>();
	readonly username = input.required<string>();
	readonly isOwner = input(false);
	readonly rewindChange = output<Rewind>();

	private readonly viewContainer = inject(ViewContainerRef);

	protected readonly design = computed(() =>
		resolveRewindDesign(this.rewind().design)
	);

	constructor() {
		effect(onCleanup => {
			const { component } = this.design();
			const designRef = untracked(() =>
				this.viewContainer.createComponent(component, {
					bindings: [
						inputBinding("rewind", this.rewind),
						inputBinding("username", this.username),
						inputBinding("isOwner", this.isOwner),
						outputBinding<Rewind>("rewindChange", rewind =>
							this.rewindChange.emit(rewind)
						)
					]
				})
			);
			onCleanup(() => designRef.destroy());
		});
	}
}
