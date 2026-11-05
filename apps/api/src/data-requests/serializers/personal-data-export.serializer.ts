import { type Activity } from "../../activity/activity.model";
import { type RefreshToken } from "../../auth/refresh-token.model";
import { type Backlog } from "../../backlog/backlog.model";
import { type List } from "../../lists/list.model";
import { type PremiumGrant } from "../../premium-access/premium-grant.model";
import { type Rewind } from "../../rewind/rewind.model";
import { type User } from "../../users/user.model";
import {
	type PersonalDataBundle,
	type PersonalDataGameReference
} from "../data-requests.interface";
import {
	PERSONAL_DATA_EXPORT_CONTROLLER,
	PERSONAL_DATA_EXPORT_FORMAT_VERSION,
	PERSONAL_DATA_EXPORT_LEGAL_BASES,
	PERSONAL_DATA_EXPORT_PURPOSES,
	PERSONAL_DATA_EXPORT_RECIPIENTS,
	PERSONAL_DATA_EXPORT_RETENTION,
	PERSONAL_DATA_EXPORT_SOURCE
} from "../personal-data-export.constants";
import { dataRequestSerializer } from "./data-request.serializer";

function gameReference(
	game: { id: string; title: string; code: string } | null | undefined
): PersonalDataGameReference | null {
	if (!game) return null;
	return { id: game.id, title: game.title, slug: game.code };
}

function platformName(platform: { name: string } | null | undefined) {
	return platform?.name ?? null;
}

function groupBy<Item>(items: Item[], keyOf: (item: Item) => string) {
	const groups = new Map<string, Item[]>();
	for (const item of items) {
		const key = keyOf(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return groups;
}

function exportMeta(generatedAt: Date) {
	return {
		generatedAt,
		formatVersion: PERSONAL_DATA_EXPORT_FORMAT_VERSION,
		controller: PERSONAL_DATA_EXPORT_CONTROLLER,
		purposes: PERSONAL_DATA_EXPORT_PURPOSES,
		legalBases: PERSONAL_DATA_EXPORT_LEGAL_BASES,
		recipients: PERSONAL_DATA_EXPORT_RECIPIENTS,
		retention: PERSONAL_DATA_EXPORT_RETENTION,
		dataSource: PERSONAL_DATA_EXPORT_SOURCE
	};
}

function accountSection(user: User) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		name: user.name ?? null,
		bio: user.bio ?? null,
		avatarUrl: user.avatarUrl ?? null,
		role: user.role,
		theme: user.theme,
		isActive: user.isActive,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt
	};
}

function privacySection(user: User) {
	return {
		profileVisibility: user.profileVisibility,
		backlogVisibility: user.backlogVisibility,
		queueVisibility: user.queueVisibility,
		wishlistVisibility: user.wishlistVisibility,
		favoriteVisibility: user.favoriteVisibility,
		shelfVisibility: user.shelfVisibility,
		listVisibility: user.listVisibility,
		feedVisibility: user.feedVisibility,
		platinumVisibility: user.platinumVisibility,
		franchiseVisibility: user.franchiseVisibility,
		rewindVisibility: user.rewindVisibility,
		acceptFollowRequests: user.acceptFollowRequests
	};
}

function premiumGrantEntry(grant: PremiumGrant) {
	return {
		id: grant.id,
		feature: grant.feature,
		expiresAt: grant.expiresAt,
		offerCode: grant.offerCode,
		createdAt: grant.createdAt,
		updatedAt: grant.updatedAt
	};
}

function backlogSection(bundle: PersonalDataBundle) {
	const progressByBacklog = groupBy(
		bundle.backlogProgress,
		progress => progress.backlogId
	);
	return bundle.backlog.map((entry: Backlog) => ({
		id: entry.id,
		game: gameReference(entry.Game),
		compilationGame: gameReference(entry.CompilationGame),
		platform: platformName(entry.Platform),
		status: entry.status,
		startedAt: entry.startedAt ?? null,
		finishedAt: entry.finishedAt ?? null,
		realDuration: entry.realDuration ?? null,
		score: entry.score ?? null,
		duration: entry.duration ?? null,
		userRating: entry.userRating ?? null,
		isPublic: entry.isPublic,
		notes: entry.notes ?? null,
		progress: (progressByBacklog.get(entry.id) ?? []).map(progress => ({
			id: progress.id,
			note: progress.note,
			createdAt: progress.createdAt
		})),
		coopPartners: (bundle.coopPartnersByBacklog.get(entry.id) ?? []).map(
			partner => partner.username
		),
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt
	}));
}

