import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-privacy",
	imports: [RouterLink],
	template: `
		<div class="min-h-screen bg-canvas">
			<main class="max-w-2xl mx-auto px-6 py-16 md:py-24">
				<a
					routerLink="/"
					class="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-brand no-underline mb-10"
				>
					← Back to Completr
				</a>

				<h1
					class="font-display m-0 mb-3 text-3xl md:text-4xl font-bold tracking-tight"
				>
					Privacy Policy
				</h1>
				<p class="m-0 mb-10 text-sm text-fg-muted">
					Last updated: June 28, 2026
				</p>

				<div
					class="flex flex-col gap-8 text-fg-secondary leading-relaxed"
				>
					<section class="flex flex-col gap-3">
						<p class="m-0">
							Completr is a personal project built and operated by
							<strong class="text-fg">Esteban Tejeda</strong>, who
							acts as the data controller for the data described
							here. This policy covers the Completr application
							(<span class="text-fg">web.completr.app</span>).
						</p>
						<p class="m-0">
							The idea is simple: I collect the minimum needed for
							the app to work, I never sell or share your data, and
							you can delete it whenever you want.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							What data I collect
						</h2>
						<p class="m-0">
							<strong class="text-fg">Your account.</strong> When
							you sign up I store your email, an encrypted version
							of your password (never plain text), your username
							and, optionally, a display name, bio and avatar.
						</p>
						<p class="m-0">
							<strong class="text-fg">Content you create.</strong>
							What you track inside the app: your game backlog,
							lists, reviews, tags, progress notes and co-op runs.
							It's the whole point of the service.
						</p>
						<p class="m-0">
							<strong class="text-fg">Technical data.</strong>
							Aggregate usage analytics via Umami (see below) and
							server logs, kept for a limited time for security and
							troubleshooting.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							What I use it for
						</h2>
						<ul class="m-0 list-disc pl-5 flex flex-col gap-2">
							<li>Run the service and show you your own content.</li>
							<li>
								Authenticate you and keep your session secure.
							</li>
							<li>
								Understand in aggregate how the app is used, to
								improve it.
							</li>
							<li>Contact you about your account.</li>
						</ul>
						<p class="m-0">
							What I <strong class="text-fg">don't</strong> do: I
							don't sell or share your data with third parties, I
							don't run ads, I don't sign you up to newsletters, and
							I don't track you across sites.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Legal basis
						</h2>
						<p class="m-0">
							I process your account data and your content to
							provide the service you request when you sign up
							(performance of a contract). Aggregate analytics and
							security logs rely on my legitimate interest in
							keeping and improving the app.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Cookies and analytics
						</h2>
						<p class="m-0">
							To understand how the app is used I use
							<strong class="text-fg">Umami</strong>, a self-hosted
							analytics tool that measures visits in an aggregate,
							anonymous way. It uses no cookies, doesn't track
							across sites and doesn't collect personally
							identifiable information.
						</p>
						<p class="m-0">
							The app uses a single strictly necessary cookie to
							keep you signed in (an
							<span class="text-fg">HttpOnly</span> session token).
							It's not a tracking cookie and can't be disabled
							without breaking sign-in, so you won't see cookie
							consent banners.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Who it's shared with
						</h2>
						<p class="m-0">
							No one, for commercial purposes. The infrastructure
							is self-hosted: both the database and the analytics
							run on servers I manage directly. Video game data
							comes from external catalogs (such as RAWG), but
							that's information I <em>receive</em>; I never send
							your personal data to those services.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							How long I keep it
						</h2>
						<p class="m-0">
							I keep your account and your content for as long as
							your account is active. If you delete your account, I
							delete your personal data and your content. Server
							logs are removed after a limited period, and Umami
							analytics are aggregate and anonymous.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Your rights
						</h2>
						<p class="m-0">
							You can exercise your rights of access,
							rectification, erasure, objection and portability over
							your personal data at any time, as recognized by
							Chile's Law 21.719 and, if you're in the European
							Union, by the GDPR.
						</p>
						<ul class="m-0 list-disc pl-5 flex flex-col gap-2">
							<li>
								You can edit your data and delete your account
								directly from the app.
							</li>
							<li>
								For any other request, email me at
								<a
									href="mailto:completr@etejeda.dev"
									class="text-brand hover:underline"
									>completr&#64;etejeda.dev</a
								>.
							</li>
						</ul>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Security
						</h2>
						<p class="m-0">
							Passwords are stored encrypted, sessions use
							<span class="text-fg">HttpOnly</span> cookies and all
							traffic runs over HTTPS. No system is foolproof, but I
							treat your data with the same care I'd want for my
							own.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Minors
						</h2>
						<p class="m-0">
							Completr is not directed at children under 14 (or
							under 16 in the European Union). If you believe a
							minor has provided me with data, email me and I'll
							delete it.
						</p>
					</section>

					<section class="flex flex-col gap-3">
						<h2
							class="font-display m-0 text-xl font-semibold text-fg"
						>
							Changes and contact
						</h2>
						<p class="m-0">
							This policy may change as Completr evolves. Any change
							will be reflected on this page, along with the last
							updated date. If you have questions about how I handle
							your data, email me at
							<a
								href="mailto:completr@etejeda.dev"
								class="text-brand hover:underline"
								>completr&#64;etejeda.dev</a
							>.
						</p>
					</section>
				</div>
			</main>
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Privacy {}
