import * as CoreContracts from "TFS/Core/Contracts";
import * as WorkContracts from "TFS/Work/Contracts";

export enum IKanbanAction {
    CopySettingsToTeam,
    CopySettingsFromTeam
}

export enum KanbanSettings {
    None = 0,
    CardSettings = 1,
    CardRules = 1 << 1,
    Columns = 1 << 2,
    Swimlanes = 1 << 3
}

export interface State {
    DialogTitle: string;
    action: IKanbanAction;
    ValidationFailed: boolean;

    CopyKanbanAvailableTeams: CoreContracts.WebApiTeam[];
    CopyKanbanCurrentTeam: CoreContracts.WebApiTeam;
    CopyKanbanSecondaryTeam: CoreContracts.WebApiTeam;
    CopyKanbanCurrentTeamContext: CoreContracts.TeamContext;
    CopyKanbanSecondaryTeamContext: CoreContracts.TeamContext;
    CopyKanbanCurrentTeamSettings: IBoardSettings;
    CopyKanbanSecondaryTeamSettings: IBoardSettings;
    CopyKanbanCommonBacklogLevels: string[];
    CopyKanbanSelectedBacklogLevels: string[];
    LoadingTeamState: boolean;
}

export interface IBacklogBoardSettings {
    boardName: string;
    boardWorkItemTypes: string[];
    cardSettings: WorkContracts.BoardCardSettings;
    cardRules: WorkContracts.BoardCardRuleSettings;
    columns: WorkContracts.BoardColumn[];
    rows: WorkContracts.BoardRow[];
    fields: WorkContracts.BoardFields;
}

export interface IBoardSettings {
    version: string;
    name: string;
    teamName: string;
    context: CoreContracts.TeamContext;
    backlogSettings: IBacklogBoardSettings[];
}

export interface IColumnMapping {
    sourceColumn: WorkContracts.BoardColumn;
    potentialMatches: WorkContracts.BoardColumn[];
    targetColumn?: WorkContracts.BoardColumn;
}

export interface IBoardColumnDifferences {
    backlog: string;
    mappings: IColumnMapping[];
}