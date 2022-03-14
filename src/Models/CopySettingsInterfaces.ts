// import * as CoreContracts from "TFS/Core/Contracts";

import { WebApiTeam, TeamContext } from "azure-devops-extension-api/Core";
import {
  BoardCardSettings,
  BoardCardRuleSettings,
  BoardColumn,
  BoardRow,
  BoardFields,
  BugsBehavior,
} from "azure-devops-extension-api/Work";

export interface CopySettingsState {
  teamsLoading: boolean;
  backlogsLoading: boolean;
  availableTeams: WebApiTeam[];
  commonBacklogLevels: string[];
  selectedBacklogLevels: string[];
  canToggleMappings: boolean;
  showAdvancedMappings: boolean;
  currentMappings: IBoardColumnDifferences[];
  settingsToCopy: string[];
}

export interface IBacklogBoardSettings {
  boardName: string;
  boardWorkItemTypes: string[];
  cardSettings: BoardCardSettings;
  cardRules: BoardCardRuleSettings;
  columns: BoardColumn[];
  rows: BoardRow[];
  boardId: string;
  fields: BoardFields;
}

export interface ITeamSettings {
  bugsBehavior: BugsBehavior;
}

export interface IBoardSettings {
  version: string;
  name: string;
  teamName: string;
  context: TeamContext;
  backlogSettings: IBacklogBoardSettings[];
  teamSettings: ITeamSettings;
}

export interface IColumnMapping {
  sourceColumn: BoardColumn;
  potentialMatches: BoardColumn[];
  targetColumn?: BoardColumn;
}

export interface IBoardColumnDifferences {
  backlog: string;
  mappings: IColumnMapping[];
}
