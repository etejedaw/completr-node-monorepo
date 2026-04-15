import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { map } from "rxjs";
import { AuthService } from "../services/auth.service";

function isMod(role?: string) {
	return role === "moderator" || role === "admin";
}

export const moderatorGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	const user = auth.user();
	if (user) {
		return isMod(user.role) || router.createUrlTree(["/403"]);
	}

	if (!auth.token()) return router.createUrlTree(["/403"]);

	return auth
		.loadUser()
		.pipe(
			map(() =>
				isMod(auth.user()?.role) ? true : router.createUrlTree(["/403"])
			)
		);
};
