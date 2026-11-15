import { computed, inject, signal } from "@angular/core";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { type UiPickerAction } from "../../../shared/ui";
import { reportHttpFailure } from "../../../shared/utils/http-failure";
import { CoopRunsService, type SyncField } from "../../coop-runs/coop-runs";
import {
	type CoopCandidate,
	type CoopMember
} from "../../coop-runs/coop-runs.model";
import {
	PublicSocialService,
	type PublicSocialUser
} from "../../public-profile/services/public-social.service";
import { type CoopRunOptions } from "./inject-coop-run.model";

const MIN_CANDIDATES_TO_PICK = 2;

const allSyncFieldsSelected = (): Record<SyncField, boolean> => ({
	status: true,
	startedAt: true,
	finishedAt: true,
	realDuration: true
});

export function injectCoopRun(options: CoopRunOptions) {
	const coopService = inject(CoopRunsService);
	const publicSocial = inject(PublicSocialService);
	const authService = inject(AuthService);
	const toast = inject(ToastService);

	const members = signal<CoopMember[]>([]);
	const following = signal<PublicSocialUser[]>([]);
	const adding = signal(false);
	const removingId = signal<string | null>(null);
	const syncMember = signal<CoopMember | null>(null);
	const syncFields = signal(allSyncFieldsSelected());
	const syncing = signal(false);
	const pickerCandidates = signal<CoopCandidate[]>([]);
	const pickerUserId = signal<string | null>(null);
	const pickerUserName = signal("");

	const friendActions = computed<UiPickerAction[]>(() => {
		const taken = new Set(members().map(member => member.userId));
		return following()
			.filter(friend => !taken.has(friend.id))
			.map(friend => ({
				id: friend.id,
				label:
					friend.name && friend.name !== friend.username
						? `${friend.name} (@${friend.username})`
						: `@${friend.username}`,
				icon: "person_add"
			}));
	});

	const refreshMembers = () => {
		const entryId = options.entryId();
		if (!entryId) return;
		coopService.getMembers(entryId).subscribe({
			next: list => members.set(list),
			error: (error: unknown) =>
				reportHttpFailure(
					toast,
					error,
					"Couldn't load the co-op members."
				)
		});
	};

	const load = () => {
		refreshMembers();
		const username = authService.user()?.username;
		if (!username) return;
		publicSocial.getAllFollowing(username).subscribe({
			next: users => following.set(users),
			error: (error: unknown) =>
				reportHttpFailure(toast, error, "Couldn't load who you follow.")
		});
	};

	const commitAdd = (userId: string, targetBacklogId?: string) => {
		const entryId = options.entryId();
		if (!entryId) return;
		adding.set(true);
		coopService.addMember(entryId, userId, targetBacklogId).subscribe({
			next: () => {
				adding.set(false);
				refreshMembers();
			},
			error: (error: unknown) => {
				adding.set(false);
				reportHttpFailure(toast, error, "Couldn't add this player.");
			}
		});
	};

	const addMember = (userId: string) => {
		const entryId = options.entryId();
		if (!entryId || !userId || adding()) return;
		adding.set(true);
		coopService.getCandidates(entryId, userId).subscribe({
			next: res => {
				if (
					res.accessible &&
					res.candidates.length >= MIN_CANDIDATES_TO_PICK
				) {
					pickerCandidates.set(res.candidates);
					pickerUserId.set(userId);
					const friend = following().find(
						candidate => candidate.id === userId
					);
					pickerUserName.set(friend?.name || friend?.username || "");
					adding.set(false);
					return;
				}
				commitAdd(userId);
			},
			error: (error: unknown) => {
				adding.set(false);
				reportHttpFailure(toast, error, "Couldn't add this player.");
			}
		});
	};

	const cancelPicker = () => {
		pickerCandidates.set([]);
		pickerUserId.set(null);
	};

	const chooseCandidate = (targetBacklogId: string | null) => {
		const userId = pickerUserId();
		if (!userId) return;
		cancelPicker();
		commitAdd(userId, targetBacklogId ?? undefined);
	};

	const removeMember = (member: CoopMember) => {
		const entryId = options.entryId();
		if (!entryId || removingId()) return;
		removingId.set(member.userId);
		coopService.removeMember(entryId, member.userId).subscribe({
			next: () => {
				removingId.set(null);
				refreshMembers();
			},
			error: (error: unknown) => {
				removingId.set(null);
				reportHttpFailure(toast, error, "Couldn't remove this player.");
			}
		});
	};

	const openSyncDialog = (member: CoopMember) => {
		syncMember.set(member);
		syncFields.set(allSyncFieldsSelected());
	};

	const closeSyncDialog = () => syncMember.set(null);

	const toggleSyncField = (field: SyncField) =>
		syncFields.update(current => ({
			...current,
			[field]: !current[field]
		}));

	const hasAnySyncFieldSelected = () => {
		const fields = syncFields();
		return (
			fields.status ||
			fields.startedAt ||
			fields.finishedAt ||
			fields.realDuration
		);
	};

	const commitSync = () => {
		const entryId = options.entryId();
		const member = syncMember();
		if (!entryId || !member || syncing()) return;
		const selected = (Object.keys(syncFields()) as SyncField[]).filter(
			field => syncFields()[field]
		);
		if (selected.length === 0) return;
		syncing.set(true);
		coopService.sync(entryId, member.backlogId, selected).subscribe({
			next: () => {
				syncing.set(false);
				syncMember.set(null);
				options.onSynced();
			},
			error: (error: unknown) => {
				syncing.set(false);
				reportHttpFailure(toast, error, "Couldn't sync this run.");
			}
		});
	};

	return {
		members,
		following,
		adding,
		removingId,
		syncMember,
		syncFields,
		syncing,
		pickerCandidates,
		pickerUserId,
		pickerUserName,
		friendActions,
		load,
		addMember,
		chooseCandidate,
		cancelPicker,
		removeMember,
		openSyncDialog,
		closeSyncDialog,
		toggleSyncField,
		hasAnySyncFieldSelected,
		commitSync
	};
}
