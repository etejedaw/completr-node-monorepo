import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { map } from "rxjs";
import { AuthService } from "../services/auth.service";

export const adminGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	const user = auth.user();
	if (user) {
		return user.role === "admin" || router.createUrlTree(["/403"]);
	}

	if (!auth.token()) return router.createUrlTree(["/403"]);

	return auth
		.loadUser()
		.pipe(
			map(() =>
				auth.user()?.role === "admin"
					? true
					: router.createUrlTree(["/403"])
			)
		);
};
