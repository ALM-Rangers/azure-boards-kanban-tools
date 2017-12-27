import * as CoreContracts from "TFS/Core/Contracts";

import { Action } from "VSS/Flux/Action";
import * as Models from "./Models";

export class ActionsHub {
    public setKanbanActionType = new Action<Models.IKanbanAction>();
    public initializeKanbanTeams = new Action<CoreContracts.WebApiTeam[]>();
    public setCurrentTeam = new Action<CoreContracts.WebApiTeam>();
    public setSecondaryTeam = new Action<CoreContracts.WebApiTeam>();
    public setCurrentTeamContext = new Action<CoreContracts.TeamContext>();
    public setSecondaryTeamContext = new Action<CoreContracts.TeamContext>();
    public setCurrentTeamSettings = new Action<Models.IBoardSettings>();
    public setSecondaryTeamSettings = new Action<Models.IBoardSettings>();
    public setCommonBacklogLevels = new Action<string[]>();
    public setLoadingTeamState = new Action<boolean>();
    public setSelectedBacklogLevels = new Action<string[]>();
}