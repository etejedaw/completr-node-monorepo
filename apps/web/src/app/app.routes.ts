import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

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
			}
		]
	},
	{ path: "**", redirectTo: "" }
];
