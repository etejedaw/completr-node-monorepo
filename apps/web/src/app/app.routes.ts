import { inject } from "@angular/core";
import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";
import { guestMatch } from "./core/guards/guest.match";
import { selfProfileRedirect } from "./core/guards/self-profile-redirect.guard";
import { adminGuard } from "./core/guards/admin.guard";
import { moderatorGuard } from "./core/guards/moderator.guard";
import { AuthService } from "./core/services/auth.service";

const publicProfileRoutes: Routes = [
	{
		path: "user/:username",
		loadComponent: () =>
			import("./features/public-profile/public-profile").then(
				m => m.PublicProfileComponent
			)
	},
	{
		path: "user/:username/backlog",
		loadComponent: () =>
			import("./features/public-profile/user-backlog/user-backlog").then(
				m => m.UserBacklog
			)
	},
	{
		path: "user/:username/favorites",
		loadComponent: () =>
			import("./features/public-profile/user-favorites/user-favorites").then(
				m => m.UserFavorites
			)
	},
	{
		path: "user/:username/queue",
		loadComponent: () =>
			import("./features/public-profile/user-queue/user-queue").then(
				m => m.UserQueue
			)
	},
	{
		path: "user/:username/wishlist",
		loadComponent: () =>
			import("./features/public-profile/user-wishlist/user-wishlist").then(
				m => m.UserWishlist
			)
	},
	{
		path: "user/:username/game-shelf",
		loadComponent: () =>
			import("./features/public-profile/user-game-shelf/user-game-shelf").then(
				m => m.UserGameShelf
			)
	},
	{
		path: "user/:username/reviews",
		loadComponent: () =>
			import("./features/public-profile/user-reviews/user-reviews").then(
				m => m.UserReviews
			)
	}
];

