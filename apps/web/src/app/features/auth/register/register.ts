import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import {
	email,
	form,
	FormField,
	maxLength,
	minLength,
	required
} from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-register",
	imports: [FormField, RouterLink, UiButton, UiInput],
	templateUrl: "./register.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Register {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

	protected readonly model = signal({
		username: "",
		email: "",
		name: "",
		password: ""
	});

	readonly form = form(this.model, path => {
		required(path.username);
		minLength(path.username, 4);
		maxLength(path.username, 15);
		required(path.email);
		email(path.email);
		required(path.name);
		minLength(path.name, 4);
		maxLength(path.name, 80);
		required(path.password);
		minLength(path.password, 8);
		maxLength(path.password, 15);
	});

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) return;

		this.isLoading.set(true);
		this.error.set("");

		const { username, email, name, password } = this.form().value();
		this.auth.register({ username, email, name, password }).subscribe({
			next: () => {
				this.auth.loadUser().subscribe({
					next: () => this.router.navigate(["/backlog"]),
					error: () => this.router.navigate(["/backlog"])
				});
			},
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Registration failed");
			}
		});
	}
}
