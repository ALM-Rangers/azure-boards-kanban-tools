import { CopySettingsActionsHub } from "src/Views/CopySettings/Actions/CopySettingsActions";
import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { ServicesClient } from "src/Shared/ServicesClient";
import { CopyState } from "src/Views/CopySettings/Stores/CopySettingsStoreHub";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";

export class CopySettingsActionsCreator {
    constructor(
        private _copySettingsActionsHub: CopySettingsActionsHub,
        private _dialogActionsCreator: DialogActionsCreator,
        private _client: ServicesClient,
        private _getState: () => CopyState
    ) { }

    public loadTeams() {
        this._copySettingsActionsHub.setTeamsLoading.invoke(true);
        this._validateUI();
        this._client.loadCurrentTeam().then(() => {
            return this._client.getTeamsAsync(true);
        }).then(teams => {
            this._copySettingsActionsHub.setAvailableTeams.invoke(teams);
            this._copySettingsActionsHub.setTeamsLoading.invoke(false);
            this._validateUI();
        });
    }

    public selectTeam(teamName: string) {
        this._copySettingsActionsHub.setBacklogsLoading.invoke(true);
        this._validateUI();
        this._client.loadSelectedTeam(teamName).then(() => {
            let commonLevels = this._client.commonBackgroundLevels;
            let mappings = this._client.currentMappings;
            this._copySettingsActionsHub.setAvailableBacklogLevels.invoke(commonLevels);
            let defaultBoardLevel = [];
            defaultBoardLevel.push(this._client.currentBacklogLevel);
            this._copySettingsActionsHub.setSelectedBacklogLevels.invoke(defaultBoardLevel);
            this._copySettingsActionsHub.setCurrentMappings.invoke(mappings);
            this._copySettingsActionsHub.setCanDoAdvancedMapping.invoke(this._canEnableAdvancedMapping());
            this._copySettingsActionsHub.setBacklogsLoading.invoke(false);
            this._validateUI();
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
        this._validateUI();
    }

    public enabledAdvancedMappings(enabled: boolean) {
        this._copySettingsActionsHub.setCanDoAdvancedMapping.invoke(this._canEnableAdvancedMapping() && !enabled);
        this._copySettingsActionsHub.setShowAdvancedMapping.invoke(enabled);
        this._validateUI();
    }

    public updateStateMapping(selectedColumnId: string, columnId: string) {
        let currentMapping = this._getState().copySettingsState.currentMappings;
        let found = false;
        for (let backlogIndex = 0; backlogIndex < currentMapping.length; backlogIndex++) {
            let backlog = currentMapping[backlogIndex];
            for (let mappingIndex = 0; mappingIndex < backlog.mappings.length; mappingIndex++) {
                let mapping = backlog.mappings[mappingIndex];
                if (mapping.targetColumn && mapping.targetColumn.id === columnId) {
                    const newMapping = mapping.potentialMatches.filter(m => m.id === selectedColumnId)[0];
                    mapping.sourceColumn = newMapping;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        this._copySettingsActionsHub.setCurrentMappings.invoke(currentMapping);
        this._validateUI();
    }

    public updateViewState(viewState: ViewState) {
        if (this._client.setViewState(viewState)) {
            this._copySettingsActionsHub.setCurrentMappings.invoke(this._client.currentMappings);
            this._validateUI();
        }
    }

    public copySettings() {
        const levels = this._getState().copySettingsState.selectedBacklogLevels;
        this._dialogActionsCreator.setCurrentView(ViewState.IsPerformingAction.toString());
        this._client.applyTeamSettingsAsync(levels).then(result => {
            this._dialogActionsCreator.setCurrentView(ViewState.ActionComplete.toString());
        });
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

    private _validateUI() {
        const state = this._getState();
        let isValid = false;
        if (!state.copySettingsState.backlogsLoading &&
            !state.copySettingsState.teamsLoading &&
            !state.copySettingsState.showAdvancedMappings &&
            state.copySettingsState.selectedBacklogLevels &&
            state.copySettingsState.selectedBacklogLevels.length >= 1
        ) {
            isValid = true;
        }
        this._dialogActionsCreator.setDialogIsValid(isValid);
    }
}