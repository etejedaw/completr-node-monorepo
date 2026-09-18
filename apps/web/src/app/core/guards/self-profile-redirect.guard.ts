import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { map } from "rxjs";

import { AuthService } from "../services/auth";

export const selfProfileRedirect: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	const username = auth.user()?.username;
	if (username) return router.createUrlTree(["/user", username]);

	return auth
		.loadUser()
		.pipe(
			map(res => router.createUrlTree(["/user", res.data.user.username]))
		);
};
