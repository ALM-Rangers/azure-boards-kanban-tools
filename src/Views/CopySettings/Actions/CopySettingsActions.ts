import { Action } from "VSS/Flux/Action";
import * as CoreContracts from "TFS/Core/Contracts";
import { IBoardSettings } from "src/Views/CopySettings/Models/CopySettingsInterfaces";

export class CopySettingsActionsHub {
    public setTeamsLoading = new Action<boolean>();
    public setBacklogsLoading = new Action<boolean>();
    public setAvailableTeams = new Action<CoreContracts.WebApiTeam[]>();
    public setAvailableBacklogLevels = new Action<string[]>();
    public setSelectedBacklogLevels = new Action<string[]>();
    public setCanDoAdvancedMapping = new Action<boolean>();
    public setShowAdvancedMapping = new Action<boolean>();
}