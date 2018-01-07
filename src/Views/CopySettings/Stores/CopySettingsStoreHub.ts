import { CopySettingsStore } from "src/Views/CopySettings/Stores/CopySettingsStore";
import { CopySettingsState } from "src/Views/CopySettings/Models/CopySettingsInterfaces";
import { CopySettingsActionsHub } from "src/Views/CopySettings/Actions/CopySettingsActions";

export interface CopyState {
    copySettingsState: CopySettingsState;
}

export class CopySettingsStoreHub implements IDisposable {
    public copySettingsStore: CopySettingsStore;

    constructor(
        private _copySettingsActionsHub: CopySettingsActionsHub
    ) {
        this.copySettingsStore = this._createCopySettingsStore();
    }

    private _createCopySettingsStore(): CopySettingsStore {
        const store = new CopySettingsStore();
        this._copySettingsActionsHub.setTeamsLoading.addListener(store.onSetTeamsLoading);
        this._copySettingsActionsHub.setBacklogsLoading.addListener(store.onSetBacklogsLoading);
        this._copySettingsActionsHub.setAvailableTeams.addListener(store.onSetAvailableTeams);
        this._copySettingsActionsHub.setAvailableBacklogLevels.addListener(store.onSetAvailableBacklogLevels);
        this._copySettingsActionsHub.setSelectedBacklogLevels.addListener(store.onSetSelectedBacklogLevels);
        this._copySettingsActionsHub.setCanDoAdvancedMapping.addListener(store.onSetCanDoAdvancedMapping);
        this._copySettingsActionsHub.setShowAdvancedMapping.addListener(store.onSetShowAdvancedMapping);
        return store;
    }

    private _disposeCopySettingsStore() {
        if (this.copySettingsStore) {
            this._copySettingsActionsHub.setTeamsLoading.removeListener(this.copySettingsStore.onSetTeamsLoading);
            this._copySettingsActionsHub.setBacklogsLoading.removeListener(this.copySettingsStore.onSetBacklogsLoading);
            this._copySettingsActionsHub.setAvailableTeams.removeListener(this.copySettingsStore.onSetAvailableTeams);
            this._copySettingsActionsHub.setAvailableBacklogLevels.removeListener(this.copySettingsStore.onSetAvailableBacklogLevels);
            this._copySettingsActionsHub.setSelectedBacklogLevels.removeListener(this.copySettingsStore.onSetSelectedBacklogLevels);
            this._copySettingsActionsHub.setCanDoAdvancedMapping.removeListener(this.copySettingsStore.onSetCanDoAdvancedMapping);
            this._copySettingsActionsHub.setShowAdvancedMapping.removeListener(this.copySettingsStore.onSetShowAdvancedMapping);
        }
    }

    public get state(): CopyState {
        return {
            copySettingsState: this.copySettingsStore.state
        };
    }

    public getCopyState = (): CopyState => {
        return this.state;
    }

    public dispose() {
        this._disposeCopySettingsStore();
    }
}