function queueSection(bundle: PersonalDataBundle) {
	return bundle.queue.map(entry => ({
		position: entry.position,
		backlogId: entry.backlogId,
		game: gameReference(entry.Backlog?.Game),
		createdAt: entry.createdAt
	}));
}

function gameShelfSection(bundle: PersonalDataBundle) {
	return bundle.gameShelf.map(entry => ({
		id: entry.id,
		game: gameReference(entry.Game),
		platform: platformName(entry.Platform),
		isPublic: entry.isPublic,
		acquiredAt: entry.acquiredAt ?? null,
		edition: entry.edition ?? null,
		notes: entry.notes ?? null,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt
	}));
}

function wishlistSection(bundle: PersonalDataBundle) {
	return bundle.wishlist.map(entry => ({
		position: entry.position,
		game: gameReference(entry.Game),
		platform: platformName(entry.Platform),
		createdAt: entry.createdAt
	}));
}

function favoritesSection(bundle: PersonalDataBundle) {
	return bundle.favorites.map(entry => ({
		position: entry.position,
		game: gameReference(entry.Game),
		createdAt: entry.createdAt
	}));
}

function ownListEntry(list: List) {
	return {
		id: list.id,
		name: list.name,
		description: list.description ?? null,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		items: (list.ListItems ?? []).map(item => ({
			position: item.position,
			game: gameReference(item.Game),
			score: item.score ?? null,
			duration: item.duration ?? null
		})),
		createdAt: list.createdAt,
		updatedAt: list.updatedAt
	};
}

function followedListsSection(bundle: PersonalDataBundle) {
	return bundle.followedLists.map(follow => ({
		listId: follow.listId,
		name: follow.List?.name ?? null,
		owner: follow.List?.User?.username ?? null,
		isVisible: follow.isVisible,
		followedAt: follow.createdAt
	}));
}

function savedViewsSection(bundle: PersonalDataBundle) {
	return bundle.savedFilters.map(view => ({
		id: view.id,
		name: view.name,
		description: view.description ?? null,
		filters: view.filters,
		sortBy: view.sortBy ?? null,
		sortOrder: view.sortOrder,
		showInBacklog: view.showInBacklog,
		isDefault: view.isDefault,
		enabledStats: view.enabledStats,
		position: view.position,
		icon: view.icon,
		color: view.color,
		createdAt: view.createdAt,
		updatedAt: view.updatedAt
	}));
}

function reviewsSection(bundle: PersonalDataBundle) {
	return bundle.reviews.map(review => ({
		id: review.id,
		game: gameReference(review.Game),
		content: review.content,
		rating: review.rating,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt
	}));
}

function socialSection(bundle: PersonalDataBundle) {
	const userId = bundle.user.id;
	return {
		followers: bundle.followers.map(follow => ({
			username: follow.Follower?.username ?? null,
			since: follow.createdAt
		})),
		following: bundle.following.map(follow => ({
			username: follow.Following?.username ?? null,
			since: follow.createdAt
		})),
		followRequests: bundle.followRequests.map(request => {
			const isOutgoing = request.requesterId === userId;
			const counterpart = isOutgoing ? request.Target : request.Requester;
			return {
				direction: isOutgoing ? "sent" : "received",
				username: counterpart?.username ?? null,
				createdAt: request.createdAt
			};
		})
	};
}

function activityEntry(activity: Activity) {
	return {
		id: activity.id,
		type: activity.type,
		game: gameReference(activity.ActivityGame?.Game),
		list: activity.ActivityList?.List
			? {
					id: activity.ActivityList.List.id,
					name: activity.ActivityList.List.name
				}
			: null,
		targetUsername: activity.ActivityUser?.TargetUser?.username ?? null,
		metadata: activity.metadata,
		createdAt: activity.createdAt
	};
}

