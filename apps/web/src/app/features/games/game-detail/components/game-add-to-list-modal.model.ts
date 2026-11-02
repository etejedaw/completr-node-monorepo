export interface MyList {
	id: string;
	name: string;
	isPublic: boolean;
	contains: boolean;
}

export interface FeaturedList {
	id: string;
	name: string;
	description?: string;
	isOfficial: boolean;
	completed: boolean;
	owner: { username: string } | null;
}

export interface ListsChanged {
	lists: FeaturedList[];
	myLists: MyList[];
}

export interface GameAddToListModalData {
	gameId: string;
	gameTitle: string;
	myLists: MyList[];
	onListsChanged: (data: ListsChanged) => void;
}

export interface ModalState {
	selection: Map<string, boolean>;
	newListName: string;
	creatingNew: boolean;
	saving: boolean;
	error: string;
}