export const routes: Routes = [
	{
		path: "login",
		canActivate: [guestGuard],
		loadComponent: () =>
			import("./features/auth/login/login").then(m => m.Login)
	},
	{
		path: "register",
		canActivate: [guestGuard],
		loadComponent: () =>
			import("./features/auth/register/register").then(m => m.Register)
	},
	{
		path: "user/:username/lists/:id",
		redirectTo: ({ params }) =>
			`/lists/${params["id"]}?from=${params["username"]}`
	},
	{
		path: "",
		pathMatch: "full",
		redirectTo: () => (inject(AuthService).token() ? "/feed" : "/login")
	},
	{
		path: "",
		canMatch: [guestMatch],
		loadComponent: () =>
			import("./layout/guest-shell/guest-shell").then(m => m.GuestShell),
		children: publicProfileRoutes
	},
	{
		path: "",
		canActivate: [authGuard],
		loadComponent: () => import("./layout/layout").then(m => m.Layout),
		children: [
			{ path: "", redirectTo: "feed", pathMatch: "full" },
			...publicProfileRoutes,
			{
				path: "feed",
				loadComponent: () =>
					import("./features/feed/feed-page").then(m => m.FeedPage)
			},
			{
				path: "backlog",
				loadComponent: () =>
					import("./features/backlog/backlog-list/backlog-list").then(
						m => m.BacklogList
					)
			},
			{
				path: "saved-views",
				loadComponent: () =>
					import("./features/backlog/saved-filters-view/saved-filters-view").then(
						m => m.SavedFiltersView
					)
			},
			{
				path: "games",
				loadComponent: () =>
					import("./features/games/games-browse/games-browse").then(
						m => m.GamesBrowse
					)
			},
			{
				path: "users",
				loadComponent: () =>
					import("./features/users-discover/users-discover").then(
						m => m.UsersDiscover
					)
			},
			{
				path: "help",
				loadComponent: () =>
					import("./features/help/help-page").then(m => m.HelpPage)
			},
			{
				path: "about",
				loadComponent: () =>
					import("./features/about/about-page").then(m => m.AboutPage)
			},
			{
				path: "whats-new",
				loadComponent: () =>
					import("./features/whats-new/whats-new-page").then(
						m => m.WhatsNewPage
					)
			},
			{
				path: "genres/:code",
				loadComponent: () =>
					import("./features/games/genre-detail/genre-detail").then(
						m => m.GenreDetail
					)
			},
			{
				path: "games/:code",
				loadComponent: () =>
					import("./features/games/game-detail/game-detail").then(
						m => m.GameDetail
					)
			},
			{
				path: "game-shelf",
				loadComponent: () =>
					import("./features/game-shelf/game-shelf-list/game-shelf-list").then(
						m => m.GameShelfList
					)
			},
			{
				path: "lists",
				loadComponent: () =>
					import("./features/lists/list-overview/list-overview").then(
						m => m.ListOverview
					)
			},
			{
				path: "lists/:id",
				loadComponent: () =>
					import("./features/lists/list-detail/list-detail").then(
						m => m.ListDetail
					)
			},
			{
				path: "queue",
				loadComponent: () =>
					import("./features/queue/queue-view/queue-view").then(
						m => m.QueueView
					)
			},
			{
				path: "wishlist",
				loadComponent: () =>
					import("./features/wishlist/wishlist-view/wishlist-view").then(
						m => m.WishlistView
					)
			},
			{
				path: "favorites",
				loadComponent: () =>
					import("./features/favorites/favorites-view/favorites-view").then(
						m => m.FavoritesView
					)
			},
			{
				path: "profile",
				canActivate: [selfProfileRedirect],
				children: []
			},
			{
				path: "settings",
				loadComponent: () =>
					import("./features/settings/settings-shell/settings-shell").then(
						m => m.SettingsShell
					),
				children: [
					{ path: "", redirectTo: "profile", pathMatch: "full" },
					{
						path: "profile",
						loadComponent: () =>
							import(
								"./features/settings/settings-profile/settings-profile"
							).then(m => m.SettingsProfile)
					},
					{
						path: "privacy",
						loadComponent: () =>
							import(
								"./features/settings/settings-privacy/settings-privacy"
							).then(m => m.SettingsPrivacy)
					},
					{
						path: "appearance",
						loadComponent: () =>
							import(
								"./features/settings/settings-appearance/settings-appearance"
							).then(m => m.SettingsAppearance)
					},
					{
						path: "security",
						loadComponent: () =>
							import(
								"./features/settings/settings-security/settings-security"
							).then(m => m.SettingsSecurity)
					}
				]
			},
			{
				path: "admin/users",
				canActivate: [adminGuard],
				loadComponent: () =>
					import("./features/admin/admin-users/admin-users").then(
						m => m.AdminUsers
					)
			},
			{
				path: "admin/games",
				canActivate: [moderatorGuard],
				loadComponent: () =>
					import("./features/admin/admin-games/admin-games").then(
						m => m.AdminGames
					)
			},
			{
				path: "admin/reports",
				canActivate: [moderatorGuard],
				loadComponent: () =>
					import("./features/admin/admin-reports/admin-reports").then(
						m => m.AdminReports
					)
			},
			{
				path: "admin/audit",
				canActivate: [adminGuard],
				loadComponent: () =>
					import("./features/admin/admin-audit/admin-audit").then(
						m => m.AdminAudit
					)
			},
			{
				path: "admin/jobs",
				canActivate: [adminGuard],
				loadComponent: () =>
					import("./features/admin/admin-jobs/admin-jobs").then(
						m => m.AdminJobs
					)
			},
			{
				path: "403",
				loadComponent: () =>
					import("./features/error-pages/forbidden").then(
						m => m.Forbidden
					)
			},
			{
				path: "404",
				loadComponent: () =>
					import("./features/error-pages/not-found").then(
						m => m.NotFound
					)
			}
		]
	},
	{
		path: "**",
		loadComponent: () =>
			import("./features/error-pages/not-found").then(m => m.NotFound)
	}
];