function moodTagsSection(bundle: PersonalDataBundle) {
	const gameById = new Map(bundle.taggedGames.map(game => [game.id, game]));
	return {
		tags: bundle.tagMetas.map(meta => ({
			tag: meta.tag,
			description: meta.description,
			createdAt: meta.createdAt
		})),
		gameTags: bundle.gameTags.map(gameTag => ({
			tag: gameTag.tag,
			game: gameReference(gameById.get(gameTag.gameId)),
			createdAt: gameTag.createdAt
		}))
	};
}

function trackedFranchisesSection(bundle: PersonalDataBundle) {
	return bundle.trackedFranchises.map(tracked => ({
		franchise: tracked.Franchise
			? {
					id: tracked.Franchise.id,
					name: tracked.Franchise.name,
					slug: tracked.Franchise.code
				}
			: null,
		trackedAt: tracked.createdAt
	}));
}

function platinumsSection(bundle: PersonalDataBundle) {
	return bundle.platinums.map(platinum => ({
		id: platinum.id,
		game: gameReference(platinum.Game),
		platform: platformName(platinum.Platform),
		backlogId: platinum.backlogId,
		platinumedAt: platinum.platinumedAt,
		notes: platinum.notes,
		createdAt: platinum.createdAt,
		updatedAt: platinum.updatedAt
	}));
}

function rewindEntry(rewind: Rewind) {
	return {
		id: rewind.id,
		year: rewind.year,
		language: rewind.language,
		includesPrivateRuns: rewind.includesPrivateRuns,
		includesNotes: rewind.includesNotes,
		generatedAt: rewind.generatedAt,
		regenerationsUsed: rewind.regenerationsUsed,
		aiRecapStatus: rewind.aiRecapStatus,
		aiRecap: rewind.aiRecap,
		premiumStats: rewind.premiumStats,
		premiumAccessKind: rewind.premiumAccessKind,
		createdAt: rewind.createdAt,
		updatedAt: rewind.updatedAt
	};
}

function sessionEntry(session: RefreshToken) {
	return {
		deviceInfo: session.deviceInfo,
		createdAt: session.createdAt,
		lastUsedAt: session.lastUsedAt,
		expiresAt: session.expiresAt
	};
}

function gameReportsSection(bundle: PersonalDataBundle) {
	return bundle.gameReports.map(report => ({
		id: report.id,
		game: gameReference(report.Game),
		category: report.category,
		message: report.message,
		status: report.status,
		createdAt: report.createdAt,
		updatedAt: report.updatedAt
	}));
}

export function personalDataExportSerializer(
	bundle: PersonalDataBundle,
	generatedAt: Date
) {
	return {
		meta: exportMeta(generatedAt),
		account: accountSection(bundle.user),
		privacySettings: privacySection(bundle.user),
		premium: {
			status: bundle.premiumStatus,
			grants: bundle.premiumGrants.map(premiumGrantEntry)
		},
		backlog: backlogSection(bundle),
		queue: queueSection(bundle),
		gameShelf: gameShelfSection(bundle),
		wishlist: wishlistSection(bundle),
		favorites: favoritesSection(bundle),
		lists: bundle.ownLists.map(ownListEntry),
		followedLists: followedListsSection(bundle),
		savedViews: savedViewsSection(bundle),
		reviews: reviewsSection(bundle),
		social: socialSection(bundle),
		activity: bundle.activities.map(activityEntry),
		moodTags: moodTagsSection(bundle),
		trackedFranchises: trackedFranchisesSection(bundle),
		platinums: platinumsSection(bundle),
		rewinds: bundle.rewinds.map(rewindEntry),
		sessions: bundle.sessions.map(sessionEntry),
		gameReports: gameReportsSection(bundle),
		dataRequests: bundle.dataRequests.map(request =>
			dataRequestSerializer(request, generatedAt)
		)
	};
}
