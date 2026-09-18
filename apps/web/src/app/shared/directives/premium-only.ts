import {
	Directive,
	effect,
	inject,
	TemplateRef,
	ViewContainerRef
} from "@angular/core";

import { AuthService } from "../../core/services/auth";

@Directive({
	selector: "[appPremiumOnly]"
})
export class PremiumOnly {
	private readonly template = inject(TemplateRef<unknown>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly auth = inject(AuthService);

	private rendered = false;

	constructor() {
		effect(() => {
			const premium = this.auth.isPremium();
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
