import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { AuthService } from "../services/auth";

export const authGuard: CanActivateFn = (_route, state) => {
	const auth = inject(AuthService);
	const router = inject(Router);
	if (auth.token()) return true;
	return router.createUrlTree(["/login"], {
		queryParams: { returnUrl: state.url }
	});
};
