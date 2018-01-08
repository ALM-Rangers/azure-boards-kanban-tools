import * as CoreContracts from "TFS/Core/Contracts";
import * as WorkContracts from "TFS/Work/Contracts";

export interface CopySettingsState {
    teamsLoading: boolean;
    backlogsLoading: boolean;
    availableTeams: CoreContracts.WebApiTeam[];
    commonBacklogLevels: string[];
    selectedBacklogLevels: string[];
    canToggleMappings: boolean;
    showAdvancedMappings: boolean;
    currentMappings: IBoardColumnDifferences[];
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