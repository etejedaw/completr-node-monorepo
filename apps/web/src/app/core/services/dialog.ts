import { inject, Injectable, type Type } from "@angular/core";
import {
	type NgpDialogConfig,
	NgpDialogManager,
	type NgpDialogRef
} from "ng-primitives/dialog";

@Injectable({ providedIn: "root" })
export class DialogService {
	private readonly manager = inject(NgpDialogManager);

	open<T = unknown, R = unknown>(
		component: Type<unknown>,
		config: NgpDialogConfig<T> = {}
	): NgpDialogRef<T, R> {
		return this.manager.open(component, {
			modal: true,
			closeOnNavigation: true,
			...config
		}) as NgpDialogRef<T, R>;
	}

	closeAll(): void {
		this.manager.closeAll();
	}
}
