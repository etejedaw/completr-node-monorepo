import {
	type GiftOfferCopy,
	type GiftOfferFeature
} from "./gift-offer-card.model";

export const GIFT_OFFER_COPY: Record<GiftOfferFeature, GiftOfferCopy> = {
	"*": {
		title: "Premium, on us",
		shortTitle: "Premium",
		description:
			"Every Premium feature on your account: no caps on your collections, JSON export, Premium themes and the full Rewind."
	},
	"lists.unlimited": {
		title: "Unlimited lists, on us",
		shortTitle: "Unlimited lists",
		description: "Create as many lists as you like, with no free-plan cap."
	},
	"saved-filters.unlimited": {
		title: "Unlimited saved filters, on us",
		shortTitle: "Unlimited saved filters",
		description: "Save every filter combination you come back to."
	},
	"favorites.unlimited": {
		title: "Unlimited favorites, on us",
		shortTitle: "Unlimited favorites",
		description: "Mark as many games as favorites as you like."
	},
	"wishlist.unlimited": {
		title: "Unlimited Want to Get, on us",
		shortTitle: "Unlimited Want to Get",
		description: "Add every game you want to get, with no cap."
	},
	"queue.unlimited": {
		title: "Unlimited Up Next, on us",
		shortTitle: "Unlimited Up Next",
		description: "Queue as many games as you like."
	},
	"game-shelf.unlimited": {
		title: "Unlimited shelf, on us",
		shortTitle: "Unlimited shelf",
		description: "Add every game you own to your shelf."
	},
	"mood-tags.unlimited": {
		title: "Unlimited mood tags, on us",
		shortTitle: "Unlimited mood tags",
		description: "Tag your games with as many moods as you like."
	},
	"activity.feed-filters": {
		title: "Feed filters, on us",
		shortTitle: "Feed filters",
		description: "Filter your activity feed by type and by people."
	},
	"themes.premium": {
		title: "Premium themes, on us",
		shortTitle: "Premium themes",
		description: "Dress Completr in any of the Premium themes."
	},
	"export.json": {
		title: "JSON export, on us",
		shortTitle: "JSON export",
		description:
			"Download a complete, portable copy of your collections as JSON."
	},
	"rewind.premium": {
		title: "Premium Rewind, on us",
		shortTitle: "Premium Rewind",
		description:
			"Add the AI recap and Premium charts to your Rewind, with private runs and your notes."
	}
};
