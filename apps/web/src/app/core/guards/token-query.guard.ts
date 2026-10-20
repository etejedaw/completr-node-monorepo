import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

export const tokenQueryGuard: CanActivateFn = route =>
	route.queryParamMap.get("token")
		? true
		: inject(Router).createUrlTree(["/login"]);
