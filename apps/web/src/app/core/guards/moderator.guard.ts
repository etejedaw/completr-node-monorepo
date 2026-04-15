import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const moderatorGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);
	const user = auth.user();
	if (user && (user.role === "moderator" || user.role === "admin"))
		return true;
	return router.createUrlTree(["/"]);
};
