import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-not-found",
	imports: [RouterLink],
	template: `
		<div class="error-page">
			<span class="error-code">404</span>
			<h1>Page not found</h1>
			<p>The page you're looking for doesn't exist or has been moved.</p>
			<a routerLink="/" class="btn-back">Go to Feed</a>
		</div>
	`,
	styles: `
		.error-page {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 60vh;
			text-align: center;
			padding: 2rem;
		}
		.error-code {
			font-size: 4rem;
			font-weight: 800;
			color: var(--accent);
			line-height: 1;
			margin-bottom: 0.5rem;
		}
		h1 {
			margin: 0 0 0.5rem;
			font-size: 1.5rem;
			font-weight: 700;
		}
		p {
			color: var(--text-muted);
			font-size: 0.875rem;
			margin: 0 0 1.5rem;
		}
		.btn-back {
			padding: 0.5rem 1.25rem;
			background: linear-gradient(135deg, var(--accent), var(--accent-deep));
			color: #fff;
			border-radius: var(--radius);
			font-size: 0.875rem;
			font-weight: 600;
			text-decoration: none;
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFound {}
