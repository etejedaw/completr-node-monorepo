import { inject, Injectable, type Type } from "@angular/core";
import {
	type NgpDialogConfig,
	NgpDialogManager,
	type NgpDialogRef
} from "ng-primitives/dialog";

@Injectable({ providedIn: "root" })
export class DialogService {
	private readonly manager = inject(NgpDialogManager);
	private readonly openDialogs = new Map<Type<unknown>, object>();

	open<T = unknown, R = unknown>(
		component: Type<unknown>,
		config: NgpDialogConfig<T> = {}
	): NgpDialogRef<T, R> {
		const alreadyOpen = this.openDialogs.get(component);
		if (alreadyOpen) return alreadyOpen as NgpDialogRef<T, R>;

		const ref = this.manager.open(component, {
			modal: true,
			closeOnEscape: false,
			closeOnNavigation: true,
			...config
		}) as NgpDialogRef<T, R>;
		this.openDialogs.set(component, ref);
		ref.afterClosed.subscribe({
			next: () => this.forget(component, ref),
			complete: () => this.forget(component, ref)
		});
		return ref;
	}

	closeAll(): void {
		this.manager.closeAll();
	}

	private forget(component: Type<unknown>, ref: object) {
		if (this.openDialogs.get(component) === ref) {
			this.openDialogs.delete(component);
		}
	}
}
