import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";
import { adminGuard } from "./core/guards/admin.guard";

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
		path: "",
		canActivate: [authGuard],
		loadComponent: () => import("./layout/layout").then(m => m.Layout),
		children: [
			{ path: "", redirectTo: "backlog", pathMatch: "full" },
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
				loadComponent: () =>
					import("./features/profile/profile-view/profile-view").then(
						m => m.ProfileView
					)
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
				canActivate: [adminGuard],
				loadComponent: () =>
					import("./features/admin/admin-games/admin-games").then(
						m => m.AdminGames
					)
			},
			{
				path: "admin/reports",
				canActivate: [adminGuard],
				loadComponent: () =>
					import("./features/admin/admin-reports/admin-reports").then(
						m => m.AdminReports
					)
			}
		]
	},
	{ path: "**", redirectTo: "" }
];
