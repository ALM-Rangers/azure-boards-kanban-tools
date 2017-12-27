import * as CoreContracts from "TFS/Core/Contracts";

import { ActionsHub } from "./ActionsHub";
import { State, IKanbanAction } from "./Models";
import * as ServicesClient from "./ServicesClient";
import { CommonActions } from "VSS/Events/Action";

export class ActionsCreator {
    constructor(
        private actionsHub: ActionsHub,
        private getState: () => State
    ) {
    }

    public kanbanActionChanged(action: IKanbanAction) {
        this.actionsHub.setKanbanActionType.invoke(action);
    }

    public initializeKanbanTeams() {
        ServicesClient.getTeam().then(currentTeam => {
            this.actionsHub.setCurrentTeam.invoke(currentTeam);
            return ServicesClient.getContextForTeamAsync(currentTeam.name);
        }).then(context => {
            this.actionsHub.setCurrentTeamContext.invoke(context);
            return ServicesClient.getTeamSettingsAsync(context);
        }).then(settings => {
            this.actionsHub.setCurrentTeamSettings.invoke(settings);
            return ServicesClient.getTeamsAsync(true);
        }).then(teams => {
            this.actionsHub.initializeKanbanTeams.invoke(teams);
        });
    }

    public selectTeam(teamId: string) {
        this.actionsHub.setLoadingTeamState.invoke(true);
        const currentState = this.getState();
        const selectedTeam = currentState.CopyKanbanAvailableTeams.filter(team => team.id === teamId)[0];
        this.actionsHub.setSecondaryTeam.invoke(selectedTeam);
        ServicesClient.getContextForTeamAsync(selectedTeam.name).then(context => {
            this.actionsHub.setSecondaryTeamContext.invoke(context);
            return ServicesClient.getTeamSettingsAsync(context);
        }).then(settings => {
            let commonLevels = ServicesClient.getCommonBacklogLevels(currentState.CopyKanbanCurrentTeamSettings, settings);
            this.actionsHub.setSecondaryTeamSettings.invoke(settings);
            this.actionsHub.setCommonBacklogLevels.invoke(commonLevels);
            this.actionsHub.setSelectedBacklogLevels.invoke(this.copyArray(commonLevels));
            this.actionsHub.setLoadingTeamState.invoke(false);
        });
    }

    public selectBacklogLevel(backlogLevel: string, isSelected: boolean) {
        let currentLevels = this.getState().CopyKanbanSelectedBacklogLevels;
        if (isSelected) {
            currentLevels.push(backlogLevel);
            this.actionsHub.setSelectedBacklogLevels.invoke(currentLevels);
        } else {
            const currentIndex = currentLevels.indexOf(backlogLevel);
            if (currentIndex > -1) {
                currentLevels.splice(currentIndex, 1);
            }
            this.actionsHub.setSelectedBacklogLevels.invoke(currentLevels);
        }
    }

    public copyArray(array: any[]): any[] {
        let newArray: any[] = [];
        for (let i = 0; i < array.length; i++) {
            newArray[i] = array[i];
        }
        return newArray;
    }
}