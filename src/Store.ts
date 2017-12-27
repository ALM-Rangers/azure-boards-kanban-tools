import * as VSSStore from "VSS/Flux/Store";
import * as CoreContracts from "TFS/Core/Contracts";

import { State, IKanbanAction, IBoardSettings } from "./Models";
import { ActionsHub } from "./ActionsHub";
import * as Constants from "./Constants";

export class Store extends VSSStore.Store {
    private state = {} as State;

    constructor(actionsHub: ActionsHub) {
        super();

        this.state = {
            DialogTitle: Constants.DefaultDialogTitle,
            action: IKanbanAction.CopySettingsFromTeam,
            ValidationFailed: false,

            CopyKanbanAvailableTeams: null,
            CopyKanbanCurrentTeam: null,
            CopyKanbanSecondaryTeam: null,
            CopyKanbanCurrentTeamContext: null,
            CopyKanbanSecondaryTeamContext: null,
            CopyKanbanCurrentTeamSettings: null,
            CopyKanbanSecondaryTeamSettings: null,
            CopyKanbanCommonBacklogLevels: null,
            CopyKanbanSelectedBacklogLevels: null,
            LoadingTeamState: false
        };

        actionsHub.setKanbanActionType.addListener(this._setKanbanActionType.bind(this));
        actionsHub.initializeKanbanTeams.addListener(this._initializeKanbanTeams.bind(this));
        actionsHub.setCurrentTeam.addListener(this._setCurrentTeam.bind(this));
        actionsHub.setSecondaryTeam.addListener(this._setSecondaryTeam.bind(this));
        actionsHub.setCurrentTeamContext.addListener(this._setCurrentTeamContext.bind(this));
        actionsHub.setSecondaryTeamContext.addListener(this._setSecondaryTeamContext.bind(this));
        actionsHub.setCurrentTeamSettings.addListener(this._setCurrentTeamSettings.bind(this));
        actionsHub.setSecondaryTeamSettings.addListener(this._setSecondaryTeamSettings.bind(this));
        actionsHub.setCommonBacklogLevels.addListener(this._setCommonBacklogLevels.bind(this));
        actionsHub.setLoadingTeamState.addListener(this._setLoadingTeamState.bind(this));
        actionsHub.setSelectedBacklogLevels.addListener(this._setSelectedBacklogLevels.bind(this));
    }

    public getState(): State {
        return this.state;
    }

    private _setKanbanActionType(action: IKanbanAction) {
        this.state.ValidationFailed = false;
        this.state.action = action;

        if (action === IKanbanAction.CopySettingsFromTeam) {

        } else if (action === IKanbanAction.CopySettingsToTeam) {

        }

        this.emitChanged();
    }

    private _initializeKanbanTeams(teams: CoreContracts.WebApiTeam[]) {
        this.state.CopyKanbanAvailableTeams = teams;
        this.emitChanged();
    }

    private _setCurrentTeam(team: CoreContracts.WebApiTeam) {
        this.state.CopyKanbanCurrentTeam = team;
    }

    private _setSecondaryTeam(team: CoreContracts.WebApiTeam) {
        this.state.CopyKanbanSecondaryTeam = team;
    }

    private _setCurrentTeamContext(context: CoreContracts.TeamContext) {
        this.state.CopyKanbanCurrentTeamContext = context;
    }

    private _setSecondaryTeamContext(context: CoreContracts.TeamContext) {
        this.state.CopyKanbanSecondaryTeamContext = context;
    }

    private _setCurrentTeamSettings(settings: IBoardSettings) {
        this.state.CopyKanbanCurrentTeamSettings = settings;
    }

    private _setSecondaryTeamSettings(settings: IBoardSettings) {
        this.state.CopyKanbanSecondaryTeamSettings = settings;
    }

    private _setCommonBacklogLevels(levels: string[]) {
        this.state.CopyKanbanCommonBacklogLevels = levels;
        this.emitChanged();
    }

    private _setLoadingTeamState(state: boolean) {
        this.state.LoadingTeamState = state;
        this.emitChanged();
    }

    private _setSelectedBacklogLevels(levels: string[]) {
        this.state.CopyKanbanSelectedBacklogLevels = levels;
        this.emitChanged();
    }
}