import { type PublicList } from "../services/public-lists.model";
import { type ProfileListsTab } from "../user-lists/user-lists-tab";

export interface ListGroup {
	tab: ProfileListsTab;
	title: string;
	items: PublicList[];
	total: number;
}
