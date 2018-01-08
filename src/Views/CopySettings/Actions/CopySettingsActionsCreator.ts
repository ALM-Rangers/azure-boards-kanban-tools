import { CopySettingsActionsHub } from "src/Views/CopySettings/Actions/CopySettingsActions";
import { ServicesClient } from "src/Shared/ServicesClient";
import { CopyState } from "src/Views/CopySettings/Stores/CopySettingsStoreHub";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";

export class CopySettingsActionsCreator {
    constructor(
        private _copySettingsActionsHub: CopySettingsActionsHub,
        private _client: ServicesClient,
        private _getState: () => CopyState
    ) { }

    public loadTeams() {
        this._copySettingsActionsHub.setTeamsLoading.invoke(true);
        this._client.loadCurrentTeam().then(() => {
            return this._client.getTeamsAsync(true);
        }).then(teams => {
            this._copySettingsActionsHub.setAvailableTeams.invoke(teams);
            this._copySettingsActionsHub.setTeamsLoading.invoke(false);
        });
    }

    public selectTeam(teamName: string) {
        this._copySettingsActionsHub.setBacklogsLoading.invoke(true);
        this._client.loadSelectedTeam(teamName).then(() => {
            let commonLevels = this._client.commonBackgroundLevels;
            let mappings = this._client.currentMappings;
            this._copySettingsActionsHub.setAvailableBacklogLevels.invoke(commonLevels);
            this._copySettingsActionsHub.setSelectedBacklogLevels.invoke(this._copyArray(commonLevels));
            this._copySettingsActionsHub.setCurrentMappings.invoke(mappings);
            this._copySettingsActionsHub.setCanDoAdvancedMapping.invoke(this._canEnableAdvancedMapping());
            this._copySettingsActionsHub.setBacklogsLoading.invoke(false);
        });
    }

    public selectBacklogLevel(backlogLevel: string, isSelected: boolean) {
        let currentLevels = this._getState().copySettingsState.selectedBacklogLevels;
        if (isSelected) {
            currentLevels.push(backlogLevel);
            this._copySettingsActionsHub.setSelectedBacklogLevels.invoke(currentLevels);
        } else {
            const currentIndex = currentLevels.indexOf(backlogLevel);
            if (currentIndex > -1) {
                currentLevels.splice(currentIndex, 1);
            }
            this._copySettingsActionsHub.setSelectedBacklogLevels.invoke(currentLevels);
        }
        this._copySettingsActionsHub.setCanDoAdvancedMapping.invoke(this._canEnableAdvancedMapping());
    }

    public enabledAdvancedMappings(enabled: boolean) {
        this._copySettingsActionsHub.setCanDoAdvancedMapping.invoke(this._canEnableAdvancedMapping() && !enabled);
        this._copySettingsActionsHub.setShowAdvancedMapping.invoke(enabled);
    }

    public updateViewState(viewState: ViewState) {
        if (this._client.setViewState(viewState)) {

        }
    }

    private _canEnableAdvancedMapping(): boolean {
        let state = this._getState();
        return state.copySettingsState.selectedBacklogLevels.length > 0;
    }

    private _copyArray(array: any[]): any[] {
        let newArray: any[] = [];
        for (let i = 0; i < array.length; i++) {
            newArray[i] = array[i];
        }
        return newArray;
    }
}