import { inject } from "@angular/core";
import { CanMatchFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const guestMatch: CanMatchFn = () => !inject(AuthService).token();
