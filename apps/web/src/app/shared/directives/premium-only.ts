import {
	Directive,
	effect,
	inject,
	input,
	TemplateRef,
	ViewContainerRef
} from "@angular/core";

import { type PremiumFeature } from "../../core/models";
import { AuthService } from "../../core/services/auth";

@Directive({
	selector: "[appPremiumOnly]"
})
export class PremiumOnly {
	private readonly template = inject(TemplateRef<unknown>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly auth = inject(AuthService);

	readonly feature = input<PremiumFeature | "">("", {
		alias: "appPremiumOnly"
	});

	private rendered = false;

	constructor() {
		effect(() => {
			const feature = this.feature();
			const premium = feature
				? this.auth.hasPremiumFeature(feature)
				: this.auth.isPremium();
			if (premium && !this.rendered) {
				this.viewContainer.createEmbeddedView(this.template);
				this.rendered = true;
			} else if (!premium && this.rendered) {
				this.viewContainer.clear();
				this.rendered = false;
			}
		});
	}
}
